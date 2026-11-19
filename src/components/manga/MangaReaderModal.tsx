'use client';

import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import type { Chapter } from '@/lib/firestore';

interface MangaReaderModalProps {
  chapter: Chapter | null;
  mangaTitle: string;
  onClose: () => void;
  onSelectChapter?: (chapter: Chapter) => void;
  prevChapter?: Chapter | null;
  nextChapter?: Chapter | null;
}

export function MangaReaderModal({
  chapter,
  mangaTitle,
  onClose,
  onSelectChapter,
  prevChapter,
  nextChapter,
}: MangaReaderModalProps) {
  useEffect(() => {
    if (!chapter) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [chapter, onClose]);

  if (!chapter) return null;

  const pages = [...(chapter.pages || [])].sort((a, b) => a.pageNumber - b.pageNumber);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#0B0B0E] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={`${mangaTitle} — ${chapter.title}`}
    >
      {/* Sticky Reader Header */}
      <header className="h-14 px-3 sm:px-6 flex items-center justify-between gap-3 border-b border-white/10 bg-[#131317]/95 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen size={17} className="text-[var(--accent)] shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-zinc-400 truncate">{mangaTitle}</p>
            <h2 className="text-sm font-semibold text-white truncate">
              Ch. {chapter.chapterNumber}: {chapter.title || `Chapter ${chapter.chapterNumber}`}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden sm:inline font-mono-num text-xs text-zinc-400 mr-2">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </span>

          {prevChapter && onSelectChapter && (
            <button
              type="button"
              onClick={() => onSelectChapter(prevChapter)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ChevronLeft size={14} />
              <span className="hidden sm:inline">Prev</span>
            </button>
          )}

          {nextChapter && onSelectChapter && (
            <button
              type="button"
              onClick={() => onSelectChapter(nextChapter)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight size={14} />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-lg bg-white/10 hover:bg-[var(--accent)] transition-colors cursor-pointer ml-1"
            aria-label="Close reader"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Vertical Webtoon / Manga Page Stream */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-4 px-2 sm:px-4 space-y-2">
          {pages.length === 0 ? (
            <div className="py-24 text-center text-zinc-400 text-sm">
              No hosted pages found for this chapter.
            </div>
          ) : (
            pages.map((page) => {
              const src = `/api/image/${encodeURIComponent(page.fileId)}`;
              return (
                <figure key={`${page.pageNumber}-${page.fileId}`} className="w-full bg-[#141419] rounded-md overflow-hidden">
                  <img
                    src={src}
                    alt={`${mangaTitle} Chapter ${chapter.chapterNumber} — Page ${page.pageNumber}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block mx-auto"
                  />
                </figure>
              );
            })
          )}
        </div>

        {/* Bottom Chapter Navigation */}
        <div className="max-w-3xl mx-auto px-4 py-8 flex items-center justify-between gap-3 border-t border-white/10">
          {prevChapter && onSelectChapter ? (
            <button
              type="button"
              onClick={() => onSelectChapter(prevChapter)}
              className="px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChevronLeft size={16} />
              Previous Chapter
            </button>
          ) : (
            <div />
          )}

          {nextChapter && onSelectChapter ? (
            <button
              type="button"
              onClick={() => onSelectChapter(nextChapter)}
              className="btn-accent text-xs sm:text-sm px-4 py-2.5 flex items-center gap-1.5 cursor-pointer"
            >
              Next Chapter
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
            >
              Back to Series
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
