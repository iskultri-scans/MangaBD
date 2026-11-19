'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Send, BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { SITE_CONFIG } from '@/lib/config';

export function WelcomeSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col justify-between h-full py-1 sm:py-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-3">
          Curated Archive &amp; Chapter Tracker
        </p>

        <h1 className="font-display font-bold text-3xl sm:text-4xl xl:text-[2.75rem] leading-[1.08] tracking-tight text-[var(--text-primary)] mb-4 text-balance">
          Discover, Track &amp; Read Curated Manga.
        </h1>

        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed mb-6 max-w-lg">
          Explore trending series across English and Bengali editions, organize personal bookmarks, and stay updated with real-time Telegram alerts.
        </p>

        {/* Inline Catalog Search */}
        <form onSubmit={handleSearch} className="mb-5">
          <div
            className="flex items-center rounded-lg overflow-hidden p-1 transition-colors focus-within:border-[var(--accent)]"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Search size={16} className="ml-3 text-[var(--text-muted)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, author, or genre..."
              className="flex-1 min-w-0 px-3 py-2 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
            <button
              type="submit"
              className="btn-accent text-xs sm:text-sm px-4 py-2 min-h-[40px] flex items-center gap-1.5 shrink-0"
            >
              <span>Search</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Link
            href="/browse"
            className="btn-accent inline-flex items-center gap-2 text-sm min-h-[44px]"
          >
            <BookOpen size={15} />
            Browse Catalog
          </Link>
          <a
            href={SITE_CONFIG.social.telegram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <Send size={15} className="text-[var(--accent)]" />
            Telegram Alerts
          </a>
        </div>
      </div>

      {/* Unboxed index metadata line */}
      <div
        className="pt-4 border-t text-xs text-[var(--text-muted)] flex flex-wrap items-center gap-x-3 gap-y-1"
        style={{ borderColor: 'var(--border-color)' }}
      >
        <span>English &amp; Bengali Catalog</span>
        <span aria-hidden="true">·</span>
        <span>Instant Telegram Feed</span>
        <span aria-hidden="true">·</span>
        <span>Family-Safe Toggle</span>
      </div>
    </div>
  );
}
