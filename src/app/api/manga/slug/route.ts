import { NextRequest, NextResponse } from 'next/server';
import { getDocs, collection, query, where, limit } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

// Server-side cache for manga slug lookups
const cache = new Map<string, { data: Record<string, unknown> | null; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ error: 'Slug parameter required' }, { status: 400 });
  }

  // Check cache
  const cacheKey = `manga:${slug}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    if (cached.data === null) {
      return NextResponse.json({ error: 'Manga not found' }, { status: 404 });
    }
    return NextResponse.json(cached.data);
  }

  // Method 1: Firebase Client SDK (works with Firestore Security Rules — "allow read: if true;")
  try {
    const db = getFirebaseDb();
    const q = query(collection(db, 'manga'), where('slug', '==', slug), limit(1));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const manga = { id: doc.id, ...doc.data() };
      cache.set(cacheKey, { data: manga as Record<string, unknown>, timestamp: Date.now() });
      return NextResponse.json(manga);
    }
  } catch (error) {
    console.error('[API /manga/slug] Client SDK error:', error);
  }

  // Method 2: Firebase Admin SDK fallback (bypasses Security Rules, needs service-account env vars)
  try {
    const { getAdminApp } = await import('@/lib/firebase-admin');
    const adminApp = getAdminApp();
    const adminDb = adminApp.firestore();

    const snapshot = await adminDb
      .collection('manga')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const manga = { id: doc.id, ...doc.data() };
      cache.set(cacheKey, { data: manga as Record<string, unknown>, timestamp: Date.now() });
      return NextResponse.json(manga);
    }
  } catch (error) {
    console.error('[API /manga/slug] Admin SDK error:', error);
  }

  cache.set(cacheKey, { data: null, timestamp: Date.now() });
  return NextResponse.json({ error: 'Manga not found' }, { status: 404 });
}
