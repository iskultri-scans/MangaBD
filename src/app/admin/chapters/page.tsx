'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, Plus, Trash2, ExternalLink, X, FileText, Send } from 'lucide-react';
import {
  getAllManga,
  getChaptersByMangaId,
  addChapter,
  deleteChapter,
  addNotification,
  type Manga,
  type Chapter,
} from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DeleteConfirm } from '@/components/admin/DeleteConfirm';
import { getFirebaseAuth } from '@/lib/firebase';
import { SITE_CONFIG } from '@/lib/config';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';
import { Timestamp } from 'firebase/firestore';

export default function AdminChaptersPage() {
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Manga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterLink, setChapterLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [broadcastTelegram, setBroadcastTelegram] = useState(false);

  useEffect(() => {
    fetch('/api/telegram/notify')
      .then((res) => res.json())
      .then((data) => {
        if (data?.configured) {
          setTelegramConfigured(true);
          setBroadcastTelegram(true);
        }
      })
      .catch(() => {});
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<Chapter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const searchManga = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const allManga = await getAllManga();
      const lower = query.toLowerCase();
      const filtered = allManga.filter(
        (m) =>
          m.title.toLowerCase().includes(lower) ||
          (m.titleBn && m.titleBn.includes(query)) ||
          m.slug.toLowerCase().includes(lower)
      );
      setSearchResults(filtered.slice(0, 10));
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching manga:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchManga(searchQuery);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, searchManga]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchChapters = async (mangaId: string) => {
    setChaptersLoading(true);
    try {
      const data = await getChaptersByMangaId(mangaId);
      setChapters(data);
    } catch (error) {
      console.error('Error fetching chapters:', error);
      showToast('Failed to load chapters', 'error');
    } finally {
      setChaptersLoading(false);
    }
  };

  const handleSelectManga = async (manga: Manga) => {
    setSelectedManga(manga);
    setSearchQuery(manga.title);
    setShowDropdown(false);
    setChapterNumber('');
    setChapterTitle('');
    setChapterLink('');
    await fetchChapters(manga.id);
  };

  const handleClearSelection = () => {
    setSelectedManga(null);
    setSearchQuery('');
    setChapters([]);
    setChapterNumber('');
    setChapterTitle('');
    setChapterLink('');
  };

  const handleAddChapter = async () => {
    if (!selectedManga || !chapterNumber || !chapterLink) return;
    setAdding(true);
    try {
      await addChapter(selectedManga.id, {
        mangaId: selectedManga.id,
        title: chapterTitle || `Chapter ${chapterNumber}`,
        chapterNumber: parseInt(chapterNumber),
        readLink: chapterLink,
        createdAt: Timestamp.now(),
      });

      try {
        const title = selectedManga.title;
        await addNotification({
          title: `New Chapter: ${title} Ch.${chapterNumber}`,
          message: `Chapter ${chapterNumber} of ${title} is now available!`,
          type: 'new_chapter',
          mangaSlug: selectedManga.slug,
          createdAt: Timestamp.now(),
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      if (broadcastTelegram && telegramConfigured) {
        try {
          const idToken = await getFirebaseAuth().currentUser?.getIdToken();
          if (!idToken) {
            throw new Error('Authentication required for Telegram broadcast.');
          }
          const tgRes = await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              tag: 'NEW CHAPTER',
              title: `${selectedManga.title} — Chapter ${chapterNumber}`,
              message: chapterTitle
                ? `${chapterTitle}\nNow available on MangaBD!`
                : `Chapter ${chapterNumber} is now available on MangaBD!`,
              url: `${SITE_CONFIG.url}/manga/${selectedManga.slug}`,
              coverImage: selectedManga.coverImage,
              buttonLabel: 'Read Chapter on MangaBD',
            }),
          });
          if (!tgRes.ok) {
            showToast('Chapter added, but Telegram broadcast failed.', 'error');
          }
        } catch {
          showToast('Chapter added, but Telegram broadcast failed.', 'error');
        }
      }

      showToast(`Chapter ${chapterNumber} added!`, 'success');
      setChapterNumber('');
      setChapterTitle('');
      setChapterLink('');
      await fetchChapters(selectedManga.id);
    } catch (error) {
      console.error('Error adding chapter:', error);
      showToast('Failed to add chapter', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteChapter = async () => {
    if (!selectedManga || !deleteTarget) return;
    setDeleting(true);
    try {
      await deleteChapter(selectedManga.id, deleteTarget.id);
      showToast('Chapter deleted!', 'success');
      setDeleteTarget(null);
      await fetchChapters(selectedManga.id);
    } catch (error) {
      console.error('Error deleting chapter:', error);
      showToast('Failed to delete chapter', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  return (
    <div>
      <AdminHeader title="Post Chapter" subtitle="Index new external chapters and optionally broadcast to Telegram" />

      {/* Manga Search */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 sm:p-6 mb-6 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
      >
        <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Search size={17} className="text-[var(--accent)]" />
          Select Series
        </h3>

        <div className="relative" ref={searchRef}>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search manga by title..."
              className={`${inputClass} pl-10 pr-10`}
              disabled={!!selectedManga}
            />
            {selectedManga ? (
              <button
                onClick={handleClearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            ) : isSearching ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : null}
          </div>

          <AnimatePresence>
            {showDropdown && searchResults.length > 0 && !selectedManga && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50 max-h-64 overflow-y-auto border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl"
              >
                {searchResults.map((manga) => (
                  <button
                    key={manga.id}
                    onClick={() => handleSelectManga(manga)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors border-b last:border-0 border-[var(--border-color)]"
                  >
                    <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0 bg-[var(--bg-subtle)]">
                      <img
                        src={manga.coverImage || FALLBACK_COVER_ASSET.src}
                        alt={manga.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_COVER_ASSET.src;
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {manga.title}
                      </p>
                      {manga.titleBn && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {manga.titleBn}
                        </p>
                      )}
                      <p className="font-mono-num text-xs text-[var(--text-muted)]">
                        Ch. {manga.totalChapters} · {manga.language.toUpperCase()}
                      </p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {showDropdown && searchResults.length === 0 && searchQuery.trim() && !isSearching && !selectedManga && (
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl p-4 text-center z-50 border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl">
              <p className="text-sm text-[var(--text-muted)]">No manga found</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedManga && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex items-center gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <div className="w-14 flex-shrink-0 rounded-md overflow-hidden border border-[var(--border-color)]" style={{ aspectRatio: '3/4' }}>
                  <img
                    src={selectedManga.coverImage || FALLBACK_COVER_ASSET.src}
                    alt={selectedManga.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_COVER_ASSET.src;
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-[var(--text-primary)] truncate">
                    {selectedManga.title}
                  </h4>
                  {selectedManga.titleBn && (
                    <p className="text-sm text-[var(--text-secondary)] truncate">
                      {selectedManga.titleBn}
                    </p>
                  )}
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedManga.genres.slice(0, 3).join(', ')} · {selectedManga.status}
                  </p>
                  <p className="font-mono-num text-xs font-medium text-[var(--accent)] mt-0.5">
                    {selectedManga.totalChapters} chapters indexed
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add Chapter Form */}
      <AnimatePresence>
        {selectedManga && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl p-5 sm:p-6 mb-6 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          >
            <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <Plus size={17} className="text-[var(--accent)]" />
              Add New Chapter
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                    Chapter Number *
                  </label>
                  <input
                    type="number"
                    value={chapterNumber}
                    onChange={(e) => setChapterNumber(e.target.value)}
                    placeholder="1"
                    className={`${inputClass} font-mono-num`}
                    min="1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                    Chapter Title
                  </label>
                  <input
                    type="text"
                    value={chapterTitle}
                    onChange={(e) => setChapterTitle(e.target.value)}
                    placeholder="Chapter Title (optional)"
                    className={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                  External Read Link *
                </label>
                <input
                  type="url"
                  value={chapterLink}
                  onChange={(e) => setChapterLink(e.target.value)}
                  placeholder="https://external-site.com/chapter/1"
                  className={inputClass}
                />
              </div>
              <label className="flex items-center gap-2.5 p-3.5 rounded-xl cursor-pointer text-xs border border-sky-500/25 bg-sky-500/10">
                <input
                  type="checkbox"
                  checked={broadcastTelegram}
                  disabled={!telegramConfigured}
                  onChange={(e) => setBroadcastTelegram(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0088cc] disabled:opacity-40"
                />
                <Send size={14} className="text-sky-500 flex-shrink-0" />
                <span className="text-[var(--text-primary)] font-medium">
                  Broadcast chapter release to Telegram Channel
                  {!telegramConfigured && (
                    <span className="text-[var(--text-muted)] font-normal ml-1">
                      (configure TELEGRAM_BOT_TOKEN &amp; TELEGRAM_CHAT_ID on server to enable)
                    </span>
                  )}
                </span>
              </label>

              <div className="pt-1">
                <button
                  onClick={handleAddChapter}
                  disabled={adding || !chapterNumber || !chapterLink}
                  className="btn-accent text-xs py-2.5 px-5"
                >
                  {adding ? 'Adding...' : 'Add Chapter'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing Chapters */}
      <AnimatePresence>
        {selectedManga && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 14 }}
            transition={{ duration: 0.25 }}
            className="rounded-xl p-5 sm:p-6 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          >
            <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <FileText size={17} className="text-[var(--accent)]" />
              Existing Chapters <span className="font-mono-num text-sm font-normal text-[var(--text-muted)]">({chapters.length})</span>
            </h3>

            {chaptersLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded-lg" />
                ))}
              </div>
            ) : chapters.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-muted)] text-sm">
                No chapters yet. Add the first chapter above.
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-color)] divide-y divide-[var(--border-color)] max-h-96 overflow-y-auto">
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
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {chapter.readLink}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <a
                        href={chapter.readLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                      <button
                        onClick={() => setDeleteTarget(chapter)}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {!selectedManga && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-xl p-12 text-center border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          >
            <BookOpen size={40} className="mx-auto text-[var(--text-muted)] mb-3" strokeWidth={1.6} />
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">
              No Manga Selected
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Search and select a series above to manage or publish chapters.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <DeleteConfirm
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteChapter}
        title={`Chapter ${deleteTarget?.chapterNumber}: ${deleteTarget?.title || ''}`}
        loading={deleting}
      />
    </div>
  );
}
