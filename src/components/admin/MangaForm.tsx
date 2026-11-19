'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { slugify } from '@/lib/utils';
import { CustomDropdown, type DropdownOption } from '@/components/ui/CustomDropdown';
import { Clock, CheckCircle, Pause, Globe, Search, Sparkles, X, Loader2, ShieldAlert } from 'lucide-react';
import { searchMangaJikan, getMangaDetailJikan, jikanToAutoFill, type JikanMangaSearchResult, type AutoFillData } from '@/lib/jikan';
import type { Manga } from '@/lib/firestore';

interface MangaFormProps {
  initialData?: Partial<Manga>;
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

const defaultForm = {
  title: '',
  titleBn: '',
  slug: '',
  description: '',
  coverImage: '',
  bannerImage: '',
  genres: [] as string[],
  author: '',
  artist: '',
  status: 'ongoing' as string,
  rating: 0,
  totalChapters: 0,
  language: 'en' as string,
  featured: false,
  trending: false,
  isAdult: false,
};

function buildFormFromInitial(initialData?: Partial<Manga>) {
  if (!initialData) return defaultForm;
  return {
    title: initialData.title || '',
    titleBn: initialData.titleBn || '',
    slug: initialData.slug || '',
    description: initialData.description || '',
    coverImage: initialData.coverImage || '',
    bannerImage: initialData.bannerImage || '',
    genres: initialData.genres || [],
    author: initialData.author || '',
    artist: initialData.artist || '',
    status: initialData.status || 'ongoing',
    rating: initialData.rating || 0,
    totalChapters: initialData.totalChapters || 0,
    language: initialData.language || 'en',
    featured: initialData.featured || false,
    trending: initialData.trending || false,
    isAdult: initialData.isAdult || false,
  };
}

export function MangaForm({ initialData, onSubmit, genres, loading = false, submitLabel = 'Save' }: MangaFormProps) {
  const [form, setForm] = useState(() => buildFormFromInitial(initialData));
  const [autoSlug, setAutoSlug] = useState(() => !initialData?.slug);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JikanMangaSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMalId, setSelectedMalId] = useState<number | null>(null);
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'title' && autoSlug) {
        updated.slug = slugify(value);
      }
      return updated;
    });
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

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const results = await searchMangaJikan(searchQuery, 8);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleAutoFill = async (malId: number) => {
    setSelectedMalId(malId);
    setSearching(true);
    try {
      const detail = await getMangaDetailJikan(malId);
      if (!detail) return;

      const autoFillData: AutoFillData = jikanToAutoFill(detail);

      setForm((prev) => ({
        ...prev,
        title: autoFillData.title,
        slug: autoFillData.slug,
        description: autoFillData.description,
        coverImage: autoFillData.coverImage,
        bannerImage: autoFillData.bannerImage || prev.bannerImage,
        genres: autoFillData.genres,
        author: autoFillData.author,
        artist: autoFillData.artist,
        status: autoFillData.status,
        rating: autoFillData.rating,
        totalChapters: autoFillData.totalChapters,
      }));

      setAutoFillSource(`MyAnimeList #${malId}`);
      setShowSearch(false);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error) {
      console.error('Auto-fill failed:', error);
    } finally {
      setSearching(false);
      setSelectedMalId(null);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
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
      {/* Auto-Fill from MyAnimeList */}
      <div className="rounded-xl p-4 sm:p-5 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              Auto-Fill from MyAnimeList
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">
              Jikan API
            </span>
          </div>
          {autoFillSource && (
            <div className="flex items-center gap-1.5">
              <span className="font-mono-num text-xs text-[var(--text-muted)]">
                Source: {autoFillSource}
              </span>
              <button
                type="button"
                onClick={() => setAutoFillSource(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
            className="btn-accent flex items-center gap-2 text-sm w-full justify-center"
          >
            <Search size={15} />
            Search Manga &amp; Auto-Fill
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Type manga name... e.g. One Piece, Jujutsu Kaisen"
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching || !searchQuery.trim()}
                className="btn-accent text-sm flex items-center gap-1.5"
              >
                {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                Search
              </button>
              <button
                type="button"
                onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(''); }}
                className="px-3 py-2.5 rounded-lg text-sm border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                    {searchResults.map((result) => (
                      <button
                        key={result.mal_id}
                        type="button"
                        onClick={() => handleAutoFill(result.mal_id)}
                        disabled={searching && selectedMalId === result.mal_id}
                        className="w-full flex items-start gap-3 p-3 rounded-lg text-left border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-[var(--accent)] transition-colors"
                        style={{ opacity: searching && selectedMalId === result.mal_id ? 0.6 : 1 }}
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
                          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                            {result.title}
                          </p>
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
                            {result.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() || 'No description'}
                          </p>
                        </div>

                        {searching && selectedMalId === result.mal_id && (
                          <Loader2 size={14} className="animate-spin text-[var(--accent)] flex-shrink-0 mt-1" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-2 text-center">
                    Data from MyAnimeList via Jikan API · Click any result to populate fields
                  </p>
                </motion.div>
              )}

              {searching && searchResults.length === 0 && (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 size={16} className="animate-spin text-[var(--accent)]" />
                  <span className="text-sm text-[var(--text-muted)]">Searching MyAnimeList...</span>
                </div>
              )}

              {!searching && searchQuery.length >= 2 && searchResults.length === 0 && showSearch && (
                <p className="text-xs text-[var(--text-muted)] text-center py-4">
                  No results found. Try a different search term.
                </p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border-color)] pt-4">
        <p className="text-xs text-[var(--text-muted)]">
          Use MyAnimeList auto-fill above or complete the fields manually below.
        </p>
      </div>

      {/* Title EN */}
      <div>
        <label className={labelClass}>Title (EN) *</label>
        <input name="title" value={form.title} onChange={handleChange} required className={inputClass} placeholder="e.g. One Piece" />
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
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ${
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
                  className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
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
              <span
                key={`auto-${g}`}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--accent)]"
              >
                {g} <span className="text-[10px] opacity-75">(MAL)</span>
              </span>
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
            onChange={(val) => setForm((prev) => ({ ...prev, status: val }))}
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
            onChange={(val) => setForm((prev) => ({ ...prev, language: val }))}
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
        className="btn-accent w-full py-3 text-sm"
      >
        {loading ? 'Saving...' : submitLabel}
      </button>
    </form>
  );
}
