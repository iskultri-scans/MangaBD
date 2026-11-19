'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { HeroBanner } from '@/components/home/HeroBanner';
import { TrendingSection } from '@/components/home/TrendingSection';
import { LatestUpdates } from '@/components/home/LatestUpdates';
import { GenreBar } from '@/components/home/GenreBar';
import { LanguageSection } from '@/components/home/LanguageSection';
import { WelcomeSection } from '@/components/home/WelcomeSection';
import { AnnouncementBar } from '@/components/home/AnnouncementBar';
import { UpcomingSection } from '@/components/home/UpcomingSection';
import { useContentMode } from '@/context/ContentModeContext';
import { SITE_CONFIG } from '@/lib/config';
import { TELEGRAM_BANNER_ASSET } from '@/lib/assets';
import { Send, Facebook, ArrowUpRight } from 'lucide-react';
import type { Manga, Genre, Announcement, UpcomingRelease } from '@/lib/firestore';

interface HomeContentProps {
  genres: Genre[];
  featured: Manga[];
  trending: Manga[];
  latest: Manga[];
  bnManga: Manga[];
  announcements: Announcement[];
  upcoming: UpcomingRelease[];
  genreSlugs: { name: string; slug: string }[];
}

export function HomeContent({
  featured,
  trending,
  latest,
  bnManga,
  announcements,
  upcoming,
  genreSlugs,
}: HomeContentProps) {
  const { filterByMode } = useContentMode();

  const visibleFeatured = useMemo(() => filterByMode(featured), [filterByMode, featured]);
  const visibleTrending = useMemo(() => filterByMode(trending), [filterByMode, trending]);
  const visibleLatest = useMemo(() => filterByMode(latest), [filterByMode, latest]);
  const visibleBnManga = useMemo(() => filterByMode(bnManga), [filterByMode, bnManga]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 overflow-x-clip">
      {/* Asymmetric Editorial Hero + Featured Series Showcase */}
      <section
        className="pt-6 sm:pt-8 pb-8 sm:pb-10 border-b"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          <div className="lg:col-span-5 flex flex-col">
            <WelcomeSection />
          </div>
          <div className="lg:col-span-7 flex">
            <HeroBanner manga={visibleFeatured} loading={false} />
          </div>
        </div>
      </section>

      {/* Latest Announcements Dispatch */}
      <AnnouncementBar announcements={announcements} loading={false} />

      {/* Trending Series */}
      <TrendingSection manga={visibleTrending} loading={false} />

      {/* Upcoming Releases with Countdown */}
      <UpcomingSection releases={upcoming} loading={false} />

      {/* Latest Updates */}
      <LatestUpdates manga={visibleLatest} loading={false} />

      {/* Browse by Genre */}
      <GenreBar genres={genreSlugs} />

      {/* Editorial Telegram Dispatch Banner */}
      <section className="py-8 sm:py-12">
        <div
          className="rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border"
          style={{
            background: 'var(--bg-secondary)',
            borderColor: 'var(--border-color)',
          }}
        >
          <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-2">
              Telegram Dispatch
            </span>
            <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-3 text-balance">
              Never Miss a Chapter Drop on MangaBD
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6 max-w-xl">
              Follow our official Telegram channel for instant chapter release dispatches, curated new titles, and direct reading links.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={SITE_CONFIG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-accent inline-flex items-center gap-2 text-sm min-h-[44px]"
              >
                <Send size={15} />
                Join Telegram Channel
              </a>
              <a
                href={SITE_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                style={{ border: '1px solid var(--border-color)' }}
              >
                <Facebook size={15} />
                Facebook Group
              </a>
              <Link
                href="/requests"
                className="inline-flex items-center gap-1 px-2 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors"
              >
                Request a Series
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[220px] lg:min-h-[300px] border-t lg:border-t-0 lg:border-l" style={{ borderColor: 'var(--border-color)' }}>
            <Image
              src={TELEGRAM_BANNER_ASSET}
              alt="MangaBD manuscript desk"
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Regional & Translated Bengali Editions */}
      <LanguageSection bnManga={visibleBnManga} loading={false} />
    </div>
  );
}
