'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  List,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
  BookOpen,
  Loader2,
} from 'lucide-react';
import { getMangaBySlug, type Manga, type Chapter, type ChapterPage } from '@/lib/firestore';

interface ReaderPageProps {
  page: ChapterPage;
  totalPages: number;
  mangaTitle: string;
  chapterNumber: number;
  onVisible: (index: number) => void;
  index: number;
}

function ReaderPageImage({
  page,
  totalPages,
  mangaTitle,
  chapterNumber,
  onVisible,
  index,
}: ReaderPageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const figureRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = figureRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            onVisible(index);
          }
        }
      },
      { rootMargin: '120px 0px', threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onVisible]);

  const baseSrc = `/api/image/${encodeURIComponent(page.fileId)}`;
  const src = retryCount > 0 ? `${baseSrc}?retry=${retryCount}` : baseSrc;

  const handleRetry = () => {
    setStatus('loading');
    setRetryCount((prev) => prev + 1);
  };

  return (
    <figure
      ref={figureRef}
      data-page-index={index}
      className="relative w-full bg-[#131317] border-b border-white/5 last:border-b-0"
    >
      {status === 'loading' && (
        <div className="w-full min-h-[280px] sm:min-h-[420px] flex flex-col items-center justify-center gap-2 text-zinc-400">
          <Loader2 size={22} className="animate-spin text-[var(--accent)]" />
          <span className="font-mono-num text-xs">
            Loading page {page.pageNumber} / {totalPages}
          </span>
        </div>
      )}

      {status === 'error' ? (
        <div className="w-full min-h-[260px] flex flex-col items-center justify-center gap-3 px-4 py-12 text-center bg-[#141419]">
          <p className="text-sm font-medium text-zinc-200">
            Page {page.pageNumber} failed to load
          </p>
          <p className="text-xs text-zinc-400">
            Tap retry to reload this image from the CDN.
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            Retry Page {page.pageNumber}
          </button>
        </div>
      ) : (
        <img
          key={`${page.fileId}-${retryCount}`}
          src={src}
          alt={`${mangaTitle} Chapter ${chapterNumber} — Page ${page.pageNumber}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={`w-full h-auto block mx-auto ${
            status === 'loading' ? 'h-0 opacity-0' : 'opacity-100 transition-opacity duration-200'
          }`}
        />
      )}

      <figcaption className="py-1.5 px-3 text-center font-mono-num text-[11px] text-zinc-500 bg-[#0B0B0E]">
        {page.pageNumber} / {totalPages}
      </figcaption>
    </figure>
  );
}

export default function ChapterReaderPage() {
  const params = useParams<{ slug: string; chapter: string }>();
  const slug = typeof params?.slug === 'string' ? decodeURIComponent(params.slug) : '';
  const chapterParam = typeof params?.chapter === 'string' ? decodeURIComponent(params.chapter) : '';

  const [manga, setManga] = useState<Manga | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const preloadedFileIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setCurrentPageIdx(0);
    preloadedFileIds.current.clear();

    if (!slug) {
      setLoading(false);
      setError('Invalid manga slug.');
      return;
    }

    getMangaBySlug(slug)
      .then((data) => {
        if (!active) return;
        setManga(data);
        if (!data) {
          setError('Series not found.');
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error('[Reader] Failed to load manga:', err);
        setError('Unable to load this chapter right now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const targetChapterNum = Number(chapterParam);

  const rawChapters = manga?.chapters;
  const ascChapters = useMemo<Chapter[]>(() => {
    if (!rawChapters) return [];
    return [...rawChapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  }, [rawChapters]);

  const activeIndex = useMemo(() => {
    if (Number.isNaN(targetChapterNum)) return -1;
    return ascChapters.findIndex((ch) => ch.chapterNumber === targetChapterNum);
  }, [ascChapters, targetChapterNum]);

  const activeChapter = activeIndex >= 0 ? ascChapters[activeIndex] : null;
  const prevChapter = activeIndex > 0 ? ascChapters[activeIndex - 1] : null;
  const nextChapter =
    activeIndex >= 0 && activeIndex < ascChapters.length - 1
      ? ascChapters[activeIndex + 1]
      : null;

  const rawPages = activeChapter?.pages;
  const pages = useMemo<ChapterPage[]>(() => {
    if (!rawPages?.length) return [];
    return [...rawPages].sort((a, b) => a.pageNumber - b.pageNumber);
  }, [rawPages]);

  // Preload next 2 pages from current scroll position
  useEffect(() => {
    if (pages.length === 0 || typeof window === 'undefined') return;
    const targets = [pages[currentPageIdx + 1], pages[currentPageIdx + 2]].filter(
      (p): p is ChapterPage => Boolean(p && p.fileId)
    );

    for (const p of targets) {
      if (preloadedFileIds.current.has(p.fileId)) continue;
      preloadedFileIds.current.add(p.fileId);
      const img = new window.Image();
      img.decoding = 'async';
      img.src = `/api/image/${encodeURIComponent(p.fileId)}`;
    }
  }, [currentPageIdx, pages]);

  const handlePageVisible = useCallback((idx: number) => {
    setCurrentPageIdx((prev) => (prev === idx ? prev : idx));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center px-4">
        <Loader2 size={28} className="animate-spin text-[var(--accent)] mb-3" />
        <p className="text-sm text-zinc-400">Loading chapter...</p>
      </div>
    );
  }

  if (error || !manga) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center px-4 text-center">
        <BookOpen size={36} className="text-zinc-500 mb-3" />
        <h1 className="font-display text-2xl font-bold mb-2">Series Not Found</h1>
        <p className="text-sm text-zinc-400 mb-6">{error || 'Unable to find this manga.'}</p>
        <Link href="/browse" className="btn-accent inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={15} />
          Browse Catalog
        </Link>
      </div>
    );
  }

  if (manga.isAdult) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 mb-5 rounded-xl border border-red-500/30 bg-red-500/10 flex items-center justify-center">
          <ShieldAlert size={28} className="text-[var(--accent)]" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">18+ Restricted Content</h1>
        <p className="text-sm text-zinc-400 max-w-md mb-6">
          This series is marked as mature (18+) and is hidden while Family Mode is active.
        </p>
        <Link href={`/manga/${slug}`} className="btn-accent inline-flex items-center gap-2 text-sm">
          <ArrowLeft size={15} />
          Back to Series
        </Link>
      </div>
    );
  }

  if (!activeChapter) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col items-center justify-center px-4 text-center">
        <BookOpen size={36} className="text-zinc-500 mb-3" />
        <h1 className="font-display text-2xl font-bold mb-2">Chapter Not Found</h1>
        <p className="text-sm text-zinc-400 mb-6">
          Chapter {chapterParam} of {manga.title} could not be found.
        </p>
        <Link href={`/manga/${slug}`} className="btn-accent inline-flex items-center gap-2 text-sm">
          <List size={15} />
          All Chapters
        </Link>
      </div>
    );
  }

  const externalReadUrl =
    activeChapter.readLink &&
    /^https?:\/\//i.test(activeChapter.readLink)
      ? activeChapter.readLink
      : null;

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-white flex flex-col">
      {/* Top Sticky Reader Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#131317]/95 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/manga/${slug}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-zinc-100 transition-colors"
              title="All chapters"
            >
              <List size={14} />
              <span className="hidden sm:inline">All chapters</span>
            </Link>

            <div className="min-w-0">
              <p className="text-[11px] text-zinc-400 truncate">{manga.title}</p>
              <h1 className="text-xs sm:text-sm font-semibold text-white truncate">
                Ch. {activeChapter.chapterNumber}
                {activeChapter.title &&
                activeChapter.title.toLowerCase() !== `chapter ${activeChapter.chapterNumber}`
                  ? ` — ${activeChapter.title}`
                  : ''}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {pages.length > 0 && (
              <span className="font-mono-num text-[11px] text-zinc-400 px-2 hidden xs:inline sm:inline">
                {currentPageIdx + 1}/{pages.length}
              </span>
            )}

            {prevChapter ? (
              <Link
                href={`/read/${slug}/${prevChapter.chapterNumber}`}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 inline-flex items-center gap-1 transition-colors"
                aria-label={`Previous chapter ${prevChapter.chapterNumber}`}
              >
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </Link>
            ) : (
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-zinc-600 inline-flex items-center gap-1 cursor-not-allowed">
                <ChevronLeft size={14} />
                <span className="hidden sm:inline">Prev</span>
              </span>
            )}

            {nextChapter ? (
              <Link
                href={`/read/${slug}/${nextChapter.chapterNumber}`}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white inline-flex items-center gap-1 transition-colors"
                aria-label={`Next chapter ${nextChapter.chapterNumber}`}
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </Link>
            ) : (
              <span className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-zinc-600 inline-flex items-center gap-1 cursor-not-allowed">
                <span className="hidden sm:inline">Next</span>
                <ChevronRight size={14} />
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Reader Content */}
      <main className="flex-1 w-full">
        {pages.length > 0 ? (
          <div className="w-full max-w-3xl mx-auto px-0 sm:px-4 sm:py-4">
            <div className="flex flex-col">
              {pages.map((page, index) => (
                <ReaderPageImage
                  key={`${activeChapter.id}-${page.pageNumber}-${page.fileId}`}
                  page={page}
                  totalPages={pages.length}
                  mangaTitle={manga.title}
                  chapterNumber={activeChapter.chapterNumber}
                  onVisible={handlePageVisible}
                  index={index}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-lg mx-auto px-4 py-20 text-center">
            <div className="rounded-xl border border-white/10 bg-[#131317] p-6 sm:p-8">
              <ExternalLink size={28} className="mx-auto mb-3 text-[var(--accent)]" />
              <h2 className="font-display text-xl font-bold mb-2">
                External Chapter Source
              </h2>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                This chapter is hosted on an external source and does not have internal CDN pages yet.
              </p>
              {externalReadUrl ? (
                <a
                  href={externalReadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-accent inline-flex items-center gap-2 text-sm"
                >
                  Open External Source
                  <ExternalLink size={15} />
                </a>
              ) : (
                <p className="text-xs text-zinc-500">
                  No external read link is available for this chapter.
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Chapter Navigation */}
      <footer className="border-t border-white/10 bg-[#131317]">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between gap-3">
          {prevChapter ? (
            <Link
              href={`/read/${slug}/${prevChapter.chapterNumber}`}
              className="px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5 transition-colors"
            >
              <ChevronLeft size={16} />
              Ch. {prevChapter.chapterNumber}
            </Link>
          ) : (
            <div />
          )}

          <Link
            href={`/manga/${slug}`}
            className="px-3.5 py-2.5 rounded-lg text-xs sm:text-sm font-medium bg-white/5 hover:bg-white/15 text-zinc-300 inline-flex items-center gap-1.5 transition-colors"
          >
            <List size={15} />
            All chapters
          </Link>

          {nextChapter ? (
            <Link
              href={`/read/${slug}/${nextChapter.chapterNumber}`}
              className="btn-accent text-xs sm:text-sm px-3.5 py-2.5 inline-flex items-center gap-1.5"
            >
              Ch. {nextChapter.chapterNumber}
              <ChevronRight size={16} />
            </Link>
          ) : (
            <div />
          )}
        </div>
      </footer>
    </div>
  );
}
