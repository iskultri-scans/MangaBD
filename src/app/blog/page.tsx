'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getAllAnnouncements, getAllGenres, type Announcement, type Genre } from '@/lib/firestore';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Megaphone, Zap, Clock } from 'lucide-react';

const typeConfig = {
  announcement: {
    icon: Megaphone,
    label: 'Announcement',
    badgeClass: 'text-[var(--accent)] bg-[var(--accent-glow)] border-[var(--border-color)]',
  },
  upcoming: {
    icon: Calendar,
    label: 'Upcoming',
    badgeClass: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  update: {
    icon: Zap,
    label: 'Release',
    badgeClass: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
};

export default function BlogPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchData() {
      try {
        const [announcementsData, genresData] = await Promise.all([
          getAllAnnouncements(),
          getAllGenres(),
        ]);
        setAnnouncements(announcementsData);
        setGenres(genresData);
      } catch (error) {
        console.error('Error fetching blog data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));

  const filtered = filter === 'all'
    ? announcements
    : announcements.filter((a) => a.type === filter);

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="pb-6 mb-6 border-b border-[var(--border-color)]"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
            Journal &amp; Dispatches
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            News &amp; Blog
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Platform dispatches, release schedules, and editorial announcements.
          </p>
        </motion.header>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
          {[
            { value: 'all', label: 'All Dispatches' },
            { value: 'update', label: 'Releases' },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'announcement', label: 'Announcements' },
          ].map((tab) => {
            const active = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className={`px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border ${
                  active
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Blog Posts */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-44 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center py-16 px-6">
            <Megaphone size={36} className="mx-auto text-[var(--text-muted)] mb-3" strokeWidth={1.6} />
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)] mb-1">
              No Dispatches Found
            </h3>
            <p className="text-sm text-[var(--text-muted)]">No editorial updates yet. Check back soon.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((post, index) => {
              const config = typeConfig[post.type] || typeConfig.announcement;
              const IconComp = config.icon;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <Link href={`/blog/${post.id}`} className="block group">
                    <article className="rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-colors">
                      {post.coverImage && (
                        <div className="relative h-48 sm:h-56 overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-subtle)]">
                          <img
                            src={post.coverImage}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}

                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold uppercase tracking-wider ${config.badgeClass}`}
                          >
                            <IconComp size={12} />
                            {config.label}
                          </span>
                          {post.createdAt && (
                            <span className="font-mono-num text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                              <Clock size={12} />
                              {new Date(post.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC',
                              })}
                            </span>
                          )}
                        </div>

                        <h2 className="font-display text-xl font-bold tracking-tight text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors">
                          {post.title || post.titleBn}
                        </h2>
                        {post.titleBn && post.title && (
                          <p className="text-sm text-[var(--text-muted)] mb-2">{post.titleBn}</p>
                        )}

                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-4 leading-relaxed">
                          {post.content || post.contentBn}
                        </p>

                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
                          Read Dispatch <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
