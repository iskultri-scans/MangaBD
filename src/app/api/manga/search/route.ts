import { NextRequest, NextResponse } from 'next/server';
import type { JikanMangaSearchResult, MetadataSource } from '@/lib/jikan';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_GRAPHQL = 'https://graphql.anilist.co';
const MANGADEX_BASE = 'https://api.mangadex.org';
const FETCH_TIMEOUT_MS = 7000;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function mapAniListStatus(status: string | null): string {
  switch (status) {
    case 'FINISHED':
      return 'Finished';
    case 'HIATUS':
      return 'On Hiatus';
    case 'RELEASING':
    case 'NOT_YET_RELEASED':
    default:
      return 'Publishing';
  }
}

interface AniListMedia {
  id: number;
  idMal?: number | null;
  siteUrl?: string | null;
  title?: { english?: string | null; romaji?: string | null; native?: string | null };
  description?: string | null;
  format?: string | null;
  status?: string | null;
  chapters?: number | null;
  volumes?: number | null;
  averageScore?: number | null;
  coverImage?: { extraLarge?: string | null; large?: string | null; medium?: string | null };
  bannerImage?: string | null;
  genres?: string[];
  staff?: {
    edges?: { role?: string | null; node?: { id?: number; name?: { full?: string | null } } }[];
  };
}

export function normalizeAniListMedia(media: AniListMedia): JikanMangaSearchResult {
  const title = media.title?.english || media.title?.romaji || media.title?.native || 'Untitled';
  const largeCover = media.coverImage?.extraLarge || media.coverImage?.large || '';
  const medCover = media.coverImage?.large || media.coverImage?.medium || largeCover;

  const staffEdges = media.staff?.edges || [];
  const authors = staffEdges
    .filter((edge) => edge.node?.name?.full)
    .map((edge, idx) => {
      const roleLower = (edge.role || '').toLowerCase();
      const type = roleLower.includes('art') && !roleLower.includes('story') ? 'Art' : 'Story';
      return {
        mal_id: edge.node?.id || idx,
        name: edge.node?.name?.full || '',
        url: '',
        type,
      };
    });

  return {
    mal_id: media.idMal || media.id,
    source: 'anilist',
    sourceId: String(media.id),
    title,
    url: media.siteUrl || `https://anilist.co/manga/${media.id}`,
    images: {
      jpg: { image_url: medCover, large_image_url: largeCover },
      webp: { image_url: medCover, large_image_url: largeCover },
    },
    bannerImage: media.bannerImage || null,
    synopsis: media.description || null,
    type: media.format || 'Manga',
    chapters: media.chapters ?? null,
    volumes: media.volumes ?? null,
    status: mapAniListStatus(media.status || null),
    score: media.averageScore ? Math.round((media.averageScore / 10) * 10) / 10 : null,
    scored_by: null,
    authors,
    genres: (media.genres || []).map((name, idx) => ({ mal_id: idx, name, url: '' })),
    themes: [],
    demographics: [],
    published: { from: null, to: null, string: '' },
    titles: [
      ...(media.title?.english ? [{ type: 'English', title: media.title.english }] : []),
      ...(media.title?.romaji ? [{ type: 'Default', title: media.title.romaji }] : []),
    ],
  };
}

interface MangaDexRelationship {
  id: string;
  type: string;
  attributes?: {
    fileName?: string;
    name?: string;
  };
}

export interface MangaDexManga {
  id: string;
  attributes?: {
    title?: Record<string, string>;
    altTitles?: Record<string, string>[];
    description?: Record<string, string>;
    status?: string;
    lastChapter?: string | null;
    lastVolume?: string | null;
    publicationDemographic?: string | null;
    tags?: { id: string; attributes?: { name?: Record<string, string> } }[];
  };
  relationships?: MangaDexRelationship[];
}

export function normalizeMangaDexItem(item: MangaDexManga): JikanMangaSearchResult {
  const attrs = item.attributes || {};
  const titleObj = attrs.title || {};
  const altEn = attrs.altTitles?.find((t) => t.en)?.en;
  const title =
    titleObj.en ||
    titleObj['ja-ro'] ||
    altEn ||
    Object.values(titleObj)[0] ||
    'Untitled';

  const descObj = attrs.description || {};
  const synopsis = descObj.en || Object.values(descObj)[0] || null;

  const rels = item.relationships || [];
  const coverRel = rels.find((r) => r.type === 'cover_art' && r.attributes?.fileName);
  const coverLarge = coverRel?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.512.jpg`
    : '';
  const coverSmall = coverRel?.attributes?.fileName
    ? `https://uploads.mangadex.org/covers/${item.id}/${coverRel.attributes.fileName}.256.jpg`
    : '';

  const authors = rels
    .filter((r) => (r.type === 'author' || r.type === 'artist') && r.attributes?.name)
    .map((r, idx) => ({
      mal_id: idx,
      name: r.attributes?.name || '',
      url: '',
      type: r.type === 'artist' ? 'Art' : 'Story',
    }));

  const statusMap: Record<string, string> = {
    ongoing: 'Publishing',
    completed: 'Finished',
    hiatus: 'On Hiatus',
    cancelled: 'Discontinued',
  };

  const parsedChapters = attrs.lastChapter ? Number(attrs.lastChapter) : null;
  const genres = (attrs.tags || [])
    .map((t, idx) => ({
      mal_id: idx,
      name: t.attributes?.name?.en || '',
      url: '',
    }))
    .filter((g) => g.name);

  return {
    mal_id: 0,
    source: 'mangadex',
    sourceId: item.id,
    title,
    url: `https://mangadex.org/title/${item.id}`,
    images: {
      jpg: { image_url: coverSmall, large_image_url: coverLarge },
      webp: { image_url: coverSmall, large_image_url: coverLarge },
    },
    synopsis,
    type: 'Manga',
    chapters: parsedChapters && Number.isFinite(parsedChapters) ? Math.round(parsedChapters) : null,
    volumes: attrs.lastVolume && Number.isFinite(Number(attrs.lastVolume)) ? Math.round(Number(attrs.lastVolume)) : null,
    status: statusMap[attrs.status || 'ongoing'] || 'Publishing',
    score: null,
    scored_by: null,
    authors,
    genres: genres.slice(0, 8),
    themes: [],
    demographics: attrs.publicationDemographic
      ? [{ mal_id: 0, name: attrs.publicationDemographic, url: '' }]
      : [],
    published: { from: null, to: null, string: '' },
    titles: [],
  };
}

async function searchJikan(query: string, limit: number): Promise<JikanMangaSearchResult[]> {
  const url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`;
  let res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'MangaBD/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (res.status === 429) {
    const retryAfter = Math.min(Number(res.headers.get('Retry-After') || '1') || 1, 2);
    await new Promise((r) => setTimeout(r, retryAfter * 1000));
    res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'MangaBD/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  }

  if (!res.ok) {
    throw new Error(`Jikan API error: ${res.status}`);
  }

  const json = (await res.json()) as { data?: JikanMangaSearchResult[] };
  return (json.data || []).map((item) => ({
    ...item,
    source: 'mal' as const,
    sourceId: String(item.mal_id),
  }));
}

async function searchAniList(query: string, limit: number): Promise<JikanMangaSearchResult[]> {
  const gqlQuery = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: MANGA, isAdult: false, sort: SEARCH_MATCH) {
          id
          idMal
          siteUrl
          title { english romaji native }
          description(asHtml: false)
          format
          status
          chapters
          volumes
          averageScore
          coverImage { extraLarge large medium }
          bannerImage
          genres
          staff(perPage: 4, sort: RELEVANCE) {
            edges {
              role
              node {
                id
                name { full }
              }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(ANILIST_GRAPHQL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      query: gqlQuery,
      variables: { search: query, perPage: limit },
    }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status}`);
  }

  const json = (await res.json()) as { data?: { Page?: { media?: AniListMedia[] } } };
  const mediaList = json.data?.Page?.media || [];
  return mediaList.map(normalizeAniListMedia);
}

async function searchMangaDex(query: string, limit: number): Promise<JikanMangaSearchResult[]> {
  const params = new URLSearchParams({
    title: query,
    limit: String(limit),
  });
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');
  params.append('contentRating[]', 'safe');
  params.append('contentRating[]', 'suggestive');

  const res = await fetch(`${MANGADEX_BASE}/manga?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'MangaBD/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`MangaDex API error: ${res.status}`);
  }

  const json = (await res.json()) as { data?: MangaDexManga[] };
  return (json.data || []).map(normalizeMangaDexItem);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q')?.trim() || '';
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '8') || 8, 1), 15);
  const preferredSource = searchParams.get('source') as MetadataSource | null;

  if (query.length < 2) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required (min 2 characters)' },
      { status: 400 }
    );
  }

  const cacheKey = `search:${preferredSource || 'auto'}:${query.toLowerCase()}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  const providers: { name: MetadataSource; fn: () => Promise<JikanMangaSearchResult[]> }[] =
    preferredSource === 'anilist'
      ? [{ name: 'anilist', fn: () => searchAniList(query, limit) }]
      : preferredSource === 'mangadex'
        ? [{ name: 'mangadex', fn: () => searchMangaDex(query, limit) }]
        : preferredSource === 'mal'
          ? [{ name: 'mal', fn: () => searchJikan(query, limit) }]
          : [
              { name: 'mal', fn: () => searchJikan(query, limit) },
              { name: 'anilist', fn: () => searchAniList(query, limit) },
              { name: 'mangadex', fn: () => searchMangaDex(query, limit) },
            ];

  for (const provider of providers) {
    try {
      const results = await provider.fn();
      if (results.length > 0) {
        const payload = { data: results, provider: provider.name };
        cache.set(cacheKey, { data: payload, timestamp: Date.now() });
        return NextResponse.json(payload);
      }
    } catch (err) {
      console.warn(`[API /manga/search] ${provider.name} failed:`, err);
    }
  }

  return NextResponse.json({ data: [], provider: 'none' });
}
