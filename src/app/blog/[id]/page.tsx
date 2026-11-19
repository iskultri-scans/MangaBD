'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { getAnnouncementById, getAllGenres, type Announcement, type Genre } from '@/lib/firestore';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Clock, Megaphone, Zap, ArrowRight } from 'lucide-react';

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

export default function BlogPostPage() {
  const params = useParams();
  const id = params.id as string;
  const [post, setPost] = useState<Announcement | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postData, genresData] = await Promise.all([
          getAnnouncementById(id),
          getAllGenres(),
        ]);
        setPost(postData);
        setGenres(genresData);
      } catch (error) {
        console.error('Error fetching blog post:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const genreSlugs = genres.map((g) => ({ name: g.name, slug: g.slug }));

  if (loading) {
    return (
      <PublicLayout genres={[]}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
          <div className="skeleton h-6 w-28 rounded mb-6" />
          <div className="skeleton h-64 rounded-xl mb-6" />
          <div className="skeleton h-10 w-3/4 rounded mb-4" />
          <div className="skeleton h-5 w-1/2 rounded mb-8" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton h-4 rounded" />
            ))}
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!post) {
    return (
      <PublicLayout genres={genreSlugs}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">
            Dispatch Not Found
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            This editorial post may have been archived or removed.
          </p>
          <Link href="/blog" className="btn-accent inline-block text-sm">
            Back to News &amp; Blog
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const config = typeConfig[post.type] || typeConfig.announcement;
  const IconComp = config.icon;

  return (
    <PublicLayout genres={genreSlugs}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors mb-6"
        >
          <ArrowLeft size={14} />
          Back to News &amp; Blog
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {post.coverImage && (
            <div className="relative h-52 sm:h-72 md:h-80 rounded-xl overflow-hidden mb-6 border border-[var(--border-color)] bg-[var(--bg-subtle)]">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-semibold uppercase tracking-wider ${config.badgeClass}`}
            >
              <IconComp size={12} />
              {config.label}
            </span>
            {post.createdAt && (
              <span className="font-mono-num text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                <Clock size={13} />
                {new Date(post.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'UTC',
                })}
              </span>
            )}
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)] mb-2 leading-tight">
            {post.title || post.titleBn}
          </h1>
          {post.titleBn && post.title && (
            <p className="text-base text-[var(--text-muted)] mb-6">{post.titleBn}</p>
          )}

          <div className="pt-6 mt-6 border-t border-[var(--border-color)]">
            <div className="text-[var(--text-secondary)] text-[15px] leading-relaxed whitespace-pre-wrap">
              {post.content || post.contentBn}
            </div>
          </div>

          {post.mangaId && (
            <div className="mt-8 p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1">
                  Related Series
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  Explore the full series record and external chapters.
                </p>
              </div>
              <Link
                href={`/manga/${post.mangaId}`}
                className="btn-accent inline-flex items-center gap-1.5 text-xs whitespace-nowrap"
              >
                View Series <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </motion.article>
      </div>
    </PublicLayout>
  );
}
