'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MangaGrid } from '@/components/manga/MangaGrid';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';
import type { Manga } from '@/lib/firestore';

interface LatestUpdatesProps {
  manga: Manga[];
  loading?: boolean;
}

export function LatestUpdates({ manga, loading = false }: LatestUpdatesProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
            Fresh Additions
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
            Latest Updates
          </h2>
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors shrink-0"
        >
          View All
          <ArrowRight size={14} />
        </Link>
      </div>

      {loading ? (
        <MangaGrid manga={[]} loading={true} />
      ) : manga.length === 0 ? (
        <MangaGrid manga={[]} emptyTitle="No recent updates" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
          {manga.map((m, i) => (
            <div key={m.id} className="manga-card" style={{ animationDelay: `${i * 35}ms` }}>
              <Link
                href={`/manga/${m.slug}`}
                className="group block rounded-lg overflow-hidden border transition-colors hover:border-[var(--border-strong)]"
                style={{
                  background: 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <div className="relative overflow-hidden bg-[var(--bg-subtle)]" style={{ aspectRatio: '3/4' }}>
                  <img
                    src={m.coverImage || FALLBACK_COVER_ASSET.src}
                    alt={m.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_COVER_ASSET.src;
                    }}
                  />
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    <span>{m.language.toUpperCase()}</span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate">{m.genres[0] || 'Manga'}</span>
                    {m.isAdult && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[var(--accent)] font-semibold">18+</span>
                      </>
                    )}
                  </div>
                  <h3 className="font-display text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug mb-1.5 group-hover:text-[var(--accent)] transition-colors">
                    {m.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-mono-num">
                    Ch. {m.totalChapters} · {mounted ? formatRelativeTime(m.createdAt) : formatDate(m.createdAt)}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
