'use client';

import React from 'react';
import Link from 'next/link';

interface GenreTagsProps {
  genres: string[];
}

export function GenreTags({ genres }: GenreTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {genres.map((genre) => (
        <Link
          key={genre}
          href={`/genre/${genre.toLowerCase().replace(/\s+/g, '-')}`}
          className="genre-chip text-xs"
        >
          {genre}
        </Link>
      ))}
    </div>
  );
}
