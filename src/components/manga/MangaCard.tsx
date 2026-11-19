'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star } from 'lucide-react';
import { BookmarkButton } from './BookmarkButton';
import { useBookmarks } from '@/context/BookmarkContext';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';
import type { Manga } from '@/lib/firestore';

interface MangaCardProps {
  manga: Manga;
  index?: number;
  showRank?: boolean;
  rank?: number;
}

export function MangaCard({ manga, index = 0, showRank = false, rank }: MangaCardProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();

  return (
    <div className="manga-card group relative" style={{ animationDelay: `${index * 35}ms` }}>
      <div
        className="rounded-lg overflow-hidden relative border transition-colors hover:border-[var(--border-strong)] h-full flex flex-col"
        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
      >
        <Link href={`/manga/${manga.slug}`} className="block flex-1 flex flex-col">
          <div className="relative overflow-hidden bg-[var(--bg-subtle)]" style={{ aspectRatio: '3/4' }}>
            {showRank && rank && (
              <div
                className="absolute top-2.5 left-2.5 z-10 min-w-[28px] h-7 px-1.5 flex items-center justify-center rounded-md font-mono-num text-xs font-semibold"
                style={{
                  background: rank <= 3 ? 'var(--accent)' : 'rgba(17, 17, 19, 0.85)',
                  color: '#FFFFFF',
                }}
              >
                {String(rank).padStart(2, '0')}
              </div>
            )}

            <Image
              src={manga.coverImage || FALLBACK_COVER_ASSET.src}
              alt={manga.title}
              fill
              className="object-cover group-hover:scale-[1.03] transition-transform duration-300"
              unoptimized={true}
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_COVER_ASSET.src;
              }}
            />
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                <span>{manga.language.toUpperCase()}</span>
                {manga.genres.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{manga.genres[0]}</span>
                  </>
                )}
                {manga.isAdult && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-[var(--accent)] font-semibold">18+</span>
                  </>
                )}
              </div>

              <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug mb-1 group-hover:text-[var(--accent)] transition-colors">
                {manga.title}
              </h3>

              {manga.titleBn && (
                <p className="text-xs text-[var(--text-muted)] line-clamp-1 mb-1">
                  {manga.titleBn}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-mono-num pt-1">
              <Star size={11} className="text-amber-500 fill-amber-500 shrink-0" />
              <span>{manga.rating}</span>
              <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
              <span className="text-[var(--text-muted)]">Ch. {manga.totalChapters}</span>
              <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
              <span className="text-[var(--text-muted)] capitalize truncate">{manga.status}</span>
            </div>
          </div>
        </Link>

        <BookmarkButton
          manga={manga}
          isBookmarked={isBookmarked(manga.id)}
          onToggle={toggleBookmark}
          variant="overlay"
          size={15}
        />
      </div>
    </div>
  );
}
