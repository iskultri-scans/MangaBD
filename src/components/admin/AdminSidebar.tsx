'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Tags,
  LogOut,
  FilePlus,
  Megaphone,
  Clock,
  MessageSquare,
  MoreHorizontal,
  X,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface AdminSidebarProps {
  onSignOut?: () => void;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/manga', label: 'All Manga', icon: BookOpen },
  { href: '/admin/manga/add', label: 'Add Manga', icon: PlusCircle },
  { href: '/admin/chapters', label: 'Post Chapter', icon: FilePlus },
  { href: '/admin/telegram', label: 'Telegram Broadcast', icon: Send },
  { href: '/admin/genres', label: 'Genres', icon: Tags },
  { href: '/admin/blog', label: 'Blog / Announcements', icon: Megaphone },
  { href: '/admin/upcoming', label: 'Upcoming Releases', icon: Clock },
  { href: '/admin/requests', label: 'User Requests', icon: MessageSquare },
];

const mobileNavItems = [
  { href: '/admin', label: 'Home', icon: LayoutDashboard },
  { href: '/admin/manga', label: 'Manga', icon: BookOpen },
  { href: '/admin/manga/add', label: 'Add', icon: PlusCircle },
  { href: '/admin/chapters', label: 'Chapter', icon: FilePlus },
  { href: '/admin/telegram', label: 'Telegram', icon: Send },
];

const moreNavItems = [
  { href: '/admin/blog', label: 'Blog & News', icon: Megaphone },
  { href: '/admin/genres', label: 'Genres', icon: Tags },
  { href: '/admin/upcoming', label: 'Upcoming', icon: Clock },
  { href: '/admin/requests', label: 'Requests', icon: MessageSquare },
];

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href));

  const isMoreActive = moreNavItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="px-6 py-5 border-b border-[var(--border-color)]">
          <Link
            href="/admin"
            className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] inline-block"
          >
            Manga<span className="text-[var(--accent)]">BD</span>
          </Link>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mt-1">
            Editorial Console
          </p>
        </div>

        <nav className="flex-1 p-3.5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'admin-nav-item flex items-center gap-3 text-sm',
                  active && 'active'
                )}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3.5 border-t border-[var(--border-color)]">
          <button
            onClick={onSignOut}
            className="admin-nav-item flex items-center gap-3 text-sm w-full text-left text-red-600 dark:text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--border-color)] bg-[var(--bg-secondary)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {mobileNavItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center py-2.5 px-2 min-w-[48px] transition-colors"
              style={{
                color: active ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <item.icon size={18} />
              <span className="text-[10px] font-medium mt-0.5 leading-tight">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex flex-col items-center justify-center py-2.5 px-2 min-w-[48px] transition-colors"
          style={{
            color: isMoreActive ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {moreOpen ? <X size={18} /> : <MoreHorizontal size={18} />}
          <span className="text-[10px] font-medium mt-0.5 leading-tight">{moreOpen ? 'Close' : 'More'}</span>
        </button>
      </nav>

      {/* Mobile More Menu Overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="lg:hidden fixed bottom-16 left-3 right-3 z-50 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="p-3 space-y-1">
                {moreNavItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        'admin-nav-item flex items-center gap-3 text-sm',
                        active && 'active'
                      )}
                    >
                      <item.icon size={16} />
                      {item.label}
                    </Link>
                  );
                })}

                <div className="pt-2 border-t border-[var(--border-color)]">
                  <button
                    onClick={() => { setMoreOpen(false); onSignOut?.(); }}
                    className="admin-nav-item flex items-center gap-3 text-sm w-full text-left text-red-600 dark:text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
