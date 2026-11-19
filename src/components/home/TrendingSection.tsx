'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MangaGrid } from '@/components/manga/MangaGrid';
import type { Manga } from '@/lib/firestore';

interface TrendingSectionProps {
  manga: Manga[];
  loading?: boolean;
}

export function TrendingSection({ manga, loading = false }: TrendingSectionProps) {
  return (
    <section className="py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4 mb-5 sm:mb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
            Reader Favorites
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
            Trending Now
          </h2>
        </div>
        <Link
          href="/browse"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors shrink-0"
        >
          Full Catalog
          <ArrowRight size={14} />
        </Link>
      </div>
      <MangaGrid manga={manga} loading={loading} showRank emptyTitle="No trending manga yet" />
    </section>
  );
}
