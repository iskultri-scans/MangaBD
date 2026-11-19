'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Menu, ChevronDown, X, ArrowRight, Compass } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';
import { NotificationBell } from './NotificationBell';
import { ContentModeToggle } from './ContentModeToggle';
import { useBookmarks } from '@/context/BookmarkContext';

interface NavbarProps {
  genres: { name: string; slug: string }[];
  mobileOpen?: boolean;
  onOpenMobileMenu?: () => void;
  onCloseMobileMenu?: () => void;
}

type ActivePopover = 'none' | 'genres' | 'search' | 'mode' | 'notifications' | 'account';

export function Navbar({
  genres,
  mobileOpen = false,
  onOpenMobileMenu,
  onCloseMobileMenu,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { bookmarkCount } = useBookmarks();
  const [activePopover, setActivePopover] = useState<ActivePopover>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close all popovers on route navigation
  useEffect(() => {
    setActivePopover('none');
  }, [pathname]);

  useEffect(() => {
    if (activePopover === 'search' && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [activePopover]);

  useEffect(() => {
    if (activePopover === 'none') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover('none');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activePopover]);

  const togglePopover = (target: ActivePopover) => {
    onCloseMobileMenu?.();
    setActivePopover((prev) => (prev === target ? 'none' : target));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setActivePopover('none');
      setSearchQuery('');
    }
  };

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  };

  const navLinkClass = (active: boolean) =>
    `relative inline-flex items-center text-sm font-medium whitespace-nowrap shrink-0 h-16 transition-colors cursor-pointer ${
      active
        ? 'text-[var(--text-primary)] font-semibold'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ borderColor: 'var(--border-color)' }}
    >
      {/* Glass surface background on separate layer so fixed popovers are never clipped */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 transition-colors duration-200"
        style={{
          background: scrolled ? 'var(--glass-bg)' : 'var(--bg-primary)',
          backdropFilter: scrolled ? 'blur(12px)' : undefined,
          WebkitBackdropFilter: scrolled ? 'blur(12px)' : undefined,
        }}
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 lg:h-16 flex items-center justify-between gap-2 sm:gap-6">
        {/* Zone 1: Brand Wordmark */}
        <Link
          href="/"
          className="font-display font-bold text-xl sm:text-2xl tracking-tight text-[var(--text-primary)] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span>
            Manga<span className="text-[var(--accent)]">BD</span>
          </span>
          <span
            className="hidden xl:inline-block text-[10px] font-mono-num uppercase tracking-widest px-1.5 py-0.5 rounded"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
            }}
          >
            Index
          </span>
        </Link>

        {/* Zone 2: Desktop Primary Menu Bar */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary navigation">
          <Link href="/" className={navLinkClass(isNavActive('/'))}>
            Home
            {isNavActive('/') && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
            )}
          </Link>

          <Link href="/browse" className={navLinkClass(isNavActive('/browse'))}>
            Browse
            {isNavActive('/browse') && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
            )}
          </Link>

          {/* Genres Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => togglePopover('genres')}
              aria-expanded={activePopover === 'genres'}
              aria-haspopup="menu"
              className={`inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap shrink-0 h-16 transition-colors cursor-pointer ${
                pathname?.startsWith('/genre') || activePopover === 'genres'
                  ? 'text-[var(--text-primary)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Genres
              <ChevronDown
                size={14}
                className={`transition-transform duration-150 ${
                  activePopover === 'genres' ? 'rotate-180' : ''
                }`}
              />
              {pathname?.startsWith('/genre') && (
                <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
              )}
            </button>

            {activePopover === 'genres' && (
              <>
                <div
                  className="fixed inset-0 z-[70] bg-transparent"
                  onClick={() => setActivePopover('none')}
                  aria-hidden="true"
                />

                <div
                  role="menu"
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 w-[360px] rounded-xl p-3.5 shadow-2xl z-[80]"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <div
                    className="flex items-center justify-between px-2 pb-2.5 mb-2.5 border-b"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      Browse Genres
                    </span>
                    <Link
                      href="/browse"
                      onClick={() => setActivePopover('none')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
                    >
                      All Catalog
                      <ArrowRight size={12} />
                    </Link>
                  </div>

                  {genres.length === 0 ? (
                    <p className="px-2 py-4 text-center text-xs text-[var(--text-muted)]">
                      No genres listed yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-1 max-h-72 overflow-y-auto no-scrollbar">
                      {genres.map((genre) => (
                        <Link
                          key={genre.slug}
                          href={`/genre/${genre.slug}`}
                          onClick={() => setActivePopover('none')}
                          className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors truncate"
                        >
                          {genre.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Link href="/bookmarks" className={navLinkClass(isNavActive('/bookmarks'))}>
            Bookmarks
            {bookmarkCount > 0 && (
              <span className="ml-1.5 font-mono-num text-xs font-semibold text-[var(--accent)]">
                ({bookmarkCount})
              </span>
            )}
            {isNavActive('/bookmarks') && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
            )}
          </Link>

          <Link href="/blog" className={navLinkClass(isNavActive('/blog'))}>
            Journal
            {isNavActive('/blog') && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
            )}
          </Link>

          <Link href="/requests" className={navLinkClass(isNavActive('/requests'))}>
            Requests
            {isNavActive('/requests') && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-[var(--accent)]" />
            )}
          </Link>
        </nav>

        {/* Zone 3: Coordinated Right Utility Cluster */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => togglePopover('search')}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              activePopover === 'search'
                ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            aria-label={activePopover === 'search' ? 'Close search bar' : 'Search manga'}
            aria-expanded={activePopover === 'search'}
            title="Search archive"
          >
            {activePopover === 'search' ? <X size={18} /> : <Search size={18} />}
          </button>

          <ContentModeToggle
            isOpen={activePopover === 'mode'}
            onToggle={() => togglePopover('mode')}
            onClose={() => setActivePopover('none')}
          />

          <NotificationBell
            isOpen={activePopover === 'notifications'}
            onToggle={() => togglePopover('notifications')}
            onClose={() => setActivePopover('none')}
          />

          <div className="hidden sm:flex">
            <ThemeToggle />
          </div>

          <div className="hidden md:flex pl-1">
            <UserMenu
              isOpen={activePopover === 'account'}
              onToggle={() => togglePopover('account')}
              onClose={() => setActivePopover('none')}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setActivePopover('none');
              if (mobileOpen) onCloseMobileMenu?.();
              else onOpenMobileMenu?.();
            }}
            className={`lg:hidden min-w-[42px] min-h-[42px] flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
              mobileOpen
                ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Expandable Search Panel */}
      {activePopover === 'search' && (
        <>
          <div
            className="fixed inset-0 top-14 lg:top-16 z-[60] bg-black/30"
            onClick={() => setActivePopover('none')}
            aria-hidden="true"
          />
          <div
            className="relative z-[70] border-t"
            style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
          >
            <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-2.5">
              <form onSubmit={handleSearch} className="flex items-center gap-2">
                <div
                  className="flex-1 flex items-center gap-2 px-3 rounded-lg min-h-[42px]"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <Search size={16} className="text-[var(--text-muted)] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search manga by title, author, or slug..."
                    className="w-full py-2 bg-transparent text-sm outline-none text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      aria-label="Clear search query"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="btn-accent text-xs sm:text-sm px-4 py-2 min-h-[42px] inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <span>Search</span>
                  <ArrowRight size={14} />
                </button>
              </form>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5 text-xs">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] shrink-0">
                  <Compass size={12} /> Quick:
                </span>
                {['Solo Leveling', 'One Piece', 'Jujutsu Kaisen', 'Action', 'Fantasy'].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => {
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                      setActivePopover('none');
                    }}
                    className="px-2.5 py-1 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] whitespace-nowrap cursor-pointer transition-colors"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)',
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
