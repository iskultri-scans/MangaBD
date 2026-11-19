'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { StatsCards } from '@/components/admin/StatsCards';
import { getStats, type Manga } from '@/lib/firestore';
import { publishDemoCatalogToFirestore } from '@/lib/demo-seed';
import { useToast } from '@/components/ui/Toast';
import { PlusCircle, Tags, Database } from 'lucide-react';

export default function AdminDashboard() {
  const { showToast } = useToast();
  const [stats, setStats] = useState({ total: 0, en: 0, bn: 0, ongoing: 0, completed: 0, recent: [] as Manga[] });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const loadStats = () => {
    setLoading(true);
    getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handlePublishDemo = async () => {
    setSeeding(true);
    try {
      const result = await publishDemoCatalogToFirestore();
      showToast(
        `Published ${result.manga} series, ${result.chapters} chapters, and ${result.announcements} journal dispatches to Firestore.`,
        'success'
      );
      loadStats();
    } catch (error) {
      console.error('Failed to publish demo catalog:', error);
      showToast('Failed to publish demo posts. Ensure you are signed in as admin.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        subtitle="Overview of your MangaBD catalog and recent updates"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handlePublishDemo}
              disabled={seeding}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Database size={15} className="text-[var(--accent)]" />
              {seeding ? 'Publishing...' : 'Publish Demo Posts'}
            </button>
            <Link href="/admin/manga/add" className="btn-accent inline-flex items-center gap-2 text-sm">
              <PlusCircle size={15} /> Add Manga
            </Link>
            <Link
              href="/admin/genres"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              <Tags size={15} />
              Genres
            </Link>
          </div>
        }
      />

      <StatsCards stats={stats} />

      {/* Recent Manga */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-4">
          Recent Series
        </h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : stats.recent.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6">
            <p className="text-sm text-[var(--text-secondary)] mb-3">
              No series have been saved to Firestore yet. The public site is currently displaying built-in demo posts.
            </p>
            <button
              type="button"
              onClick={handlePublishDemo}
              disabled={seeding}
              className="btn-accent inline-flex items-center gap-2 text-xs cursor-pointer"
            >
              <Database size={14} />
              {seeding ? 'Publishing to Firestore...' : 'Publish Demo Posts to Firestore'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Title</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Status</th>
                  <th className="text-left py-3 px-4 text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition-colors">
                    <td className="py-3 px-4 font-medium text-[var(--text-primary)]">
                      <Link href={`/admin/manga/edit/${m.id}`} className="hover:text-[var(--accent)] transition-colors">
                        {m.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-secondary)] capitalize">{m.status}</td>
                    <td className="py-3 px-4 font-mono-num text-xs text-[var(--text-muted)]">
                      {m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
