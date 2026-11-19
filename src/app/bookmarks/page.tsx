'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Star, Trash2, LogIn, BookOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useBookmarks } from '@/context/BookmarkContext';
import { getAllGenres, type Genre, type Manga } from '@/lib/firestore';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { FALLBACK_COVER_ASSET } from '@/lib/assets';

export default function BookmarksPage() {
  const { user } = useAuth();
  const { bookmarks, loading, toggleBookmark } = useBookmarks();
  const [genres, setGenres] = useState<Genre[]>([]);

  useEffect(() => {
    getAllGenres().then(setGenres).catch(console.error);
  }, []);

  return (
    <PublicLayout genres={genres}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pb-6 mb-8 border-b border-[var(--border-color)]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)] mb-1.5">
                Personal Reading Shelf
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
                My Bookmarks
              </h1>
            </div>
            <p className="font-mono-num text-xs text-[var(--text-muted)]">
              {loading ? 'Loading shelf...' : `${bookmarks.length} series saved`}
            </p>
          </div>

          {/* Sync Banner */}
          {!user && bookmarks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-5 px-4 py-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-3"
            >
              <LogIn size={16} className="text-[var(--accent)] flex-shrink-0" />
              <p className="text-sm text-[var(--text-secondary)]">
                <Link href="/login" className="text-[var(--accent)] font-semibold hover:underline">
                  Sign in
                </Link>{' '}
                to sync your saved reading shelf across devices.
              </p>
            </motion.div>
          )}
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton rounded-lg"
                style={{ aspectRatio: '3/4' }}
              />
            ))}
          </div>
        ) : bookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-center py-20 px-6"
          >
            <div className="w-14 h-14 rounded-lg bg-[var(--accent-glow)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-5">
              <Bookmark size={24} className="text-[var(--accent)]" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
              No Bookmarks Yet
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-md mx-auto">
              Save your favorite series here for quick access. Click the bookmark button on any cover or detail page to add it to your shelf.
            </p>
            <Link
              href="/browse"
              className="btn-accent inline-flex items-center gap-2 text-sm"
            >
              <BookOpen size={16} />
              Browse Catalog
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 sm:gap-x-5">
            <AnimatePresence mode="popLayout">
              {bookmarks.map((bm, index) => (
                <motion.div
                  key={bm.mangaId}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.25, delay: index * 0.025 }}
                  className="group"
                >
                  <Link href={`/manga/${bm.slug}`} className="block">
                    <div className="relative rounded-lg overflow-hidden border border-[var(--border-color)] bg-[var(--bg-subtle)]" style={{ aspectRatio: '3/4' }}>
                      <Image
                        src={bm.coverImage || FALLBACK_COVER_ASSET.src}
                        alt={bm.title}
                        fill
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        unoptimized={true}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_COVER_ASSET.src;
                        }}
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleBookmark({
                            id: bm.mangaId,
                            title: bm.title,
                            titleBn: bm.titleBn,
                            slug: bm.slug,
                            description: '',
                            coverImage: bm.coverImage,
                            genres: bm.genres,
                            author: '',
                            artist: '',
                            status: bm.status,
                            rating: bm.rating,
                            totalChapters: bm.totalChapters,
                            language: bm.language,
                            featured: false,
                            trending: false,
                            createdAt: null as unknown as Manga['createdAt'],
                            updatedAt: null as unknown as Manga['updatedAt'],
                          });
                        }}
                        className="absolute top-2.5 right-2.5 z-20 w-8 h-8 flex items-center justify-center rounded-lg bg-black/70 text-white hover:bg-[var(--accent)] transition-colors"
                        aria-label="Remove bookmark"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="pt-2.5">
                      <h3 className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug group-hover:text-[var(--accent)] transition-colors">
                        {bm.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                        <span className="inline-flex items-center gap-1 font-mono-num text-[var(--text-secondary)] font-medium">
                          <Star size={11} className="text-amber-500 fill-amber-500" />
                          {bm.rating.toFixed(1)}
                        </span>
                        <span>·</span>
                        <span className="font-mono-num">Ch. {bm.totalChapters}</span>
                        <span>·</span>
                        <span className="capitalize">{bm.status}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
