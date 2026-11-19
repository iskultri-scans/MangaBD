// Jikan API v4 - Free MyAnimeList API (No API key required!)
// Uses Next.js API routes as proxy to avoid CORS issues in the browser
// Docs: https://docs.api.jikan.moe/

export interface JikanMangaSearchResult {
  mal_id: number;
  title: string;
  url: string;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
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

export interface JikanSearchResponse {
  data: JikanMangaSearchResult[];
  pagination: {
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
 * Search manga by title using our Next.js API proxy
 * This avoids CORS issues when calling from the browser
 */
export async function searchMangaJikan(query: string, limit = 8): Promise<JikanMangaSearchResult[]> {
  if (!query.trim() || query.trim().length < 2) return [];

  try {
    const url = `/api/manga/search?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Jikan proxy search error:', res.status, res.statusText);
      return [];
    }

    const data: JikanSearchResponse = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Jikan search failed:', error);
    return [];
  }
}

/**
 * Get full manga details by MAL ID via our Next.js API proxy
 */
export async function getMangaDetailJikan(malId: number): Promise<JikanMangaSearchResult | null> {
  try {
    const url = `/api/manga/detail?id=${malId}`;
    const res = await fetch(url);

    if (!res.ok) {
      console.error('Jikan proxy detail error:', res.status);
      return null;
    }

    const data: JikanMangaDetailResponse = await res.json();
    return data.data;
  } catch (error) {
    console.error('Jikan detail fetch failed:', error);
    return null;
  }
}

/**
 * Convert Jikan manga data to our AutoFillData format
 */
export function jikanToAutoFill(manga: JikanMangaSearchResult): AutoFillData {
  // Extract cover image - prefer large webp, then large jpg, then regular
  const coverImage =
    manga.images?.webp?.large_image_url ||
    manga.images?.jpg?.large_image_url ||
    manga.images?.webp?.image_url ||
    manga.images?.jpg?.image_url ||
    '';

  // Banner image - same as cover for now (MAL doesn't provide banner)
  const bannerImage = coverImage ? coverImage.replace('/medium/', '/large/') : '';

  // Genres - combine genres + themes + demographics
  const genres = [
    ...manga.genres.map((g) => g.name),
    ...manga.themes.map((t) => t.name),
    ...manga.demographics.map((d) => d.name),
  ];

  // Authors - first is usually the author/writer, second is artist
  const authors = manga.authors || [];
  const author = authors[0]?.name || '';
  const artist = authors.length > 1 ? authors[1]?.name : author;

  // Status mapping
  let status: 'ongoing' | 'completed' | 'hiatus' = 'ongoing';
  if (manga.status === 'Finished') status = 'completed';
  else if (manga.status === 'On Hiatus') status = 'hiatus';
  else if (manga.status === 'Publishing') status = 'ongoing';

  // Score (MAL uses 0-10 scale)
  const rating = manga.score ? Math.round(manga.score * 10) / 10 : 0;

  // Build slug from title
  const slug = manga.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Clean up synopsis (remove HTML entities, [Written by MAL Rewrite], etc.)
  let description = manga.synopsis || '';
  description = description
    .replace(/\[Written by MAL Rewrite\]/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n/g, ' ')
    .trim();

  return {
    title: manga.title || '',
    slug,
    description,
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
