'use client';

import React, { useState } from 'react';
import { BookOpen, ExternalLink, ChevronUp, Search, Layers } from 'lucide-react';
import type { Chapter } from '@/lib/firestore';
import { MangaReaderModal } from './MangaReaderModal';

interface ChapterListProps {
  chapters: Chapter[];
  mangaTitle: string;
}

export function ChapterList({ chapters, mangaTitle }: ChapterListProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  const filteredChapters = chapters.filter(
    (ch) =>
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.chapterNumber.toString().includes(searchQuery)
  );

  const sortedChapters = sortAsc
    ? [...filteredChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
    : filteredChapters;

  // Ordered ascending by chapterNumber for prev/next navigation inside reader
  const ascHostedChapters = [...chapters]
    .filter((ch) => ch.pages && ch.pages.length > 0)
    .sort((a, b) => a.chapterNumber - b.chapterNumber);

  const activeIdx = activeChapter
    ? ascHostedChapters.findIndex((c) => c.id === activeChapter.id)
    : -1;
  const prevChapter = activeIdx > 0 ? ascHostedChapters[activeIdx - 1] : null;
  const nextChapter =
    activeIdx >= 0 && activeIdx < ascHostedChapters.length - 1
      ? ascHostedChapters[activeIdx + 1]
      : null;

  const handleChapterClick = (chapter: Chapter) => {
    if (chapter.pages && chapter.pages.length > 0) {
      setActiveChapter(chapter);
    } else if (chapter.readLink) {
      window.open(chapter.readLink, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full rounded-t-lg px-4 py-3.5 flex items-center justify-between text-left transition-colors cursor-pointer"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderBottom: expanded ? 'none' : '1px solid var(--border-color)',
          borderRadius: expanded ? '8px 8px 0 0' : '8px',
        }}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen size={18} className="text-[var(--accent)]" />
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Chapters <span className="font-mono-num text-sm font-medium text-[var(--text-muted)] ml-1">({chapters.length})</span>
          </h2>
        </div>
        <ChevronUp
          size={18}
          className={`text-[var(--text-muted)] transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`}
        />
      </button>

      {expanded && (
        <div
          className="rounded-b-lg overflow-hidden"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            className="p-3 border-b flex items-center gap-2.5"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter chapters..."
                className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none focus:border-[var(--accent)]"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => setSortAsc(!sortAsc)}
              className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: sortAsc ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {sortAsc ? 'Oldest First' : 'Newest First'}
            </button>
          </div>

          <div className="max-h-[480px] overflow-y-auto divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {sortedChapters.length === 0 ? (
              <div className="text-center py-10 text-[var(--text-muted)] text-sm">
                {chapters.length === 0 ? 'No chapters available yet.' : 'No matching chapters found.'}
              </div>
            ) : (
              sortedChapters.map((chapter) => {
                const hostedCount = chapter.pages?.length || 0;
                return (
                  <button
                    type="button"
                    key={chapter.id}
                    onClick={() => handleChapterClick(chapter)}
                    className="w-full flex items-center justify-between px-4 py-3 min-h-[52px] text-left transition-colors hover:bg-[var(--bg-subtle)] group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="shrink-0 min-w-[40px] h-8 px-2 rounded-md flex items-center justify-center font-mono-num text-xs font-semibold"
                        style={{
                          background: 'var(--accent-glow)',
                          color: 'var(--accent)',
                        }}
                      >
                        {chapter.chapterNumber}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
                          {chapter.title || `Chapter ${chapter.chapterNumber}`}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] truncate">
                          {hostedCount > 0 ? `${hostedCount} pages · Built-in Reader` : mangaTitle}
                        </p>
                      </div>
                    </div>
                    {hostedCount > 0 ? (
                      <Layers
                        size={15}
                        className="shrink-0 text-[var(--accent)] ml-3"
                        aria-label="Open built-in reader"
                      />
                    ) : (
                      <ExternalLink
                        size={14}
                        className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors ml-3"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      <MangaReaderModal
        chapter={activeChapter}
        mangaTitle={mangaTitle}
        onClose={() => setActiveChapter(null)}
        onSelectChapter={(ch) => setActiveChapter(ch)}
        prevChapter={prevChapter}
        nextChapter={nextChapter}
      />
    </div>
  );
}
