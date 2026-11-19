/**
 * Home Page — Server Component with ISR
 *
 * ✅ Server-rendered for SEO (Google সরাসরি content দেখতে পারে)
 * ✅ ISR দিয়ে ৫ মিনিট cache — দ্রুত page load
 * ✅ Adult content cookie থেকে detect করে filter করা হয়
 */

import { cookies } from 'next/headers';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { HomeContent } from '@/components/home/HomeContent';
import {
  getAllGenres,
  getFeaturedManga,
  getTrendingManga,
  getLatestManga,
  getMangaByLanguage,
  getLatestAnnouncements,
  getUpcomingReleases,
  type Manga,
  type Genre,
  type Announcement,
  type UpcomingRelease,
} from '@/lib/firestore';

// Revalidate every 5 minutes (ISR)
export const revalidate = 300;

// 🔒 Family Mode default — server renders safe content for SEO + new visitors.
// Adult users will see adult content client-side via ContentModeContext.
async function loadData() {
  const results = await Promise.allSettled([
    getAllGenres(),
    getFeaturedManga(),
    getTrendingManga(),
    getLatestManga(10),
    getMangaByLanguage('bn', 10),
    getLatestAnnouncements(5),
    getUpcomingReleases(),
  ]);

  const extract = <T,>(r: PromiseSettledResult<T[]>, fallback: T[] = [] as T[]): T[] =>
    r.status === 'fulfilled' ? r.value : fallback;

  return {
    genres: extract(results[0]) as Genre[],
    featured: extract(results[1]) as Manga[],
    trending: extract(results[2]) as Manga[],
    latest: extract(results[3]) as Manga[],
    bnManga: extract(results[4]) as Manga[],
    announcements: extract(results[5]) as Announcement[],
    upcoming: extract(results[6]) as UpcomingRelease[],
  };
}

export default async function HomePage() {
  const data = await loadData();

  // 🔒 Server-side adult filtering based on cookie (Family Mode default for SEO)
  const cookieStore = await cookies();
  const contentMode = cookieStore.get('iskultrip-content-mode')?.value || 'family';
  const isAgeVerified = cookieStore.get('iskultrip-age-verified')?.value === 'true';
  const includeAdult = contentMode === 'adult' && isAgeVerified;

  // Filter adult content unless user has explicit verified adult preference
  const filterAdult = <T extends { isAdult?: boolean }>(list: T[]): T[] =>
    includeAdult ? list : list.filter((m) => !m.isAdult);

  // Convert Firestore Timestamp instances into plain { seconds, nanoseconds } objects for RSC serialization
  const toPlain = <T,>(val: T): T => JSON.parse(JSON.stringify(val));

  const safeData = {
    genres: toPlain(data.genres),
    featured: toPlain(filterAdult(data.featured)),
    trending: toPlain(filterAdult(data.trending)),
    latest: toPlain(filterAdult(data.latest)),
    bnManga: toPlain(filterAdult(data.bnManga)),
    announcements: toPlain(data.announcements),
    upcoming: toPlain(data.upcoming),
  };

  const genreSlugs = safeData.genres.map((g) => ({ name: g.name, slug: g.slug }));

  return (
    <PublicLayout genres={genreSlugs}>
      <HomeContent
        genres={safeData.genres}
        featured={safeData.featured}
        trending={safeData.trending}
        latest={safeData.latest}
        bnManga={safeData.bnManga}
        announcements={safeData.announcements}
        upcoming={safeData.upcoming}
        genreSlugs={genreSlugs}
      />
    </PublicLayout>
  );
}
