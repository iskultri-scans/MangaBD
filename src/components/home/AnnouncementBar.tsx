'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { Announcement } from '@/lib/firestore';

interface AnnouncementBarProps {
  announcements: Announcement[];
  loading?: boolean;
}

const typeLabel: Record<string, string> = {
  announcement: 'Update',
  upcoming: 'Upcoming',
  update: 'New Release',
};

export function AnnouncementBar({ announcements, loading = false }: AnnouncementBarProps) {
  if (loading) {
    return (
      <div className="py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-10 w-64 rounded-lg shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (announcements.length === 0) return null;

  return (
    <div className="py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] shrink-0 pr-1">
          Dispatches
        </span>
        {announcements.map((announcement) => {
          const label = typeLabel[announcement.type] || 'Update';
          return (
            <Link
              key={announcement.id}
              href={`/blog/${announcement.id}`}
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg whitespace-nowrap transition-colors hover:border-[var(--accent)] group shrink-0"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                {label}
              </span>
              <span className="text-[var(--text-muted)]" aria-hidden="true">·</span>
              <span className="text-xs sm:text-sm text-[var(--text-primary)] font-medium max-w-[220px] truncate">
                {announcement.title || announcement.titleBn}
              </span>
              <ChevronRight
                size={14}
                className="text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors shrink-0"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
