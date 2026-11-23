import { NextRequest, NextResponse } from 'next/server';
import type { JikanMangaSearchResult, MetadataSource } from '@/lib/jikan';
import {
  normalizeAniListMedia,
  normalizeMangaDexItem,
  type MangaDexManga,
} from '../search/route';

const JIKAN_BASE = 'https://api.jikan.moe/v4';
const ANILIST_GRAPHQL = 'https://graphql.anilist.co';
const MANGADEX_BASE = 'https://api.mangadex.org';
const FETCH_TIMEOUT_MS = 8000;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function fetchJikanDetail(malId: string): Promise<JikanMangaSearchResult | null> {
  const url = `${JIKAN_BASE}/manga/${encodeURIComponent(malId)}/full`;
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

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: JikanMangaSearchResult };
  return json.data ? { ...json.data, source: 'mal', sourceId: String(json.data.mal_id) } : null;
}

async function fetchAniListDetail(id: string): Promise<JikanMangaSearchResult | null> {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return null;

  const gqlQuery = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
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
        staff(perPage: 6, sort: RELEVANCE) {
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
  `;

  const res = await fetch(ANILIST_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gqlQuery, variables: { id: numericId } }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { Media?: Parameters<typeof normalizeAniListMedia>[0] | null };
  };
  return json.data?.Media ? normalizeAniListMedia(json.data.Media) : null;
}

async function fetchMangaDexDetail(id: string): Promise<JikanMangaSearchResult | null> {
  const params = new URLSearchParams();
  params.append('includes[]', 'cover_art');
  params.append('includes[]', 'author');
  params.append('includes[]', 'artist');

  const res = await fetch(`${MANGADEX_BASE}/manga/${encodeURIComponent(id)}?${params.toString()}`, {
    headers: { Accept: 'application/json', 'User-Agent': 'MangaBD/1.0' },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: MangaDexManga };
  return json.data ? normalizeMangaDexItem(json.data) : null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id')?.trim();
  const source = (searchParams.get('source') || 'mal') as MetadataSource;

  if (!id) {
    return NextResponse.json(
      { error: 'Query parameter "id" is required' },
      { status: 400 }
    );
  }

  const cacheKey = `detail:${source}:${id}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    let data: JikanMangaSearchResult | null = null;
    if (source === 'anilist') {
      data = await fetchAniListDetail(id);
    } else if (source === 'mangadex') {
      data = await fetchMangaDexDetail(id);
    } else {
      data = await fetchJikanDetail(id);
    }

    if (!data) {
      return NextResponse.json({ error: 'Manga metadata not found' }, { status: 404 });
    }

    const payload = { data };
    cache.set(cacheKey, { data: payload, timestamp: Date.now() });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[API /manga/detail] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manga metadata detail' },
      { status: 500 }
    );
  }
}
