'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ArrowRight, Star } from 'lucide-react';
import { HeroSkeleton } from '@/components/ui/Skeleton';
import { HERO_EDITORIAL_ASSET, FALLBACK_COVER_ASSET } from '@/lib/assets';
import type { Manga } from '@/lib/firestore';

interface HeroBannerProps {
  manga: Manga[];
  loading?: boolean;
}

export function HeroBanner({ manga, loading = false }: HeroBannerProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    if (manga.length === 0) return;
    setCurrent((prev) => (prev + 1) % manga.length);
  }, [manga.length]);

  const prev = useCallback(() => {
    if (manga.length === 0) return;
    setCurrent((prev) => (prev - 1 + manga.length) % manga.length);
  }, [manga.length]);

  useEffect(() => {
    if (paused || manga.length <= 1) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [paused, next, manga.length]);

  if (loading) return <HeroSkeleton />;

  if (manga.length === 0) {
    return (
      <div
        className="relative w-full min-h-[300px] sm:min-h-[380px] lg:min-h-[420px] rounded-xl overflow-hidden border"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <Image
          src={HERO_EDITORIAL_ASSET}
          alt="MangaBD Editorial Archive"
          fill
          className="object-cover"
          priority
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-red-400 mb-2">
            Editorial Spotlight
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            The MangaBD Directory
          </h2>
          <p className="text-sm text-zinc-200 max-w-md mb-4">
            Browse curated volumes, follow ongoing chapters, and submit series requests directly to our editors.
          </p>
          <Link
            href="/browse"
            className="btn-accent inline-flex items-center gap-2 text-xs sm:text-sm"
          >
            Explore Catalog
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full min-h-[320px] sm:min-h-[380px] lg:min-h-[430px] overflow-hidden rounded-xl border"
      style={{ borderColor: 'var(--border-color)', background: '#111113' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {manga.map((m, i) => (
        <div
          key={m.id}
          className={`hero-slide ${i === current ? 'active' : ''}`}
        >
          <Image
            src={m.bannerImage || m.coverImage || FALLBACK_COVER_ASSET.src}
            alt={m.title}
            fill
            className="object-cover"
            unoptimized={true}
            priority={i === 0}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent hidden sm:block" />

          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 lg:p-8 text-white sm:max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-zinc-200 mb-2">
              <span className="text-red-400 font-semibold">Featured</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-mono-num">
                <Star size={11} className="text-amber-400 fill-amber-400" />
                {m.rating}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">{m.totalChapters} Ch.</span>
              <span aria-hidden="true">·</span>
              <span>{m.language.toUpperCase()}</span>
            </div>

            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl tracking-tight text-white mb-1.5 line-clamp-2 text-balance">
              {m.title}
            </h2>

            {m.genres.length > 0 && (
              <p className="text-xs text-zinc-300 mb-2.5 truncate">
                {m.genres.slice(0, 3).join(' · ')}
              </p>
            )}

            <p className="hidden sm:block text-sm text-zinc-200 line-clamp-2 mb-4 max-w-md leading-relaxed">
              {m.description}
            </p>

            <Link
              href={`/manga/${m.slug}`}
              className="btn-accent inline-flex items-center gap-2 text-xs sm:text-sm"
            >
              View Series
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ))}

      {manga.length > 1 && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 z-10">
          <span className="font-mono-num text-xs text-zinc-200 mr-1">
            {String(current + 1).padStart(2, '0')} / {String(manga.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            onClick={prev}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/55 text-white border border-white/15 hover:bg-black/80 transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={next}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-black/55 text-white border border-white/15 hover:bg-black/80 transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
