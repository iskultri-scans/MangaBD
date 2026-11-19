'use client';

import React from 'react';
import Link from 'next/link';

interface GenreBarProps {
  genres: { name: string; slug: string }[];
}

export function GenreBar({ genres }: GenreBarProps) {
  if (genres.length === 0) return null;

  return (
    <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <div className="mb-4 sm:mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
          Index
        </p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
          Browse by Genre
        </h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {genres.map((genre) => (
          <Link
            key={genre.slug}
            href={`/genre/${genre.slug}`}
            className="genre-chip"
          >
            {genre.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
