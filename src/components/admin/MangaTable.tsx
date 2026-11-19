'use client';

import React from 'react';
import Image from 'next/image';
import { Edit, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';
import type { Manga } from '@/lib/firestore';

interface MangaTableProps {
  manga: Manga[];
  onDelete: (manga: Manga) => void;
  loading?: boolean;
}

export function MangaTable({ manga, onDelete, loading = false }: MangaTableProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (manga.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-muted)]">
        <Search size={32} className="mx-auto mb-3" />
        <p className="text-sm">No manga found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Cover</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Title</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Language</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Status</th>
            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Rating</th>
            <th className="text-right py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {manga.map((m) => (
            <tr
              key={m.id}
              className="border-b last:border-0 border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <td className="py-2.5 px-4">
                <div className="relative w-10 h-14 rounded overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <Image
                    src={m.coverImage || FALLBACK_COVER_ASSET.src}
                    alt={m.title}
                    fill
                    className="object-cover"
                    unoptimized={true}
                  />
                </div>
              </td>
              <td className="py-2.5 px-4 text-[var(--text-primary)] font-medium">{m.title}</td>
              <td className="py-2.5 px-4">
                <Badge variant={m.language === 'en' ? 'en' : 'bn'}>{m.language.toUpperCase()}</Badge>
              </td>
              <td className="py-2.5 px-4">
                <Badge variant="status">{m.status}</Badge>
              </td>
              <td className="py-2.5 px-4 font-mono-num text-[var(--text-primary)]">
                {m.rating.toFixed(1)}
              </td>
              <td className="py-2.5 px-4">
                <div className="flex items-center justify-end gap-1.5">
                  <Link
                    href={`/admin/manga/edit/${m.id}`}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    aria-label={`Edit ${m.title}`}
                  >
                    <Edit size={15} />
                  </Link>
                  <button
                    onClick={() => onDelete(m)}
                    className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    aria-label={`Delete ${m.title}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
