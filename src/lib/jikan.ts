// Multi-source public Manga metadata helpers (Jikan/MAL primary + AniList & MangaDex fallback)
// Uses Next.js API routes (/api/manga/search & /api/manga/detail) as proxy — zero API keys required.

export type MetadataSource = 'mal' | 'anilist' | 'mangadex';

export interface JikanMangaSearchResult {
  mal_id: number;
  source?: MetadataSource;
  sourceId?: string;
  title: string;
  url: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  bannerImage?: string | null;
  synopsis: string | null;
  type: string | null;
  chapters: number | null;
  volumes: number | null;
  status: string | null;
  score: number | null;
  scored_by: number | null;
  authors: { mal_id: number; name: string; url: string; type: string }[];
  genres: { mal_id: number; name: string; url: string }[];
  themes: { mal_id: number; name: string; url: string }[];
  demographics: { mal_id: number; name: string; url: string }[];
  published: { from: string | null; to: string | null; string: string };
  titles: { type: string; title: string }[];
}

export type MangaMetadataResult = JikanMangaSearchResult;

export interface JikanSearchResponse {
  data: JikanMangaSearchResult[];
  provider?: MetadataSource | 'none';
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: { total: number; count: number; per_page: number };
  };
}

export interface JikanMangaDetailResponse {
  data: JikanMangaSearchResult;
}

export interface AutoFillData {
  title: string;
  titleBn?: string;
  slug: string;
  description: string;
  coverImage: string;
  bannerImage?: string;
  genres: string[];
  author: string;
  artist: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  rating: number;
  totalChapters: number;
  language: 'en' | 'bn';
  featured: boolean;
  trending: boolean;
}

/**
 * Search manga by title using our Next.js API proxy (Jikan -> AniList -> MangaDex fallback).
 */
export async function searchMangaJikan(
  query: string,
  limit = 8,
  preferredSource?: MetadataSource
): Promise<JikanMangaSearchResult[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  try {
    const sourceParam = preferredSource ? `&source=${encodeURIComponent(preferredSource)}` : '';
    const url = `/api/manga/search?q=${encodeURIComponent(query.trim())}&limit=${limit}${sourceParam}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Manga metadata search error:', res.status, res.statusText);
      return [];
    }

    const data: JikanSearchResponse = await res.json();
    return Array.isArray(data.data) ? data.data : [];
  } catch (error) {
    console.error('Manga metadata search failed:', error);
    return [];
  }
}

/**
 * Get full manga details by ID + source via our Next.js API proxy.
 */
export async function getMangaDetailJikan(
  id: number | string,
  source: MetadataSource = 'mal'
): Promise<JikanMangaSearchResult | null> {
  try {
    const url = `/api/manga/detail?id=${encodeURIComponent(String(id))}&source=${encodeURIComponent(source)}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Manga metadata detail error:', res.status);
      return null;
    }

    const data: JikanMangaDetailResponse = await res.json();
    return data.data || null;
  } catch (error) {
    console.error('Manga metadata detail fetch failed:', error);
    return null;
  }
}

function cleanSynopsis(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/\[Written by MAL Rewrite\]/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Convert normalized metadata result to our AutoFillData format.
 */
export function jikanToAutoFill(manga: JikanMangaSearchResult): AutoFillData {
  const coverImage =
    manga.images?.webp?.large_image_url ||
    manga.images?.jpg?.large_image_url ||
    manga.images?.webp?.image_url ||
    manga.images?.jpg?.image_url ||
    '';

  const bannerImage =
    manga.bannerImage || (coverImage ? coverImage.replace('/medium/', '/large/') : '');

  const genreSet = new Set<string>();
  [...(manga.genres || []), ...(manga.themes || []), ...(manga.demographics || [])].forEach((g) => {
    if (g?.name?.trim()) genreSet.add(g.name.trim());
  });
  const genres = Array.from(genreSet);

  const authors = manga.authors || [];
  const storyAuthor = authors.find((a) => a.type === 'Story') || authors[0];
  const artAuthor = authors.find((a) => a.type === 'Art') || (authors.length > 1 ? authors[1] : storyAuthor);
  const author = storyAuthor?.name || '';
  const artist = artAuthor?.name || author;

  let status: 'ongoing' | 'completed' | 'hiatus' = 'ongoing';
  const normalizedStatus = (manga.status || '').toLowerCase();
  if (normalizedStatus.includes('finish') || normalizedStatus === 'completed') status = 'completed';
  else if (normalizedStatus.includes('hiatus')) status = 'hiatus';
  else status = 'ongoing';

  const rating = manga.score ? Math.round(manga.score * 10) / 10 : 0;

  const slug = (manga.title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return {
    title: manga.title || '',
    slug,
    description: cleanSynopsis(manga.synopsis),
    coverImage,
    bannerImage,
    genres,
    author,
    artist,
    status,
    rating,
    totalChapters: manga.chapters || 0,
    language: 'en',
    featured: false,
    trending: false,
  };
}
