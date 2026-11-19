'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { getAllGenres, type Genre } from '@/lib/firestore';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function NotFound() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));

  useEffect(() => {
    getAllGenres().then(setGenres);
  }, []);

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 text-center">
        <p className="font-mono-num text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)] mb-3">
          Error 404
        </p>

        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight text-[var(--text-primary)] mb-4">
          Page Not Found
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
          The page or series record you are looking for is not in this edition of the catalog.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className="btn-accent inline-flex items-center gap-2 text-sm">
            <Home size={16} /> Back Home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
          >
            <Search size={16} />
            Search Manga
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
