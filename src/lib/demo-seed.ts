import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import {
  DEMO_GENRES,
  DEMO_MANGA,
  DEMO_CHAPTERS_BY_SLUG,
  DEMO_ANNOUNCEMENTS,
  getDemoUpcomingReleases,
  DEMO_NOTIFICATIONS,
} from './demo-catalog';

export async function publishDemoCatalogToFirestore(): Promise<{
  genres: number;
  manga: number;
  chapters: number;
  announcements: number;
  upcoming: number;
  notifications: number;
}> {
  const db = getFirebaseDb();
  const now = Timestamp.now();

  for (const genre of DEMO_GENRES) {
    await setDoc(doc(db, 'genres', genre.slug), {
      name: genre.name,
      slug: genre.slug,
      mangaCount: genre.mangaCount,
    });
  }

  let totalChapters = 0;
  for (const manga of DEMO_MANGA) {
    const mangaId = manga.slug;
    const chapters = DEMO_CHAPTERS_BY_SLUG[manga.slug] || [];
    await setDoc(doc(db, 'manga', mangaId), {
      title: manga.title,
      ...(manga.titleBn ? { titleBn: manga.titleBn } : {}),
      slug: manga.slug,
      description: manga.description,
      coverImage: manga.coverImage,
      ...(manga.bannerImage ? { bannerImage: manga.bannerImage } : {}),
      genres: manga.genres,
      author: manga.author,
      artist: manga.artist,
      status: manga.status,
      rating: manga.rating,
      totalChapters: chapters.length,
      language: manga.language,
      ...(manga.readLink ? { readLink: manga.readLink } : {}),
      featured: manga.featured,
      trending: manga.trending,
      isAdult: Boolean(manga.isAdult),
      createdAt: manga.createdAt || now,
      updatedAt: now,
    });

    for (const ch of chapters) {
      const chId = `ch-${ch.chapterNumber}`;
      await setDoc(doc(db, 'manga', mangaId, 'chapters', chId), {
        mangaId,
        title: ch.title,
        chapterNumber: ch.chapterNumber,
        readLink: ch.readLink,
        createdAt: now,
      });
      totalChapters++;
    }
  }

  for (const post of DEMO_ANNOUNCEMENTS) {
    await setDoc(doc(db, 'announcements', post.id), {
      title: post.title,
      content: post.content,
      type: post.type,
      ...(post.mangaId ? { mangaId: post.mangaId } : {}),
      ...(post.coverImage ? { coverImage: post.coverImage } : {}),
      createdAt: post.createdAt || now,
      updatedAt: now,
    });
  }

  const upcomingList = getDemoUpcomingReleases();
  for (const rel of upcomingList) {
    await setDoc(doc(db, 'upcomingReleases', rel.id), {
      title: rel.title,
      ...(rel.titleBn ? { titleBn: rel.titleBn } : {}),
      ...(rel.mangaSlug ? { mangaId: rel.mangaSlug, mangaSlug: rel.mangaSlug } : {}),
      ...(rel.coverImage ? { coverImage: rel.coverImage } : {}),
      releaseDate: rel.releaseDate,
      ...(rel.description ? { description: rel.description } : {}),
      createdAt: now,
    });
  }

  for (const notif of DEMO_NOTIFICATIONS) {
    await setDoc(doc(db, 'notifications', notif.id), {
      title: notif.title,
      message: notif.message,
      type: notif.type,
      ...(notif.mangaSlug ? { mangaId: notif.mangaSlug, mangaSlug: notif.mangaSlug } : {}),
      createdAt: notif.createdAt || now,
    });
  }

  return {
    genres: DEMO_GENRES.length,
    manga: DEMO_MANGA.length,
    chapters: totalChapters,
    announcements: DEMO_ANNOUNCEMENTS.length,
    upcoming: upcomingList.length,
    notifications: DEMO_NOTIFICATIONS.length,
  };
}
