'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { MangaGrid } from '@/components/manga/MangaGrid';
import { SearchInput } from '@/components/browse/SearchInput';
import { useDebounce } from '@/hooks/useDebounce';
import { useContentMode } from '@/context/ContentModeContext';
import { searchManga, getAllGenres, type Manga, type Genre } from '@/lib/firestore';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Manga[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [searching, setSearching] = useState(false);
  const fetchIdRef = useRef(0);

  const debouncedQuery = useDebounce(query, 300);
  const hasQuery = debouncedQuery.trim().length > 0;
  const { filterByMode } = useContentMode();

  useEffect(() => {
    getAllGenres().then(setGenres);
  }, []);

  useEffect(() => {
    if (!hasQuery) return;

    const currentFetchId = ++fetchIdRef.current;
    setSearching(true);
    searchManga(debouncedQuery)
      .then((data) => {
        if (currentFetchId === fetchIdRef.current) {
          setResults(data);
          setSearching(false);
        }
      })
      .catch((err) => {
        if (currentFetchId === fetchIdRef.current) {
          console.error(err);
          setSearching(false);
        }
      });
  }, [debouncedQuery, hasQuery]);

  // Family Mode: filter out adult manga
  const displayResults = hasQuery ? filterByMode(results) : [];

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="pb-6 mb-6 border-b border-[var(--border-color)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
            Index Lookup
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Search Manga
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Search across titles, alternate editions, and creators.
          </p>
        </header>

        <div className="max-w-xl mb-8">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search by title, author, or alternate name..."
          />
        </div>

        {hasQuery ? (
          <>
            <p className="font-mono-num text-xs text-[var(--text-muted)] mb-5">
              {searching
                ? 'Searching catalog...'
                : `${displayResults.length} result${displayResults.length !== 1 ? 's' : ''} for "${debouncedQuery}"`}
            </p>
            <MangaGrid
              manga={displayResults}
              loading={searching}
              emptyTitle={`No results found for "${debouncedQuery}"`}
              emptyMessage="Try a different search term or browse the full directory."
            />
          </>
        ) : (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-muted)]">
              <Search size={20} strokeWidth={1.8} />
            </div>
            <p className="font-display text-lg font-semibold text-[var(--text-primary)] mb-1">
              Start typing to search
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              Enter a manga title, series slug, or creator name above.
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
