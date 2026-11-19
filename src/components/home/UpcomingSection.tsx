'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { CountdownTimer } from '@/components/ui/CountdownTimer';
import type { UpcomingRelease } from '@/lib/firestore';

interface UpcomingSectionProps {
  releases: UpcomingRelease[];
  loading?: boolean;
}

export function UpcomingSection({ releases, loading = false }: UpcomingSectionProps) {
  if (loading) {
    return (
      <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
            Release Calendar
          </p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
            Upcoming Releases
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-48 rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  if (releases.length === 0) return null;

  return (
    <section className="py-8 sm:py-10 border-t" style={{ borderColor: 'var(--border-color)' }}>
      <div className="mb-5 sm:mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
          Release Calendar
        </p>
        <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight text-[var(--text-primary)]">
          Upcoming Releases
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {releases.map((release) => (
          <div
            key={release.id}
            className="rounded-lg overflow-hidden group transition-colors"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            {release.coverImage && (
              <div className="relative h-36 overflow-hidden border-b" style={{ borderColor: 'var(--border-color)' }}>
                <img
                  src={release.coverImage}
                  alt={release.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            <div className="p-4 sm:p-5">
              <h3 className="font-display text-base sm:text-lg font-semibold text-[var(--text-primary)] mb-0.5 truncate">
                {release.title}
              </h3>
              {release.titleBn && (
                <p className="text-xs text-[var(--text-muted)] mb-3.5 truncate">{release.titleBn}</p>
              )}

              <CountdownTimer
                targetDate={
                  typeof (release.releaseDate as unknown as { toDate?: () => Date })?.toDate === 'function'
                    ? release.releaseDate.toDate()
                    : new Date((release.releaseDate?.seconds || 0) * 1000)
                }
              />

              {release.mangaSlug && (
                <Link
                  href={`/manga/${release.mangaSlug}`}
                  className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                >
                  Series Details
                  <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
