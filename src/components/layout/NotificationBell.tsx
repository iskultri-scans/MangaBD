'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Check,
  ExternalLink,
  BookOpen,
  Megaphone,
  FileText,
  X,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { SITE_CONFIG } from '@/lib/config';

interface NotificationBellProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function NotificationBell({ isOpen, onToggle, onClose }: NotificationBellProps) {
  const { notifications, unreadCount, loading, isRead, markAsRead, markAllAsRead, refreshNotifications } =
    useNotifications();
  const [internalOpen, setInternalOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const closePanel = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };
  const togglePanel = () => {
    if (onToggle) onToggle();
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const getIcon = (type: string) => {
    if (type === 'new_manga') return <BookOpen size={15} className="text-[var(--accent)]" />;
    if (type === 'new_chapter') return <FileText size={15} className="text-[var(--accent)]" />;
    return <Megaphone size={15} className="text-[var(--accent)]" />;
  };

  const getTypeLabel = (type: string) => {
    if (type === 'new_manga') return 'New Series';
    if (type === 'new_chapter') return 'Chapter Drop';
    return 'Announcement';
  };

  const visibleNotifications =
    tab === 'unread' ? notifications.filter((n) => !isRead(n.id)) : notifications;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors relative cursor-pointer ${
          open
            ? 'text-[var(--accent)] bg-[var(--accent-glow)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-md flex items-center justify-center font-mono-num text-[10px] font-bold text-white leading-none"
            style={{ background: 'var(--accent)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/35 sm:bg-transparent"
            onClick={closePanel}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-label="Notifications panel"
            className="fixed left-3 right-3 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 rounded-xl overflow-hidden shadow-2xl z-[80]"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold"
                    style={{ background: 'var(--accent-glow)', color: 'var(--accent)' }}
                  >
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="px-2 py-1 rounded text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-glow)] flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Check size={12} />
                    Mark all
                  </button>
                )}
                <button
                  type="button"
                  onClick={refreshNotifications}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  aria-label="Refresh notifications"
                  title="Refresh"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={closePanel}
                  className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div
              className="flex items-center gap-1 px-3 py-2 border-b"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            >
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'all'
                    ? 'text-[var(--text-primary)] bg-[var(--bg-secondary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                All <span className="font-mono-num">({notifications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('unread')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                  tab === 'unread'
                    ? 'text-[var(--accent)] bg-[var(--bg-secondary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Unread <span className="font-mono-num">({unreadCount})</span>
              </button>
            </div>

            {/* Notification Items */}
            <div
              className="max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y"
              style={{ borderColor: 'var(--border-color)' }}
            >
              {visibleNotifications.length === 0 ? (
                <div className="p-7 text-center">
                  <Bell size={22} className="mx-auto text-[var(--text-muted)] mb-2" />
                  <p className="text-xs font-medium text-[var(--text-secondary)]">
                    {tab === 'unread' ? 'All caught up — no unread alerts' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                visibleNotifications.map((notif) => {
                  const unread = !isRead(notif.id);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className="relative flex items-start gap-3 p-3.5 hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                      style={{
                        background: unread ? 'var(--accent-glow)' : 'transparent',
                      }}
                    >
                      {unread && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-[var(--accent)]"
                          aria-hidden="true"
                        />
                      )}
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                        }}
                      >
                        {getIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                            {getTypeLabel(notif.type)}
                          </span>
                          {unread && (
                            <span className="text-[10px] font-medium text-[var(--text-muted)]">
                              Unread
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {notif.title || notif.titleBn}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.message || notif.messageBn}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {notif.mangaSlug ? (
                            <Link
                              href={`/manga/${notif.mangaSlug}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                                closePanel();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                            >
                              <ExternalLink size={11} />
                              Open series
                            </Link>
                          ) : (
                            <Link
                              href="/blog"
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notif.id);
                                closePanel();
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                            >
                              <ExternalLink size={11} />
                              Read dispatch
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div
              className="px-4 py-2.5 border-t flex items-center justify-between text-xs"
              style={{ borderColor: 'var(--border-color)', background: 'var(--bg-primary)' }}
            >
              <Link
                href="/blog"
                onClick={closePanel}
                className="font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                All Dispatches
              </Link>
              <a
                href={SITE_CONFIG.social.telegram}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closePanel}
                className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
              >
                <Send size={11} />
                Telegram Alerts
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
