'use client';

import React from 'react';
import { MangaCard } from './MangaCard';
import { MangaCardSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useContentMode } from '@/context/ContentModeContext';
import type { Manga } from '@/lib/firestore';

interface MangaGridProps {
  manga: Manga[];
  loading?: boolean;
  showRank?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
}

export function MangaGrid({
  manga,
  loading = false,
  showRank = false,
  emptyTitle = 'No manga found',
  emptyMessage = 'Try adjusting your filters or search query.',
}: MangaGridProps) {
  const { filterByMode } = useContentMode();
  const visibleManga = filterByMode(manga);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <MangaCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (visibleManga.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-5">
      {visibleManga.map((m, i) => (
        <MangaCard key={m.id} manga={m} index={i} showRank={showRank} rank={showRank ? i + 1 : undefined} />
      ))}
    </div>
  );
}
