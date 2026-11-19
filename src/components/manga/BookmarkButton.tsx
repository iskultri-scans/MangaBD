'use client';

import React from 'react';
import { Bookmark } from 'lucide-react';
import type { Manga } from '@/lib/firestore';

interface BookmarkButtonProps {
  manga: Manga;
  isBookmarked: boolean;
  onToggle: (manga: Manga) => void;
  size?: number;
  className?: string;
  showLabel?: boolean;
  variant?: 'icon' | 'button' | 'overlay';
}

export function BookmarkButton({
  manga,
  isBookmarked,
  onToggle,
  size = 18,
  className = '',
  showLabel = false,
  variant = 'icon',
}: BookmarkButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(manga);
  };

  if (variant === 'overlay') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="absolute top-2.5 right-2.5 z-20 w-9 h-9 flex items-center justify-center rounded-md transition-colors"
        style={{
          background: isBookmarked ? 'var(--accent)' : 'rgba(17, 17, 19, 0.78)',
          color: '#FFFFFF',
          border: '1px solid rgba(255, 255, 255, 0.14)',
        }}
        aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
      >
        <Bookmark
          size={size - 1}
          className={isBookmarked ? 'fill-white text-white' : 'text-white/90'}
        />
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 min-h-[42px] rounded-lg text-sm font-semibold transition-colors ${className}`}
        style={{
          background: isBookmarked ? 'var(--accent)' : 'var(--bg-secondary)',
          color: isBookmarked ? '#FFFFFF' : 'var(--text-primary)',
          border: isBookmarked ? '1px solid var(--accent)' : '1px solid var(--border-color)',
        }}
        aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
      >
        <Bookmark
          size={size - 2}
          className={isBookmarked ? 'fill-white text-white' : 'text-[var(--accent)]'}
        />
        {showLabel && <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`p-2 rounded-lg transition-colors ${className}`}
      style={{
        color: isBookmarked ? 'var(--accent)' : 'var(--text-muted)',
        background: isBookmarked ? 'var(--accent-glow)' : 'transparent',
      }}
      aria-label={isBookmarked ? 'Remove from bookmarks' : 'Add to bookmarks'}
    >
      <Bookmark
        size={size}
        className={isBookmarked ? 'fill-current' : ''}
      />
    </button>
  );
}
