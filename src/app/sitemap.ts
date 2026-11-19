import { MetadataRoute } from 'next';
import { getDocs, collection, where, limit, query } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { SITE_URL as BASE_URL } from '@/lib/site-url';

// Static pages — these are always present
function getStaticPages(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE_URL, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
    { url: `${BASE_URL}/browse`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/search`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/requests`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${BASE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${BASE_URL}/login`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/dmca`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ];
}

// Fetch manga slugs server-side for dynamic sitemap entries.
// Uses Firebase Client SDK (same pattern as the manga detail page).
// Returns an empty array on failure — sitemap will still include static pages.
async function getMangaSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    const db = getFirebaseDb();
    // Fetch up to 500 manga for the sitemap (Google's max per sitemap is 50k)
    const snap = await getDocs(query(collection(db, 'manga'), limit(500)));

    return snap.docs
      .map((d) => {
        const data = d.data() as { slug?: string; updatedAt?: { toMillis?: () => number } };
        if (!data.slug) return null;
        const updatedAt = data.updatedAt?.toMillis
          ? new Date(data.updatedAt.toMillis())
          : new Date();
        return { slug: data.slug, updatedAt };
      })
      .filter((x): x is { slug: string; updatedAt: Date } => x !== null);
  } catch (error) {
    console.error('[sitemap] Failed to fetch manga slugs:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = getStaticPages();

  const mangaSlugs = await getMangaSlugs();
  const mangaPages: MetadataRoute.Sitemap = mangaSlugs.map(({ slug, updatedAt }) => ({
    url: `${BASE_URL}/manga/${slug}`,
    lastModified: updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...staticPages, ...mangaPages];
}
