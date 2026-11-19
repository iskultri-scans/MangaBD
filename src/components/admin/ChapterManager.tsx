'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ExternalLink, BookOpen, Upload, Send, Layers, Loader2 } from 'lucide-react';
import {
  addChapter,
  deleteChapter,
  getChaptersByMangaId,
  type Chapter,
  type ChapterPage,
} from '@/lib/firestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { DeleteConfirm } from './DeleteConfirm';

interface ChapterManagerProps {
  mangaId: string;
  mangaTitle: string;
  mangaSlug?: string;
}

const UPLOAD_BATCH_SIZE = 10;
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export function ChapterManager({ mangaId, mangaTitle, mangaSlug }: ChapterManagerProps) {
  const { user } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChapterNumber, setNewChapterNumber] = useState('');
  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterLink, setNewChapterLink] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [notifyTelegram, setNotifyTelegram] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const fetchChapters = async () => {
    try {
      const data = await getChaptersByMangaId(mangaId);
      setChapters(data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChapters();
  }, [mangaId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const oversized = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      showToast(`"${oversized.name}" exceeds the 20MB Telegram CDN limit.`, 'error');
      return;
    }
    // Sort naturally by filename (e.g. 1.jpg, 2.jpg, 10.jpg)
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setSelectedFiles(files);
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
    try {
      const idToken = user ? await user.getIdToken() : null;
      const authHeaders: Record<string, string> = idToken
        ? { Authorization: `Bearer ${idToken}` }
        : {};

      const uploadedPages: ChapterPage[] = [];

      // 1. Upload selected images in batches to /api/telegram/upload
      if (selectedFiles.length > 0) {
        setUploadProgress({ current: 0, total: selectedFiles.length });

        for (let i = 0; i < selectedFiles.length; i += UPLOAD_BATCH_SIZE) {
          const batch = selectedFiles.slice(i, i + UPLOAD_BATCH_SIZE);
          const formData = new FormData();
          formData.append('startPage', String(i + 1));
          formData.append('caption', `${mangaTitle} — Ch. ${newChapterNumber}`);
          batch.forEach((file) => formData.append('files', file));

          const uploadRes = await fetch('/api/telegram/upload', {
            method: 'POST',
            headers: authHeaders,
            body: formData,
          });
          const uploadData = await uploadRes.json();

          if (!uploadRes.ok || !uploadData.ok) {
            throw new Error(uploadData.error || 'Failed to upload pages to Telegram CDN.');
          }

          for (const p of uploadData.pages as { pageNumber: number; fileId: string }[]) {
            uploadedPages.push({
              pageNumber: p.pageNumber,
              fileId: p.fileId,
            });
          }

          setUploadProgress({
            current: Math.min(i + batch.length, selectedFiles.length),
            total: selectedFiles.length,
          });
        }
      }

      const chapterNum = parseInt(newChapterNumber, 10);
      const chapterTitle = newChapterTitle.trim() || `Chapter ${chapterNum}`;

      // 2. Save chapter document to Firestore
      await addChapter(mangaId, {
        mangaId,
        title: chapterTitle,
        chapterNumber: chapterNum,
        readLink: newChapterLink.trim(),
        ...(uploadedPages.length > 0 ? { pages: uploadedPages } : {}),
        createdAt: chapters.length > 0 ? chapters[0].createdAt : (new Date() as unknown as Chapter['createdAt']),
      });

      // 3. Optionally trigger Telegram Broadcast
      if (notifyTelegram) {
        const chapterUrl = mangaSlug
          ? `${window.location.origin}/manga/${mangaSlug}`
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

      setNewChapterNumber('');
      setNewChapterTitle('');
      setNewChapterLink('');
      setSelectedFiles([]);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowAddForm(false);
      fetchChapters();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to add chapter', 'error');
    } finally {
      setAdding(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChapter(mangaId, deleteTarget.id);
      showToast('Chapter deleted!', 'success');
      setDeleteTarget(null);
      fetchChapters();
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen size={17} className="text-[var(--accent)]" />
          Chapters <span className="font-mono-num text-sm font-normal text-[var(--text-muted)]">({chapters.length})</span>
        </h3>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-accent flex items-center gap-1.5 text-xs py-2 px-3.5 cursor-pointer"
        >
          <Plus size={14} /> Add Chapter
        </button>
      </div>

      {/* Add Chapter Form */}
      {showAddForm && (
        <div className="p-4 rounded-xl mb-4 space-y-3.5 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Chapter Number *</label>
              <input
                type="number"
                value={newChapterNumber}
                onChange={(e) => setNewChapterNumber(e.target.value)}
                placeholder="1"
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
                placeholder="Chapter Title"
                className={inputClass}
              />
            </div>
          </div>

          {/* Multi-Image Telegram CDN Uploader */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
              <Upload size={12} className="text-[var(--accent)]" />
              Chapter Pages (Telegram CDN — max 20MB/image)
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
                {selectedFiles.length} {selectedFiles.length === 1 ? 'page' : 'pages'} selected (auto-sorted by filename)
              </p>
            )}
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium">
                  Uploading pages to Telegram CDN...
                </span>
                <span className="font-mono-num text-[var(--accent)] font-semibold">
                  {uploadProgress.current} / {uploadProgress.total} ({progressPct}%)
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

          {/* Notify Telegram Subscribers Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
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

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleAddChapter}
              disabled={adding}
              className="btn-accent text-xs py-2 px-4 inline-flex items-center gap-1.5 cursor-pointer"
            >
              {adding && <Loader2 size={13} className="animate-spin" />}
              {adding ? 'Publishing...' : 'Publish Chapter'}
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

      {/* Chapter List */}
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
                {chapter.readLink && (
                  <a
                    href={chapter.readLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
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
