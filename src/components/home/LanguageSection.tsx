'use client';

import React from 'react';
import { MangaGrid } from '@/components/manga/MangaGrid';
import type { Manga } from '@/lib/firestore';

interface LanguageSectionProps {
  bnManga: Manga[];
  loading?: boolean;
}

export function LanguageSection({ bnManga, loading = false }: LanguageSectionProps) {
  return (
    <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <div className="mb-5 sm:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
          Regional Archive
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
            Bengali Editions
          </h2>
          <span className="text-xs sm:text-sm text-[var(--text-muted)]">
            Translated &amp; local-language titles
          </span>
        </div>
      </div>
      <MangaGrid manga={bnManga} loading={loading} emptyTitle="No Bengali-edition manga yet" />
    </section>
  );
}
