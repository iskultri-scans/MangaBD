'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/utils';
import { CustomDropdown, type DropdownOption } from '@/components/ui/CustomDropdown';
import { Clock, CheckCircle, Pause, Globe, Search, Sparkles, X, Loader2, ShieldAlert } from 'lucide-react';
import {
  searchMangaJikan,
  getMangaDetailJikan,
  jikanToAutoFill,
  type JikanMangaSearchResult,
  type AutoFillData,
  type MetadataSource,
} from '@/lib/jikan';
import type { Manga } from '@/lib/firestore';

interface MangaFormProps {
  initialData?: Partial<Manga>;
  initialTitle?: string;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  genres: { name: string; slug: string }[];
  loading?: boolean;
  submitLabel?: string;
}

const statusOptions: DropdownOption[] = [
  { value: 'ongoing', label: 'Ongoing', icon: <Clock size={14} className="text-emerald-500" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle size={14} className="text-sky-500" /> },
  { value: 'hiatus', label: 'Hiatus', icon: <Pause size={14} className="text-amber-500" /> },
];

const languageOptions: DropdownOption[] = [
  { value: 'en', label: 'English (EN)', icon: <Globe size={14} /> },
  { value: 'bn', label: 'Bengali (BN)', icon: <Globe size={14} /> },
];

const sourceOptions: { id: 'auto' | MetadataSource; label: string }[] = [
  { id: 'auto', label: 'Auto (MAL → AniList → MangaDex)' },
  { id: 'mal', label: 'MyAnimeList' },
  { id: 'anilist', label: 'AniList' },
  { id: 'mangadex', label: 'MangaDex' },
];

function buildFormFromInitial(initialData?: Partial<Manga>, initialTitle?: string) {
  const title = initialData?.title || initialTitle || '';
  return {
    title,
    titleBn: initialData?.titleBn || '',
    slug: initialData?.slug || (title ? slugify(title) : ''),
    description: initialData?.description || '',
    coverImage: initialData?.coverImage || '',
    bannerImage: initialData?.bannerImage || '',
    genres: initialData?.genres || [],
    author: initialData?.author || '',
    artist: initialData?.artist || '',
    status: initialData?.status || 'ongoing',
    rating: initialData?.rating || 0,
    totalChapters: initialData?.totalChapters || 0,
    language: initialData?.language || 'en',
    featured: initialData?.featured || false,
    trending: initialData?.trending || false,
    isAdult: initialData?.isAdult || false,
  };
}

function sourceBadgeLabel(source?: MetadataSource): string {
  if (source === 'anilist') return 'AniList';
  if (source === 'mangadex') return 'MangaDex';
  return 'MAL';
}

export function MangaForm({
  initialData,
  initialTitle,
  onSubmit,
  genres,
  loading = false,
  submitLabel = 'Save',
}: MangaFormProps) {
  const isAddMode = !initialData?.id;
  const [form, setForm] = useState(() => buildFormFromInitial(initialData, initialTitle));
  const [autoSlug, setAutoSlug] = useState(() => !initialData?.slug);

  const [searchQuery, setSearchQuery] = useState(() => initialTitle || '');
  const [preferredSource, setPreferredSource] = useState<'auto' | MetadataSource>('auto');
  const [searchResults, setSearchResults] = useState<JikanMangaSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(() => isAddMode);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced inline auto-fill trigger when typing in Title (EN) or Search input
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutoSearchRef = useRef(false);

  const runSearch = async (query: string, sourceOverride?: 'auto' | MetadataSource) => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchMessage(null);
      setHasSearched(false);
      return;
    }

    const activeSource = sourceOverride ?? preferredSource;
    setSearching(true);
    setSearchMessage(null);
    setHasSearched(true);

    try {
      const results = await searchMangaJikan(
        trimmed,
        8,
        activeSource === 'auto' ? undefined : activeSource
      );
      setSearchResults(results);
      if (results.length === 0) {
        setSearchMessage('No metadata match found. Try another source or fill fields manually below.');
      }
    } catch {
      setSearchResults([]);
      setSearchMessage('Metadata lookup unavailable right now — manual entry works normally.');
    } finally {
      setSearching(false);
    }
  };

  // Trigger initial search if navigated with ?q=
  useEffect(() => {
    if (initialTitle && initialTitle.trim().length >= 2) {
      runSearch(initialTitle);
    }
  }, [initialTitle]);

  // Debounced auto-search when typing in the search bar
  useEffect(() => {
    if (!showSearch) return;
    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }
    if (searchQuery.trim().length < 3) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      runSearch(searchQuery);
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery, preferredSource, showSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'title' && autoSlug) {
        updated.slug = slugify(value);
      }
      return updated;
    });

    // When adding a new manga and user types in Title (EN), sync searchQuery so auto-fill suggestions appear automatically
    if (name === 'title' && isAddMode && !autoFillSource && value.trim().length >= 3) {
      setShowSearch(true);
      setSearchQuery(value);
    }
  };

  const handleGenreToggle = (genreName: string) => {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genreName)
        ? prev.genres.filter((g) => g !== genreName)
        : [...prev.genres, genreName],
    }));
  };

  const handleCheckbox = (name: string, checked: boolean) => {
    setForm((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  const resultKey = (r: JikanMangaSearchResult, idx: number) =>
    `${r.source || 'mal'}-${r.sourceId || r.mal_id}-${idx}`;

  const handleAutoFill = async (item: JikanMangaSearchResult, itemKey: string) => {
    setSelectedKey(itemKey);
    setSearching(true);
    try {
      const src: MetadataSource = item.source || 'mal';
      const detailId = item.sourceId || item.mal_id;
      const detail = (await getMangaDetailJikan(detailId, src)) || item;

      const autoFillData: AutoFillData = jikanToAutoFill(detail);

      // Map fetched genres to local catalog genre names case-insensitively where possible
      const localGenreByLower = new Map(genres.map((g) => [g.name.toLowerCase(), g.name]));
      const mappedGenres = Array.from(
        new Set(
          autoFillData.genres.map((g) => localGenreByLower.get(g.toLowerCase()) || g)
        )
      );

      skipNextAutoSearchRef.current = true;
      setForm((prev) => ({
        ...prev,
        title: autoFillData.title,
        slug: autoSlug ? autoFillData.slug : prev.slug || autoFillData.slug,
        description: autoFillData.description || prev.description,
        coverImage: autoFillData.coverImage || prev.coverImage,
        bannerImage: autoFillData.bannerImage || prev.bannerImage,
        genres: mappedGenres.length > 0 ? mappedGenres : prev.genres,
        author: autoFillData.author || prev.author,
        artist: autoFillData.artist || prev.artist,
        status: autoFillData.status,
        rating: autoFillData.rating || prev.rating,
        totalChapters: autoFillData.totalChapters || prev.totalChapters,
      }));

      setAutoFillSource(`${sourceBadgeLabel(src)} #${detailId}`);
      setSearchResults([]);
      setSearchMessage(null);
      setHasSearched(false);
    } catch (error) {
      console.error('Auto-fill failed:', error);
      setSearchMessage('Could not apply metadata — you can still fill fields manually.');
    } finally {
      setSearching(false);
      setSelectedKey(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch(searchQuery);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-colors border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)]';
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5';

  const statusLabel = (s: string | null) => {
    if (s === 'Publishing') return 'Ongoing';
    if (s === 'Finished') return 'Completed';
    if (s === 'On Hiatus') return 'Hiatus';
    return s || 'Unknown';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full max-w-full sm:max-w-2xl">
      {/* Auto-Fill Metadata (MAL -> AniList -> MangaDex) */}
      <div className="rounded-xl p-4 sm:p-5 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Auto-Fill Manga Metadata
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              MAL · AniList · MangaDex
            </span>
          </div>
          {autoFillSource && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono-num text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Filled: {autoFillSource}
              </span>
              <button
                type="button"
                onClick={() => setAutoFillSource(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Clear auto-fill badge"
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {!showSearch ? (
          <button
            type="button"
            onClick={() => setShowSearch(true)}
            className="btn-accent flex items-center gap-2 text-sm w-full justify-center cursor-pointer"
          >
            <Search size={15} />
            Search Manga &amp; Auto-Fill
          </button>
        ) : (
          <div className="space-y-3">
            {/* Provider Selector Pills */}
            <div className="flex flex-wrap gap-1.5">
              {sourceOptions.map((opt) => {
                const active = preferredSource === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPreferredSource(opt.id);
                      if (searchQuery.trim().length >= 2) {
                        runSearch(searchQuery, opt.id);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Type manga name... e.g. Solo Leveling, One Piece"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="button"
                onClick={() => runSearch(searchQuery)}
                disabled={searching || searchQuery.trim().length < 2}
                className="btn-accent text-sm flex items-center gap-1.5 cursor-pointer"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSearch(false);
                  setSearchResults([]);
                  setSearchMessage(null);
                }}
                className="px-3 py-2.5 rounded-lg text-sm border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                aria-label="Collapse metadata search"
              >
                <X size={14} />
              </button>
            </div>

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {searchResults.map((result, idx) => {
                      const key = resultKey(result, idx);
                      const isFilling = searching && selectedKey === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleAutoFill(result, key)}
                          disabled={isFilling}
                          className="w-full flex items-start gap-3 p-3 rounded-lg text-left border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors cursor-pointer"
                          style={{ opacity: isFilling ? 0.6 : 1 }}
                        >
                          <div className="flex-shrink-0 w-10 h-14 rounded overflow-hidden bg-[var(--bg-subtle)]">
                            <img
                              src={result.images?.webp?.image_url || result.images?.jpg?.image_url || ''}
                              alt={result.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                {result.title}
                              </p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] font-mono-num shrink-0">
                                {sourceBadgeLabel(result.source)}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)] mt-0.5">
                              {result.type && <span>{result.type}</span>}
                              <span>· {statusLabel(result.status)}</span>
                              {result.chapters && <span className="font-mono-num">· {result.chapters} ch</span>}
                              {result.score && <span className="font-mono-num text-amber-500">★ {result.score}</span>}
                            </div>
                            {result.authors?.length > 0 && (
                              <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                                {result.authors.map((a) => a.name).join(', ')}
                              </p>
                            )}
                            <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                              {result.synopsis?.replace(/<[^>]+>/g, '').replace(/\[Written by MAL Rewrite\]/g, '').trim() || 'No description'}
                            </p>
                          </div>

                          {isFilling && (
                            <Loader2 size={14} className="animate-spin text-[var(--accent)] flex-shrink-0 mt-1" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
                    Click any result to auto-fill cover, genres, synopsis, author, artist &amp; status
                  </p>
                </motion.div>
              )}

              {searching && searchResults.length === 0 && (
                <div className="flex items-center justify-center py-5 gap-2">
                  <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)]">Searching manga metadata...</span>
                </div>
              )}

              {!searching && hasSearched && searchResults.length === 0 && (
                <p className="text-xs text-[var(--text-muted)] text-center py-3">
                  {searchMessage || 'No results found. Try a different search term.'}
                </p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Title EN with quick inline Auto-Fill trigger */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Title (EN) *
          </label>
          {form.title.trim().length >= 2 && (
            <button
              type="button"
              onClick={() => {
                setShowSearch(true);
                setSearchQuery(form.title);
                runSearch(form.title);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
            >
              <Sparkles size={11} />
              Auto-fill from title
            </button>
          )}
        </div>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          className={inputClass}
          placeholder="e.g. One Piece — typing auto-searches metadata above"
        />
      </div>

      {/* Alternate / Local Title */}
      <div>
        <label className={labelClass}>Alternate / Local Title (Optional)</label>
        <input name="titleBn" value={form.titleBn} onChange={handleChange} className={inputClass} placeholder="Optional alternate or regional title" />
      </div>

      {/* Slug */}
      <div>
        <label className={labelClass}>Slug *</label>
        <div className="flex gap-2">
          <input name="slug" value={form.slug} onChange={handleChange} required className={inputClass} placeholder="one-piece" />
          <button
            type="button"
            onClick={() => setAutoSlug(!autoSlug)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors cursor-pointer ${
              autoSlug
                ? 'border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]'
                : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)]'
            }`}
          >
            {autoSlug ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea name="description" value={form.description} onChange={handleChange} rows={4} className={inputClass} placeholder="Series synopsis..." />
      </div>

      {/* Cover Image */}
      <div>
        <label className={labelClass}>Cover Image URL *</label>
        <input name="coverImage" value={form.coverImage} onChange={handleChange} required className={inputClass} placeholder="https://..." />
        <AnimatePresence>
          {form.coverImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 relative w-32 h-44 rounded-lg overflow-hidden border border-[var(--border-color)]"
            >
              <img src={form.coverImage} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Banner Image */}
      <div>
        <label className={labelClass}>Banner Image URL</label>
        <input name="bannerImage" value={form.bannerImage} onChange={handleChange} className={inputClass} placeholder="https://..." />
        <AnimatePresence>
          {form.bannerImage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2.5 relative w-full h-32 rounded-lg overflow-hidden border border-[var(--border-color)]"
            >
              <img src={form.bannerImage} alt="Banner preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Genres */}
      <div>
        <label className={labelClass}>Genres *</label>
        <div className="max-h-48 overflow-y-auto p-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <div className="flex flex-wrap gap-2">
            {genres.map((g) => {
              const selected = form.genres.includes(g.name);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => handleGenreToggle(g.name)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                      : 'border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
            {form.genres.filter((g) => !genres.some((gg) => gg.name === g)).map((g) => (
              <button
                key={`auto-${g}`}
                type="button"
                onClick={() => handleGenreToggle(g)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)] cursor-pointer"
                title="Click to remove"
              >
                {g} <span className="text-[10px] opacity-75">×</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Author & Artist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Author</label>
          <input name="author" value={form.author} onChange={handleChange} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Artist</label>
          <input name="artist" value={form.artist} onChange={handleChange} className={inputClass} />
        </div>
      </div>

      {/* Status & Language */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Status *</label>
          <CustomDropdown
            options={statusOptions}
            value={form.status}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                status: val as 'ongoing' | 'completed' | 'hiatus',
              }))
            }
            placeholder="Select status"
            size="md"
            className="w-full"
          />
        </div>
        <div>
          <label className={labelClass}>Language *</label>
          <CustomDropdown
            options={languageOptions}
            value={form.language}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                language: val as 'en' | 'bn',
              }))
            }
            placeholder="Select language"
            size="md"
            className="w-full"
          />
        </div>
      </div>

      {/* Rating & Chapters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Rating (0-10)</label>
          <input name="rating" type="number" min="0" max="10" step="0.1" value={form.rating} onChange={handleChange} className={`${inputClass} font-mono-num`} />
        </div>
        <div>
          <label className={labelClass}>Total Chapters</label>
          <input name="totalChapters" type="number" min="0" value={form.totalChapters} onChange={handleChange} className={`${inputClass} font-mono-num`} />
        </div>
      </div>

      {/* Flags */}
      <div className="flex flex-wrap gap-5 pt-1">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => handleCheckbox('featured', e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">Featured (Hero Carousel)</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.trending}
            onChange={(e) => handleCheckbox('trending', e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--accent)]"
          />
          <span className="text-sm text-[var(--text-secondary)]">Trending</span>
        </label>
      </div>

      {/* Adult Content */}
      <div
        className={`rounded-xl p-4 border transition-colors ${
          form.isAdult
            ? 'border-red-500/35 bg-red-500/10'
            : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
        }`}
      >
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAdult}
            onChange={(e) => handleCheckbox('isAdult', e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded accent-[var(--accent)] flex-shrink-0"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert size={15} className="text-[var(--accent)]" />
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                Adult Content (18+)
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              This title contains 18+ mature content. It remains hidden in Family Mode and appears only when 18+ Mode is enabled.
            </p>
          </div>
        </label>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="btn-accent w-full py-3 text-sm cursor-pointer"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
