'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ExternalLink, BookOpen, Upload, Send, Layers, Loader2, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import {
  addChapter,
  deleteChapter,
  getChaptersByMangaId,
  type Chapter,
  type ChapterPage,
} from '@/lib/firestore';
import {
  ATTEMPT_FETCH_TIMEOUT_MS,
  MAX_RETRIES,
  PAGE_STUCK_TIMEOUT_MS,
  UPLOAD_CONCURRENCY,
  preparePageImageForUpload,
  runPageUploadBatch,
  type PageFailureInfo,
  type PreparedPageImage,
} from '@/lib/chapter-upload';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { DeleteConfirm } from './DeleteConfirm';

interface ChapterManagerProps {
  mangaId: string;
  mangaTitle: string;
  mangaSlug?: string;
  defaultOpenAdd?: boolean;
}

export function ChapterManager({
  mangaId,
  mangaTitle,
  mangaSlug,
  defaultOpenAdd = false,
}: ChapterManagerProps) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(defaultOpenAdd);
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterLink, setNewChapterLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  // Resume map: pageNumber -> ChapterPage (persists across partial failures for seamless resume)
  const [uploadedPagesMap, setUploadedPagesMap] = useState<Record<number, ChapterPage>>({});
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [failedPages, setFailedPages] = useState<PageFailureInfo[]>([]);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const fetchChapters = useCallback(async (prefillNextNumber = false) => {
    setLoading(true);
    try {
      const data = await getChaptersByMangaId(mangaId);
      setChapters(data);
      if (prefillNextNumber) {
        const nextNum =
          data.length > 0 ? Math.max(...data.map((c) => Number(c.chapterNumber) || 0)) + 1 : 1;
        setNewChapterNumber(String(nextNum));
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  }, [mangaId]);

  useEffect(() => {
    setShowAddForm(defaultOpenAdd);
    setNewChapterNumber('');
    setNewChapterTitle('');
    setNewChapterLink('');
    setSelectedFiles([]);
    setUploadedPagesMap({});
    setFailedPages([]);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchChapters(defaultOpenAdd);
  }, [mangaId, defaultOpenAdd, fetchChapters]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setSelectedFiles(files);
    setUploadedPagesMap({});
    setFailedPages([]);
  };

  const handleAddChapter = async () => {
    if (!newChapterNumber) {
      showToast('Chapter number is required.', 'warning');
      return;
    }
    if (selectedFiles.length === 0 && !newChapterLink.trim()) {
      showToast('Upload chapter page images or provide an external read link.', 'warning');
      return;
    }

    setAdding(true);
    setFailedPages([]);
    try {
      const idToken = user ? await user.getIdToken() : null;
      if (!idToken) {
        throw new Error('Authentication required. Please sign in again.');
      }
      const authHeaders: Record<string, string> = {
        Authorization: `Bearer ${idToken}`,
      };

      const mergedMap: Record<number, ChapterPage> = { ...uploadedPagesMap };

      if (selectedFiles.length > 0) {
        // Queue only pages not yet uploaded (supports resume + partial-merge)
        const pendingTasks = selectedFiles
          .map((file, idx) => ({ file, pageNumber: idx + 1 }))
          .filter((item) => !mergedMap[item.pageNumber]);

        let completedCount = Object.keys(mergedMap).length;
        setUploadProgress({ current: completedCount, total: selectedFiles.length });

        const preparedCache = new Map<number, PreparedPageImage>();

        const batchResult = await runPageUploadBatch({
          tasks: pendingTasks,
          concurrency: UPLOAD_CONCURRENCY,
          maxRetries: MAX_RETRIES,
          pageTimeoutMs: PAGE_STUCK_TIMEOUT_MS,
          uploadSingleAttempt: async (task, pageSignal) => {
            let prepared = preparedCache.get(task.pageNumber);
            if (!prepared) {
              prepared = await preparePageImageForUpload(task.file, { watermarkEnabled });
              preparedCache.set(task.pageNumber, prepared);
            }

            const attemptController = new AbortController();
            const onPageAbort = () => attemptController.abort(pageSignal.reason);
            if (pageSignal.aborted) {
              attemptController.abort(pageSignal.reason);
            } else {
              pageSignal.addEventListener('abort', onPageAbort, { once: true });
            }
            const attemptTimer = setTimeout(
              () =>
                attemptController.abort(
                  new Error(
                    `Upload timed out after ${Math.round(ATTEMPT_FETCH_TIMEOUT_MS / 1000)}s`
                  )
                ),
              ATTEMPT_FETCH_TIMEOUT_MS
            );

            try {
              const formData = new FormData();
              formData.append('startPage', String(task.pageNumber));
              formData.append('caption', `${mangaTitle} — Ch. ${newChapterNumber}`);
              formData.append('file', prepared.file);

              const uploadRes = await fetch('/api/telegram/upload', {
                method: 'POST',
                headers: authHeaders,
                body: formData,
                signal: attemptController.signal,
              });
              const uploadData = await uploadRes.json();

              if (!uploadRes.ok || !uploadData.ok || !uploadData.pages?.[0]?.fileId) {
                throw new Error(uploadData.error || `Failed on page ${task.pageNumber}`);
              }

              return {
                pageNumber: task.pageNumber,
                fileId: uploadData.pages[0].fileId,
              };
            } finally {
              clearTimeout(attemptTimer);
              pageSignal.removeEventListener('abort', onPageAbort);
            }
          },
          onPageSuccess: (page) => {
            mergedMap[page.pageNumber] = page;
            completedCount += 1;
            setUploadedPagesMap({ ...mergedMap });
            setUploadProgress({ current: completedCount, total: selectedFiles.length });
          },
          onPageFailure: (failure) => {
            setFailedPages((prev) =>
              [...prev.filter((item) => item.pageNumber !== failure.pageNumber), failure].sort(
                (a, b) => a.pageNumber - b.pageNumber
              )
            );
          },
        });

        if (batchResult.failedPages.length > 0) {
          throw new Error(
            `${batchResult.failedPages.length} page(s) failed (${completedCount}/${selectedFiles.length} saved). Click Resume Upload to finish.`
          );
        }
      }

      const uploadedPages: ChapterPage[] = Object.values(mergedMap).sort(
        (a, b) => a.pageNumber - b.pageNumber
      );

      const chapterNum = parseInt(newChapterNumber, 10);
      const chapterTitle = newChapterTitle.trim() || `Chapter ${chapterNum}`;
      const internalReaderPath = mangaSlug
        ? `/read/${encodeURIComponent(mangaSlug)}/${chapterNum}`
        : `/manga/${mangaId}#chapter-${chapterNum}`;
      const effectiveReadLink =
        uploadedPages.length > 0
          ? newChapterLink.trim() || internalReaderPath
          : newChapterLink.trim() ||
            `${mangaSlug ? `/manga/${mangaSlug}` : `/manga/${mangaId}`}#chapter-${chapterNum}`;

      await addChapter(mangaId, {
        mangaId,
        title: chapterTitle,
        chapterNumber: chapterNum,
        readLink: effectiveReadLink,
        ...(uploadedPages.length > 0 ? { pages: uploadedPages } : {}),
      });

      if (notifyTelegram) {
        const chapterUrl = mangaSlug
          ? uploadedPages.length > 0
            ? `${window.location.origin}/read/${encodeURIComponent(mangaSlug)}/${chapterNum}`
            : `${window.location.origin}/manga/${mangaSlug}`
          : window.location.origin;

        const broadcastRes = await fetch('/api/telegram/broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            type: 'chapter',
            mangaId,
            title: `${mangaTitle} — ${chapterTitle}`,
            message: `Chapter ${chapterNum} is now live on MangaBD!${
              uploadedPages.length > 0 ? ` (${uploadedPages.length} pages ready to read)` : ''
            }`,
            url: chapterUrl,
            tag: 'New Chapter',
            buttonLabel: 'Read Chapter Now',
          }),
        });

        if (broadcastRes.ok) {
          const bData = await broadcastRes.json();
          showToast(
            `Chapter added! Telegram sent (Channel: ${bData.channelSent ? 'Yes' : 'No'}, DMs: ${bData.dmSent || 0}).`,
            'success'
          );
        } else {
          showToast('Chapter added, but Telegram broadcast failed.', 'warning');
        }
      } else {
        showToast('Chapter added!', 'success');
      }

      setNewChapterNumber(String(chapterNum + 1));
      setNewChapterTitle('');
      setNewChapterLink('');
      setSelectedFiles([]);
      setUploadedPagesMap({});
      setFailedPages([]);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (!defaultOpenAdd) setShowAddForm(false);
      fetchChapters(false);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add chapter', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChapter(mangaId, deleteTarget.id);
      showToast('Chapter deleted!', 'success');
      setDeleteTarget(null);
      fetchChapters(false);
    } catch {
      showToast('Failed to delete chapter', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  const progressPct =
    uploadProgress && uploadProgress.total > 0
      ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
      : 0;

  const hasPartialUpload =
    selectedFiles.length > 0 &&
    Object.keys(uploadedPagesMap).length > 0 &&
    Object.keys(uploadedPagesMap).length < selectedFiles.length;

  const suggestedNextChapter =
    chapters.length > 0 ? Math.max(...chapters.map((c) => Number(c.chapterNumber) || 0)) + 1 : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen size={17} className="text-[var(--accent)]" />
          Chapters <span className="font-mono-num text-sm font-normal text-[var(--text-muted)]">({chapters.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => {
            const nextOpen = !showAddForm;
            setShowAddForm(nextOpen);
            if (nextOpen && !newChapterNumber) {
              setNewChapterNumber(String(suggestedNextChapter));
            }
          }}
          className="btn-accent flex items-center gap-1.5 text-xs py-2 px-3.5 cursor-pointer"
        >
          <Plus size={14} /> {showAddForm ? 'Hide Form' : 'Add Chapter'}
        </button>
      </div>

      {showAddForm && (
        <div className="p-4 sm:p-5 rounded-xl mb-5 space-y-3.5 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-[var(--text-muted)]">Chapter Number *</label>
                {!newChapterNumber && (
                  <button
                    type="button"
                    onClick={() => setNewChapterNumber(String(suggestedNextChapter))}
                    className="text-[11px] font-mono-num text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    Suggest #{suggestedNextChapter}
                  </button>
                )}
              </div>
              <input
                type="number"
                value={newChapterNumber}
                onChange={(e) => setNewChapterNumber(e.target.value)}
                placeholder={String(suggestedNextChapter)}
                className={`${inputClass} font-mono-num`}
                min="1"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Chapter Title</label>
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter Title (optional)"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
              <Upload size={12} className="text-[var(--accent)]" />
              Chapter Pages (Telegram CDN — auto-compressed WebP/JPEG if &gt;3.5MB, 4MB server cap)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              disabled={adding}
              className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent-glow)] file:text-[var(--accent)] hover:file:bg-[var(--accent)] hover:file:text-white file:transition-colors file:cursor-pointer cursor-pointer rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] p-1.5"
            />
            {selectedFiles.length > 0 && (
              <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 font-mono-num">
                {selectedFiles.length} {selectedFiles.length === 1 ? 'page' : 'pages'} selected
                {Object.keys(uploadedPagesMap).length > 0 &&
                  ` · ${Object.keys(uploadedPagesMap).length} uploaded`}
              </p>
            )}
          </div>

          {uploadProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">
                  Uploading pages (concurrency {UPLOAD_CONCURRENCY}, retry {MAX_RETRIES})...
                </span>
                <span className="font-mono-num text-[var(--accent)] font-semibold">
                  {uploadProgress.current} / {uploadProgress.total} ({progressPct}%)
                  {failedPages.length > 0 ? ` · ${failedPages.length} failed` : ''}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-[var(--border-color)]">
                <div
                  className="h-full bg-[var(--accent)] transition-all duration-200"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {failedPages.length > 0 && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 space-y-1.5">
              <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={13} />
                {failedPages.length} page(s) failed (remaining pages continued):
              </p>
              <ul className="max-h-32 overflow-y-auto space-y-1 text-[11px] text-red-200/90 font-mono-num">
                {failedPages.map((fail) => (
                  <li key={fail.pageNumber} className="truncate">
                    Page {fail.pageNumber} ({fail.filename}): {fail.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">
              External Read Link {selectedFiles.length > 0 ? '(Optional fallback)' : '*'}
            </label>
            <input
              type="url"
              value={newChapterLink}
              onChange={(e) => setNewChapterLink(e.target.value)}
              placeholder="https://external-site.com/chapter/1"
              className={inputClass}
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={watermarkEnabled}
                onChange={(e) => setWatermarkEnabled(e.target.checked)}
                disabled={adding}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                <Shield size={12} className="text-[var(--accent)]" />
                Stamp subtle &ldquo;MangaBD&rdquo; watermark on uploaded pages
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyTelegram}
                onChange={(e) => setNotifyTelegram(e.target.checked)}
                disabled={adding}
                className="w-4 h-4 rounded accent-[var(--accent)]"
              />
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
                <Send size={12} className="text-[var(--accent)]" />
                Notify Telegram Subscribers (Main Channel + Bookmarked Users)
              </span>
            </label>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddChapter}
              disabled={adding}
              className="btn-accent text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {adding ? (
                <Loader2 size={13} className="animate-spin" />
              ) : hasPartialUpload ? (
                <RefreshCw size={13} />
              ) : null}
              {adding ? 'Publishing...' : hasPartialUpload ? 'Resume Upload' : 'Publish Chapter'}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              disabled={adding}
              className="px-4 py-2 rounded-lg text-xs border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-12 rounded-lg" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-muted)] text-sm rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          No chapters yet. Click &quot;Add Chapter&quot; to get started.
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] divide-y divide-[var(--border-color)]">
          {chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="font-mono-num flex-shrink-0 w-9 h-8 rounded-md flex items-center justify-center text-xs font-bold bg-[var(--accent-glow)] text-[var(--accent)]">
                  {chapter.chapterNumber}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate flex items-center gap-1.5">
                    {chapter.pages && chapter.pages.length > 0 ? (
                      <>
                        <Layers size={11} className="text-[var(--accent)] shrink-0" />
                        <span>{chapter.pages.length} Telegram CDN pages</span>
                      </>
                    ) : (
                      <span>{chapter.readLink}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                {chapter.pages && chapter.pages.length > 0 && mangaSlug ? (
                  <a
                    href={`/read/${encodeURIComponent(mangaSlug)}/${chapter.chapterNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
                    title="Open internal reader"
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : chapter.readLink ? (
                  <a
                    href={chapter.readLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={() => setDeleteTarget(chapter)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`Chapter ${deleteTarget?.chapterNumber}: ${deleteTarget?.title || ''}`}
        loading={deleting}
      />
    </div>
  );
}
