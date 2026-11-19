'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { MangaDetail } from '@/components/manga/MangaDetail';
import type { Manga } from '@/lib/firestore';

interface MangaDetailClientProps {
  /** Server-fetched manga data — no duplicate fetch on client */
  manga: Manga;
  genreSlugs: { name: string; slug: string }[];
}

export function MangaDetailClient({ manga, genreSlugs }: MangaDetailClientProps) {
  if (manga.isAdult) {
    return (
      <PublicLayout genres={genreSlugs}>
        <AdultContentGate mangaTitle={manga.title} mangaTitleBn={manga.titleBn} />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="pb-12">
        <MangaDetail manga={manga} />
      </div>
    </PublicLayout>
  );
}

function AdultContentGate({
  mangaTitle,
  mangaTitleBn,
}: {
  mangaTitle: string;
  mangaTitleBn?: string;
}) {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center">
        <ShieldAlert size={28} className="text-[var(--accent)]" />
      </div>

      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
        Age Restriction
      </p>
      <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
        18+ Restricted Content
      </h1>
      <p className="text-sm text-[var(--text-secondary)] mb-1">
        <strong className="text-[var(--text-primary)]">{mangaTitle}</strong>
        {mangaTitleBn && <> ({mangaTitleBn})</>}
      </p>
      <p className="text-sm text-[var(--text-muted)] mb-7 leading-relaxed">
        This series is marked as mature (18+). Switch to 18+ Mode using the content toggle in the top navigation bar to view it.
      </p>

      <Link
        href="/"
        className="btn-accent inline-flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={15} /> Back to Home
      </Link>
    </div>
  );
}
