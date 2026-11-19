'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, LogOut, ChevronDown, Bookmark, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TelegramConnectCard } from './TelegramConnectCard';

interface UserMenuProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function UserMenu({ isOpen, onToggle, onClose }: UserMenuProps) {
  const { user, isAdmin, signOut } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const closeMenu = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };
  const toggleMenu = () => {
    if (onToggle) onToggle();
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[38px] rounded-lg text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors whitespace-nowrap"
      >
        <UserIcon size={13} />
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 px-2 min-h-[40px] rounded-lg hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
      >
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
        >
          {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <ChevronDown
          size={12}
          className={`text-[var(--text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-transparent"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 rounded-xl overflow-hidden shadow-2xl z-[80]"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user.displayName || 'Reader'}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] truncate">{user.email}</p>
            </div>

            <div className="p-2 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <TelegramConnectCard />
            </div>

            <div className="p-1.5 space-y-0.5">
              <Link
                href="/bookmarks"
                onClick={closeMenu}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <Bookmark size={14} />
                My Bookmarks
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                >
                  <Shield size={14} />
                  Admin Console
                </Link>
              )}

              <button
                type="button"
                onClick={async () => {
                  closeMenu();
                  await signOut();
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors w-full text-left cursor-pointer"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
