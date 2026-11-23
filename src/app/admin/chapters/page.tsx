'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, X, PlusCircle } from 'lucide-react';
import { getAllManga, type Manga } from '@/lib/firestore';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { ChapterManager } from '@/components/admin/ChapterManager';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';

export default function AdminChaptersPage() {
  const [allManga, setAllManga] = useState<Manga[]>([]);
  const [catalogLoaded, setCatalogLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Manga[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);

  useEffect(() => {
    getAllManga()
      .then((list) => setAllManga(list))
      .catch((err) => console.error('Error loading manga catalog:', err))
      .finally(() => setCatalogLoaded(true));
  }, []);

  const searchManga = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setShowDropdown(false);
        return;
      }
      setIsSearching(true);
      try {
        const list = allManga.length > 0 ? allManga : await getAllManga();
        if (allManga.length === 0 && list.length > 0) setAllManga(list);
        const lower = query.toLowerCase();
        const filtered = list.filter(
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
    },
    [allManga]
  );

  useEffect(() => {
    if (selectedManga) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchManga(searchQuery);
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, selectedManga, searchManga]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectManga = (manga: Manga) => {
    setSelectedManga(manga);
    setSearchQuery(manga.title);
    setShowDropdown(false);
  };

  const handleClearSelection = () => {
    setSelectedManga(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  const recentPicks = allManga.slice(0, 6);

  return (
    <div>
      <AdminHeader
        title="Post Chapter"
        subtitle="Upload chapter pages to Telegram CDN or index external links, and broadcast updates"
      />

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
              onFocus={() => {
                if (!selectedManga && searchQuery.trim() && searchResults.length > 0) {
                  setShowDropdown(true);
                }
              }}
              placeholder="Search manga in your catalog by title or slug..."
              className={`${inputClass} pl-10 pr-10`}
              disabled={!!selectedManga}
            />
            {selectedManga ? (
              <button
                type="button"
                onClick={handleClearSelection}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                aria-label="Clear selected series"
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
                    type="button"
                    onClick={() => handleSelectManga(manga)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors border-b last:border-0 border-[var(--border-color)] cursor-pointer"
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
            <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl p-4 text-center z-50 border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl space-y-2.5">
              <p className="text-sm text-[var(--text-muted)]">
                No manga found for &quot;{searchQuery.trim()}&quot; in your catalog.
              </p>
              <Link
                href={`/admin/manga/add?q=${encodeURIComponent(searchQuery.trim())}`}
                className="btn-accent inline-flex items-center gap-1.5 text-xs py-2 px-3.5"
              >
                <PlusCircle size={13} />
                Add &quot;{searchQuery.trim()}&quot; (with Auto-Fill)
              </Link>
            </div>
          )}
        </div>

        {/* Quick-select existing catalog series when none selected */}
        {!selectedManga && catalogLoaded && recentPicks.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mr-1">
              Quick pick:
            </span>
            {recentPicks.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectManga(m)}
                className="px-2.5 py-1 rounded-md text-xs font-medium border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors cursor-pointer truncate max-w-[180px]"
              >
                {m.title}
              </button>
            ))}
          </div>
        )}

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
                <Link
                  href={`/admin/manga/edit/${selectedManga.id}`}
                  className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors shrink-0"
                >
                  Edit Series
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Reuse tested ChapterManager (Telegram CDN multi-image upload, compression, retry, resume, broadcast) */}
      {selectedManga ? (
        <ChapterManager
          key={selectedManga.id}
          mangaId={selectedManga.id}
          mangaTitle={selectedManga.title}
          mangaSlug={selectedManga.slug}
          defaultOpenAdd={true}
        />
      ) : (
        <div className="rounded-xl p-12 text-center border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <BookOpen size={40} className="mx-auto text-[var(--text-muted)] mb-3" strokeWidth={1.6} />
          <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">
            No Manga Selected
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Search and select a series above to upload chapter pages or publish external chapters.
          </p>
        </div>
      )}
    </div>
  );
}
