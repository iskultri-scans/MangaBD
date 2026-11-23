'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X,
  Home,
  BookOpen,
  Tag,
  Search,
  Shield,
  LogIn,
  LogOut,
  Facebook,
  Send,
  Bookmark,
  Newspaper,
  MessageSquare,
  Moon,
  Sun,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks } from '@/context/BookmarkContext';
import { useTheme } from '@/context/ThemeContext';
import { useContentMode } from '@/context/ContentModeContext';
import { SITE_CONFIG } from '@/lib/config';
import { TelegramConnectCard } from './TelegramConnectCard';
import { BrandLogo } from './BrandLogo';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  genres: { name: string; slug: string }[];
}

export function MobileMenu({ isOpen, onClose, genres }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth();
  const { bookmarkCount } = useBookmarks();
  const { theme, toggleTheme } = useTheme();
  const { mode, toggleMode } = useContentMode();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery('');
      onClose();
    }
  };

  const menuItems = [
    { href: '/', icon: <Home size={18} />, label: 'Home', badge: null },
    { href: '/browse', icon: <BookOpen size={18} />, label: 'Browse Catalog', badge: null },
    {
      href: '/bookmarks',
      icon: <Bookmark size={18} />,
      label: 'Bookmarks',
      badge: bookmarkCount > 0 ? bookmarkCount : null,
    },
    { href: '/blog', icon: <Newspaper size={18} />, label: 'Journal & Dispatches', badge: null },
    { href: '/requests', icon: <MessageSquare size={18} />, label: 'Manga Requests', badge: null },
    { href: '/search', icon: <Search size={18} />, label: 'Advanced Search', badge: null },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  };

  const isFamily = mode === 'family';

  return (
    <div className="fixed inset-0 z-[90] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        className="fixed top-0 left-0 bottom-0 w-[86vw] max-w-xs flex flex-col shadow-2xl"
        style={{
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-strong)',
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-4 h-14 border-b shrink-0"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <Link
            href="/"
            onClick={onClose}
            className="whitespace-nowrap inline-flex items-center"
          >
            <BrandLogo size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
          {/* Quick Search inside Drawer */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5">
            <div
              className="flex-1 flex items-center gap-2 px-3 rounded-lg min-h-[42px]"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Search size={15} className="text-[var(--text-muted)] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Quick search series..."
                className="w-full bg-transparent text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
            </div>
            <button
              type="submit"
              className="min-w-[42px] min-h-[42px] flex items-center justify-center rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors cursor-pointer shrink-0"
              aria-label="Submit search"
            >
              <ArrowRight size={15} />
            </button>
          </form>

          {/* Primary Menu Links */}
          <div className="space-y-1">
            {menuItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: active ? 'var(--accent-glow)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <span className={active ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge !== null && (
                    <span className="ml-auto font-mono-num text-xs font-semibold text-[var(--accent)]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Quick Controls: Theme & Reading Filter */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span className="block px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Preferences
            </span>
            <div className={`grid gap-2 ${SITE_CONFIG.features.adultModeEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-lg text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                {theme === 'dark' ? <Moon size={14} className="text-[var(--accent)]" /> : <Sun size={14} className="text-amber-500" />}
                <span>{theme === 'dark' ? 'Dark Ink' : 'Light Paper'}</span>
              </button>

              {SITE_CONFIG.features.adultModeEnabled && (
                <button
                  type="button"
                  onClick={toggleMode}
                  className="flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  style={{
                    background: isFamily ? 'var(--bg-primary)' : 'var(--accent-glow)',
                    border: `1px solid ${isFamily ? 'var(--border-color)' : 'var(--accent)'}`,
                    color: isFamily ? 'var(--text-primary)' : 'var(--accent)',
                  }}
                >
                  {isFamily ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span>{isFamily ? 'Family Safe' : '18+ Mode'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Genres Grid */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <Tag size={12} /> Genres
              </span>
              <Link
                href="/browse"
                onClick={onClose}
                className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto no-scrollbar">
              {genres.map((genre) => (
                <Link
                  key={genre.slug}
                  href={`/genre/${genre.slug}`}
                  onClick={onClose}
                  className="px-2.5 min-h-[40px] flex items-center rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors truncate"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  {genre.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Community Channels */}
          <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
            <span className="block px-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Channels
            </span>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={SITE_CONFIG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
              >
                <Send size={14} />
                Telegram
              </a>
              <a
                href={SITE_CONFIG.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="flex items-center justify-center gap-1.5 min-h-[44px] rounded-lg text-xs font-semibold text-[var(--text-primary)] transition-colors"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
              >
                <Facebook size={14} />
                Facebook
              </a>
            </div>
          </div>

          {/* Signed-in Telegram Linking Card */}
          {user && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <TelegramConnectCard />
            </div>
          )}

          {/* Admin Console (if admin) */}
          {user && isAdmin && (
            <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-3 px-3 min-h-[44px] rounded-lg text-sm font-semibold text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors"
              >
                <Shield size={18} />
                Admin Console
              </Link>
            </div>
          )}
        </nav>

        {/* Footer Account Strip */}
        <div
          className="px-4 py-3 border-t shrink-0"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
        >
          {user ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {user.displayName || 'Reader'}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  onClose();
                }}
                className="px-3 min-h-[40px] rounded-lg text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-glow)] flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors"
            >
              <LogIn size={15} />
              Sign In / Create Account
            </Link>
          )}
        </div>
      </aside>
    </div>
  );
}
