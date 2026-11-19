import React from 'react';
import Link from 'next/link';
import { Facebook, Send, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '@/lib/config';

interface FooterProps {
  genres: { name: string; slug: string }[];
}

export function Footer({ genres }: FooterProps) {
  return (
    <footer
      className="mt-auto border-t"
      style={{
        background: 'var(--bg-secondary)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand Column */}
          <div>
            <Link
              href="/"
              className="font-display font-bold text-2xl tracking-tight text-[var(--text-primary)] inline-block mb-3"
            >
              Manga<span className="text-[var(--accent)]">BD</span>
            </Link>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-5 max-w-xs">
              {SITE_CONFIG.description}
            </p>
            <div className="flex items-center gap-2.5">
              <a
                href={SITE_CONFIG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Send size={13} />
                Telegram
              </a>
              <a
                href={SITE_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              >
                <Facebook size={13} />
                Facebook
              </a>
            </div>
          </div>

          {/* Directory Links */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
              Directory
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link href="/browse" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Browse Catalog</Link></li>
              <li><Link href="/bookmarks" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Saved Bookmarks</Link></li>
              <li><Link href="/blog" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Journal &amp; Releases</Link></li>
              <li><Link href="/requests" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Manga Requests</Link></li>
              <li><Link href="/search" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Search Archive</Link></li>
            </ul>
          </div>

          {/* Curated Genres */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
              Genres
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {genres.slice(0, 8).map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/genre/${genre.slug}`}
                  className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors truncate"
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Dispatch & Legal */}
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
              Community Dispatch
            </h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-4">
              Follow instant chapter broadcasts, release alerts, and editorial notes across our community channels.
            </p>
            <div className="space-y-2 text-sm">
              <a
                href={SITE_CONFIG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span>Telegram Channel</span>
                <ArrowUpRight size={14} />
              </a>
              <a
                href={SITE_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between py-1.5 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors border-b"
                style={{ borderColor: 'var(--border-color)' }}
              >
                <span>Facebook Community</span>
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>

        <div
          className="mt-10 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <p>
            &copy; {new Date().getUTCFullYear()} {SITE_CONFIG.name}. All directory metadata remains property of respective publishers.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/dmca" className="hover:text-[var(--text-primary)] transition-colors">
              DMCA &amp; Disclaimer
            </Link>
            <span>Curated by {SITE_CONFIG.creator}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
