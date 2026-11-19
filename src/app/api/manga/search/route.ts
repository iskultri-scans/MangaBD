import { NextRequest, NextResponse } from 'next/server';

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Simple server-side cache to reduce API calls
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = searchParams.get('limit') || '8';

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required (min 2 characters)' },
      { status: 400 }
    );
  }

  // Check cache first
  const cacheKey = `search:${query}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = `${JIKAN_BASE}/manga?q=${encodeURIComponent(query)}&limit=${limit}&sfw=true`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MangaBD/1.0',
      },
    });

    if (!res.ok) {
      if (res.status === 429) {
        // Rate limited - retry after a delay
        const retryAfter = res.headers.get('Retry-After') || '1';
        await new Promise((r) => setTimeout(r, parseInt(retryAfter) * 1000));
        const retryRes = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'MangaBD/1.0',
          },
        });
        if (!retryRes.ok) {
          return NextResponse.json(
            { error: `Jikan API error: ${retryRes.status}` },
            { status: retryRes.status }
          );
        }
        const retryData = await retryRes.json();
        cache.set(cacheKey, { data: retryData, timestamp: Date.now() });
        return NextResponse.json(retryData);
      }
      return NextResponse.json(
        { error: `Jikan API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // Cache the result
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error) {
    console.error('Jikan proxy search error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Jikan API' },
      { status: 500 }
    );
  }
}
