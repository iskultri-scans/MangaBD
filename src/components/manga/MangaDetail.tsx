'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Star, BookOpen } from 'lucide-react';
import { GenreTags } from './GenreTags';
import { ShareButtons } from './ShareButtons';
import { ChapterList } from './ChapterList';
import { BookmarkButton } from './BookmarkButton';
import { AdultBadge } from './AdultBadge';
import { useBookmarks } from '@/context/BookmarkContext';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';
import type { Manga } from '@/lib/firestore';

interface MangaDetailProps {
  manga: Manga;
}

export function MangaDetail({ manga }: MangaDetailProps) {
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const bookmarked = isBookmarked(manga.id);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div>
      {/* Atmospheric Backdrop */}
      <div className="relative w-full h-[220px] sm:h-[280px] md:h-[340px] overflow-hidden bg-[#111113]">
        <Image
          src={manga.bannerImage || manga.coverImage || FALLBACK_COVER_ASSET.src}
          alt={manga.title}
          fill
          className="object-cover opacity-55"
          unoptimized={true}
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/50 to-transparent" />
      </div>

      {/* Main Editorial Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-28 sm:-mt-32 relative z-10">
        <div className="flex flex-col items-center md:items-start md:flex-row gap-6 lg:gap-8">
          {/* Cover Frame */}
          <div className="shrink-0">
            <div
              className="relative w-40 sm:w-48 md:w-56 rounded-lg overflow-hidden shadow-xl border"
              style={{ aspectRatio: '3/4', borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
            >
              <Image
                src={manga.coverImage || FALLBACK_COVER_ASSET.src}
                alt={manga.title}
                fill
                className="object-cover"
                unoptimized={true}
                priority
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          {/* Series Header & Metadata */}
          <div className="flex-1 pt-1 md:pt-10 text-center md:text-left min-w-0 w-full">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] mb-2">
              <span className="text-[var(--accent)] font-semibold">{manga.language.toUpperCase()} Edition</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{manga.status}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-num text-[var(--text-primary)]">
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {manga.rating}
              </span>
              {manga.updatedAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Updated {mounted ? formatRelativeTime(manga.updatedAt) : formatDate(manga.updatedAt)}</span>
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="font-display font-bold text-2xl sm:text-3xl md:text-4xl tracking-tight text-[var(--text-primary)] text-balance">
                {manga.title}
              </h1>
              {manga.isAdult && <AdultBadge size="md" variant="banner" />}
            </div>

            {manga.titleBn && (
              <p className="text-sm sm:text-base text-[var(--text-secondary)] mb-4">
                {manga.titleBn}
              </p>
            )}

            {/* Key-Value Metadata Grid */}
            <dl
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-3.5 px-4 rounded-lg mb-4 text-left"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Author</dt>
                <dd className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                  {manga.author || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Artist</dt>
                <dd className="text-sm font-medium text-[var(--text-primary)] truncate mt-0.5">
                  {manga.artist || manga.author || 'Unknown'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-[var(--text-muted)]">Chapters</dt>
                <dd className="text-sm font-mono-num font-semibold text-[var(--text-primary)] mt-0.5">
                  {manga.totalChapters}
                </dd>
              </div>
            </dl>

            <div className="flex justify-center md:justify-start">
              <GenreTags genres={manga.genres} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <BookmarkButton
            manga={manga}
            isBookmarked={bookmarked}
            onToggle={toggleBookmark}
            variant="button"
            size={18}
            showLabel={true}
          />
          <ShareButtons
            title={manga.title}
            slug={manga.slug}
            description={manga.description}
            coverImage={manga.coverImage}
          />
        </div>

        {/* Synopsis */}
        <div className="mt-8">
          <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-2.5">
            Synopsis
          </h2>
          <div
            className="rounded-lg p-5 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-line"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {manga.description || 'No synopsis available for this series yet.'}
          </div>
        </div>

        {/* Chapter List */}
        {manga.chapters && manga.chapters.length > 0 ? (
          <ChapterList chapters={manga.chapters} mangaTitle={manga.title} mangaSlug={manga.slug} />
        ) : (
          <div
            className="mt-8 rounded-lg p-8 text-center"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <BookOpen size={28} className="mx-auto mb-2.5 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-secondary)]">
              No chapters have been added yet. Check back or subscribe to Telegram alerts for release updates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
