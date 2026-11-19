'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Bookmark, Newspaper, Menu } from 'lucide-react';
import { useBookmarks } from '@/context/BookmarkContext';

interface MobileBottomNavProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export function MobileBottomNav({ onOpenMenu, menuOpen }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { bookmarkCount } = useBookmarks();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
  };

  const tabClass = (active: boolean) =>
    `flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[10px] font-semibold tracking-wide transition-colors cursor-pointer ${
      active
        ? 'text-[var(--accent)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
    }`;

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-around h-14 px-1">
        <Link href="/" className={tabClass(isActive('/'))}>
          <Home size={18} />
          <span>Home</span>
        </Link>

        <Link href="/browse" className={tabClass(isActive('/browse') || isActive('/genre'))}>
          <BookOpen size={18} />
          <span>Browse</span>
        </Link>

        <Link href="/bookmarks" className={tabClass(isActive('/bookmarks'))}>
          <div className="relative">
            <Bookmark size={18} />
            {bookmarkCount > 0 && (
              <span
                className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[15px] px-1 rounded flex items-center justify-center font-mono-num text-[9px] font-bold text-white leading-none"
                style={{ background: 'var(--accent)' }}
              >
                {bookmarkCount > 9 ? '9+' : bookmarkCount}
              </span>
            )}
          </div>
          <span>Saved</span>
        </Link>

        <Link href="/blog" className={tabClass(isActive('/blog'))}>
          <Newspaper size={18} />
          <span>Journal</span>
        </Link>

        <button
          type="button"
          onClick={onOpenMenu}
          className={tabClass(menuOpen)}
          aria-label="Open full navigation menu"
          aria-expanded={menuOpen}
        >
          <Menu size={18} />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
