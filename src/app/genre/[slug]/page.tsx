'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { MangaGrid } from '@/components/manga/MangaGrid';
import { FilterBar } from '@/components/browse/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useContentMode } from '@/context/ContentModeContext';
import { getAllManga, getAllGenres, getGenreBySlug, type Manga, type Genre } from '@/lib/firestore';

export default function GenrePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [allManga, setAllManga] = useState<Manga[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [currentGenre, setCurrentGenre] = useState<Genre | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [status, setStatus] = useState('');
  const [genre, setGenre] = useState(slug);
  const [sort, setSort] = useState('newest');

  const debouncedSearch = useDebounce(search, 300);
  const { filterByMode } = useContentMode();

  useEffect(() => {
    async function fetchData() {
      try {
        const [mangaData, genresData] = await Promise.all([
          getAllManga(),
          getAllGenres(),
        ]);
        setAllManga(mangaData);
        setGenres(genresData);
        const g = await getGenreBySlug(slug);
        setCurrentGenre(g);
      } catch (error) {
        console.error('Error fetching genre data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [slug]);

  const filteredManga = useMemo(() => {
    // Family Mode: filter out adult manga
    let result = filterByMode(allManga);

    // Filter by genre
    result = result.filter((m) =>
      m.genres.some((g) => g.toLowerCase().replace(/\s+/g, '-') === slug)
    );

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        (m.titleBn && m.titleBn.includes(debouncedSearch))
      );
    }

    if (language !== 'all') {
      result = result.filter((m) => m.language === language);
    }

    if (status) {
      result = result.filter((m) => m.status === status);
    }

    switch (sort) {
      case 'newest':
        result.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'az':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [allManga, slug, debouncedSearch, language, status, sort, filterByMode]);

  const { currentItems, currentPage, totalPages, goToPage, hasNext, hasPrev } =
    usePagination(filteredManga, 20);

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));
  const displayName = currentGenre?.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="pb-6 mb-6 border-b border-[var(--border-color)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
            Genre Index
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            {displayName}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Explore curated {displayName.toLowerCase()} titles available on MangaBD.
          </p>
        </header>

        <FilterBar
          search={search}
          onSearchChange={setSearch}
          language={language}
          onLanguageChange={setLanguage}
          status={status}
          onStatusChange={setStatus}
          genre={genre}
          onGenreChange={setGenre}
          sort={sort}
          onSortChange={setSort}
          genres={genreSlugs}
        />

        <p className="font-mono-num text-xs text-[var(--text-muted)] mb-5">
          Showing {currentItems.length} of {filteredManga.length} series
        </p>

        <MangaGrid manga={currentItems} loading={loading} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
          hasNext={hasNext}
          hasPrev={hasPrev}
        />
      </div>
    </PublicLayout>
  );
}
