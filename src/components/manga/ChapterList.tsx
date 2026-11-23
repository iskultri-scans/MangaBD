'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ExternalLink, ChevronUp, Search } from 'lucide-react';
import type { Chapter } from '@/lib/firestore';

interface ChapterListProps {
  chapters: Chapter[];
  mangaTitle: string;
  mangaSlug: string;
}

export function ChapterList({ chapters, mangaTitle, mangaSlug }: ChapterListProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredChapters = chapters.filter(
    (ch) =>
      ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.chapterNumber.toString().includes(searchQuery)
  );

  const sortedChapters = sortAsc
    ? [...filteredChapters].sort((a, b) => a.chapterNumber - b.chapterNumber)
    : filteredChapters;

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
                const hasPages = hostedCount > 0;
                const internalHref = `/read/${encodeURIComponent(mangaSlug)}/${chapter.chapterNumber}`;

                return (
                  <div
                    key={chapter.id}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[56px] transition-colors hover:bg-[var(--bg-subtle)] group"
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
                          {hasPages ? `${hostedCount} pages · Internal Reader` : mangaTitle}
                        </p>
                      </div>
                    </div>

                    {hasPages ? (
                      <Link
                        href={internalHref}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
                      >
                        <BookOpen size={13} />
                        Read
                      </Link>
                    ) : chapter.readLink ? (
                      <a
                        href={chapter.readLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                      >
                        Read
                        <ExternalLink size={12} />
                      </a>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
