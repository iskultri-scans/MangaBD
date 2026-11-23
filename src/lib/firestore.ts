import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  runTransaction,
  QueryConstraint,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from './firebase';
import {
  DEMO_MANGA,
  DEMO_GENRES,
  DEMO_CHAPTERS_BY_SLUG,
  DEMO_ANNOUNCEMENTS,
  DEMO_NOTIFICATIONS,
  DEMO_REQUESTS,
  getDemoUpcomingReleases,
  getDemoMangaWithChapters,
} from './demo-catalog';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  let currentUser: ReturnType<typeof getFirebaseAuth>['currentUser'] = null;
  try {
    currentUser = getFirebaseAuth().currentUser;
  } catch {
    currentUser = null;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo:
        currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Types
export interface ChapterPage {
  pageNumber: number;
  fileId: string;
  width?: number;
  height?: number;
}

export interface Chapter {
  id: string;
  mangaId: string;
  title: string;
  chapterNumber: number;
  readLink: string;
  pages?: ChapterPage[];
  createdAt: Timestamp;
}

export interface Manga {
  id: string;
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
  readLink?: string;
  featured: boolean;
  trending: boolean;
  /** 18+ adult content flag. Family Mode-এ এই manga গুলো লুকানো হয়। */
  isAdult?: boolean;
  chapters?: Chapter[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
  mangaCount: number;
}

// ─── Announcement Types ────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  titleBn?: string;
  content: string;
  contentBn?: string;
  type: 'announcement' | 'upcoming' | 'update';
  mangaId?: string;
  coverImage?: string;
  releaseDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Notification Types ────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  type: 'new_manga' | 'new_chapter' | 'announcement';
  mangaId?: string;
  mangaSlug?: string;
  createdAt: Timestamp;
}

// ─── Upcoming Release Types ────────────────────────────────
export interface UpcomingRelease {
  id: string;
  title: string;
  titleBn?: string;
  mangaId?: string;
  mangaSlug?: string;
  coverImage?: string;
  releaseDate: Timestamp;
  description?: string;
  createdAt: Timestamp;
}

// ─── Request Types ─────────────────────────────────────────
export interface MangaRequest {
  id: string;
  mangaTitle: string;
  mangaTitleBn?: string;
  description: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected';
  upvotes: number;
  upvotedBy: string[];
  adminNote?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Manga CRUD ────────────────────────────────────────────

export async function getAllManga(constraints: QueryConstraint[] = []): Promise<Manga[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'manga'), ...constraints);
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Manga);
    }
    if (constraints.length === 0) {
      return DEMO_MANGA;
    }
    // Check if the collection itself has any documents before returning demo fallback
    const baseSnap = await getDocs(query(collection(getFirebaseDb(), 'manga'), limit(1)));
    return baseSnap.empty ? DEMO_MANGA : [];
  } catch (error) {
    console.error('Error fetching manga:', error);
    return DEMO_MANGA;
  }
}

export async function getMangaBySlug(slug: string): Promise<Manga | null> {
  try {
    const q = query(collection(getFirebaseDb(), 'manga'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      const baseSnap = await getDocs(query(collection(getFirebaseDb(), 'manga'), limit(1)));
      return baseSnap.empty ? getDemoMangaWithChapters(slug) : null;
    }
    const manga = { id: snap.docs[0].id, ...snap.docs[0].data() } as Manga;

    // Fetch chapters for this manga
    const chapters = await getChaptersByMangaId(manga.id);
    manga.chapters = chapters;

    return manga;
  } catch (error) {
    console.error('Error fetching manga by slug:', error);
    return getDemoMangaWithChapters(slug);
  }
}

export async function getMangaById(id: string): Promise<Manga | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'manga', id));
    if (!snap.exists()) {
      const demo = DEMO_MANGA.find((m) => m.id === id);
      return demo ? getDemoMangaWithChapters(demo.slug) : null;
    }
    const manga = { id: snap.id, ...snap.data() } as Manga;

    // Fetch chapters
    const chapters = await getChaptersByMangaId(id);
    manga.chapters = chapters;

    return manga;
  } catch (error) {
    console.error('Error fetching manga by id:', error);
    return null;
  }
}

export async function getFeaturedManga(): Promise<Manga[]> {
  try {
    const allManga = await getAllManga([
      where('featured', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(10),
    ]);
    const filtered = allManga.filter((m) => m.featured === true);
    return filtered.slice(0, 10);
  } catch (error) {
    console.warn('[getFeaturedManga] Falling back to client-side filter:', error);
    try {
      const allManga = await getAllManga([orderBy('updatedAt', 'desc'), limit(50)]);
      return allManga.filter((m) => m.featured === true).slice(0, 10);
    } catch (err) {
      console.error('Error fetching featured manga:', err);
      return DEMO_MANGA.filter((m) => m.featured);
    }
  }
}

export async function getTrendingManga(): Promise<Manga[]> {
  try {
    const allManga = await getAllManga([
      where('trending', '==', true),
      orderBy('rating', 'desc'),
      limit(20),
    ]);
    return allManga
      .filter((m) => m.trending === true)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 20);
  } catch (error) {
    console.warn('[getTrendingManga] Falling back to client-side filter:', error);
    try {
      const allManga = await getAllManga([orderBy('rating', 'desc'), limit(50)]);
      return allManga.filter((m) => m.trending === true).slice(0, 20);
    } catch (err) {
      console.error('Error fetching trending manga:', err);
      return DEMO_MANGA.filter((m) => m.trending);
    }
  }
}

export async function getLatestManga(count = 20): Promise<Manga[]> {
  const list = await getAllManga([orderBy('createdAt', 'desc'), limit(count)]);
  return list.slice(0, count);
}

export async function getMangaByLanguage(language: 'en' | 'bn', count = 10): Promise<Manga[]> {
  try {
    const allManga = await getAllManga([
      where('language', '==', language),
      orderBy('updatedAt', 'desc'),
      limit(count),
    ]);
    return allManga.filter((m) => m.language === language).slice(0, count);
  } catch (error) {
    console.warn('[getMangaByLanguage] Falling back to client-side filter:', error);
    try {
      const allManga = await getAllManga([orderBy('updatedAt', 'desc'), limit(50)]);
      return allManga.filter((m) => m.language === language).slice(0, count);
    } catch (err) {
      console.error('Error fetching manga by language:', err);
      return DEMO_MANGA.filter((m) => m.language === language).slice(0, count);
    }
  }
}

export async function getMangaByGenre(genreSlug: string, constraints: QueryConstraint[] = []): Promise<Manga[]> {
  const allGenre = await getAllManga([orderBy('updatedAt', 'desc'), ...constraints]);
  return allGenre.filter((m) => m.genres.some((g) => g.toLowerCase() === genreSlug.toLowerCase()));
}

export async function searchManga(searchTerm: string): Promise<Manga[]> {
  const all = await getAllManga([orderBy('updatedAt', 'desc'), limit(200)]);
  const lower = searchTerm.toLowerCase();
  return all.filter(
    (m) =>
      m.title.toLowerCase().includes(lower) ||
      (m.titleBn && m.titleBn.includes(searchTerm)) ||
      m.author.toLowerCase().includes(lower)
  );
}

/**
 * Remove undefined values from an object before writing to Firestore.
 * Firestore does NOT accept undefined field values — they cause:
 * "Function addDoc() called with invalid data. Unsupported field value: undefined"
 */
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj } as Record<string, unknown>;
  for (const key of Object.keys(cleaned)) {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  }
  return cleaned as T;
}

export async function addManga(data: Omit<Manga, 'id'>): Promise<string> {
  try {
    const db = getFirebaseDb();
    const cleanData = removeUndefined({
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    const docRef = await addDoc(collection(db, 'manga'), cleanData);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'manga');
  }
}

export async function updateManga(id: string, data: Partial<Manga>): Promise<void> {
  try {
    const cleanData = removeUndefined({
      ...data,
      updatedAt: Timestamp.now(),
    });
    await updateDoc(doc(getFirebaseDb(), 'manga', id), cleanData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `manga/${id}`);
  }
}

export async function deleteManga(id: string): Promise<void> {
  // Delete all chapters first
  const chapters = await getChaptersByMangaId(id);
  for (const ch of chapters) {
    await deleteDoc(doc(getFirebaseDb(), 'manga', id, 'chapters', ch.id));
  }
  await deleteDoc(doc(getFirebaseDb(), 'manga', id));
}

// ─── Chapter CRUD ──────────────────────────────────────────

export async function getChaptersByMangaId(mangaId: string): Promise<Chapter[]> {
  if (mangaId.startsWith('demo-')) {
    const slug = mangaId.replace(/^demo-/, '');
    return DEMO_CHAPTERS_BY_SLUG[slug] || [];
  }
  try {
    const q = query(
      collection(getFirebaseDb(), 'manga', mangaId, 'chapters'),
      orderBy('chapterNumber', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Chapter);
  } catch (error) {
    console.error('Error fetching chapters:', error);
    return [];
  }
}

export async function addChapter(
  mangaId: string,
  data: Omit<Chapter, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(
    collection(getFirebaseDb(), 'manga', mangaId, 'chapters'),
    removeUndefined({
      ...data,
      createdAt: serverTimestamp(),
    })
  );

  // Update totalChapters count on the manga document
  const chapters = await getChaptersByMangaId(mangaId);
  await updateDoc(doc(getFirebaseDb(), 'manga', mangaId), {
    totalChapters: chapters.length,
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateChapter(mangaId: string, chapterId: string, data: Partial<Chapter>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'manga', mangaId, 'chapters', chapterId), data);
}

export async function deleteChapter(mangaId: string, chapterId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'manga', mangaId, 'chapters', chapterId));

  // Update totalChapters count
  const chapters = await getChaptersByMangaId(mangaId);
  await updateDoc(doc(getFirebaseDb(), 'manga', mangaId), {
    totalChapters: chapters.length,
    updatedAt: Timestamp.now(),
  });
}

// ─── Genre CRUD ────────────────────────────────────────────

export async function getAllGenres(): Promise<Genre[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'genres'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Genre);
    }
    return DEMO_GENRES;
  } catch (error) {
    console.error('Error fetching genres:', error);
    return DEMO_GENRES;
  }
}

export async function getGenreBySlug(slug: string): Promise<Genre | null> {
  try {
    const q = query(collection(getFirebaseDb(), 'genres'), where('slug', '==', slug), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return { id: snap.docs[0].id, ...snap.docs[0].data() } as Genre;
    }
    const baseSnap = await getDocs(query(collection(getFirebaseDb(), 'genres'), limit(1)));
    return baseSnap.empty ? DEMO_GENRES.find((g) => g.slug === slug) || null : null;
  } catch (error) {
    console.error('Error fetching genre by slug:', error);
    return DEMO_GENRES.find((g) => g.slug === slug) || null;
  }
}

export async function addGenre(data: Omit<Genre, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(getFirebaseDb(), 'genres'), data);
  return docRef.id;
}

export async function updateGenre(id: string, data: Partial<Genre>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'genres', id), data);
}

export async function deleteGenre(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'genres', id));
}

// ─── Bookmarks ─────────────────────────────────────────────

export interface BookmarkData {
  mangaId: string;
  title: string;
  titleBn?: string;
  slug: string;
  coverImage: string;
  rating: number;
  status: 'ongoing' | 'completed' | 'hiatus';
  totalChapters: number;
  language: 'en' | 'bn';
  genres: string[];
  bookmarkedAt: Timestamp;
}

export async function addBookmark(userId: string, manga: Manga): Promise<void> {
  const bookmarkRef = doc(getFirebaseDb(), 'users', userId, 'bookmarks', manga.id);
  await setDoc(
    bookmarkRef,
    removeUndefined({
      mangaId: manga.id,
      title: manga.title,
      ...(manga.titleBn ? { titleBn: manga.titleBn } : {}),
      slug: manga.slug,
      coverImage: manga.coverImage,
      rating: manga.rating,
      status: manga.status,
      totalChapters: manga.totalChapters,
      language: manga.language,
      genres: manga.genres,
      bookmarkedAt: serverTimestamp(),
    }),
    { merge: true }
  );
}

export async function removeBookmark(userId: string, mangaId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'users', userId, 'bookmarks', mangaId));
}

export async function getUserBookmarks(userId: string): Promise<BookmarkData[]> {
  const q = query(
    collection(getFirebaseDb(), 'users', userId, 'bookmarks'),
    orderBy('bookmarkedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ mangaId: d.id, ...d.data() }) as BookmarkData);
}

export async function isBookmarked(userId: string, mangaId: string): Promise<boolean> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', userId, 'bookmarks', mangaId));
  return snap.exists();
}

export async function getBookmarkedManga(userId: string): Promise<Manga[]> {
  const bookmarks = await getUserBookmarks(userId);
  if (bookmarks.length === 0) return [];

  const db = getFirebaseDb();
  const mangaList: Manga[] = [];

  // ✅ Batch fetch using where('in', ...) — Firestore allows up to 10 IDs per query.
  // For more than 10 bookmarks, we chunk and run multiple parallel queries.
  const chunkSize = 10;
  const chunks: string[][] = [];
  for (let i = 0; i < bookmarks.length; i += chunkSize) {
    chunks.push(bookmarks.slice(i, i + chunkSize).map((b) => b.mangaId));
  }

  const results = await Promise.all(
    chunks.map((ids) => getDocs(query(collection(db, 'manga'), where('__name__', 'in', ids))))
  );

  // Preserve bookmark order
  const orderMap = new Map(bookmarks.map((b, i) => [b.mangaId, i]));
  for (const snap of results) {
    for (const docSnap of snap.docs) {
      const manga = { id: docSnap.id, ...docSnap.data() } as Manga;
      mangaList.push(manga);
    }
  }
  mangaList.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return mangaList;
}

// ─── Stats ─────────────────────────────────────────────────

export async function getStats() {
  try {
    const q = query(collection(getFirebaseDb(), 'manga'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const allManga = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Manga);
    return {
      total: allManga.length,
      en: allManga.filter((m) => m.language === 'en').length,
      bn: allManga.filter((m) => m.language === 'bn').length,
      ongoing: allManga.filter((m) => m.status === 'ongoing').length,
      completed: allManga.filter((m) => m.status === 'completed').length,
      recent: allManga.slice(0, 5),
    };
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return { total: 0, en: 0, bn: 0, ongoing: 0, completed: 0, recent: [] as Manga[] };
  }
}

// ─── Announcements / Blog ──────────────────────────────────

export async function addAnnouncement(data: Omit<Announcement, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(getFirebaseDb(), 'announcements'), removeUndefined({
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }));
  return docRef.id;
}

export async function getAllAnnouncements(): Promise<Announcement[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'announcements'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
    }
    return DEMO_ANNOUNCEMENTS;
  } catch (error) {
    console.error('Error fetching announcements:', error);
    return DEMO_ANNOUNCEMENTS;
  }
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'announcements', id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as Announcement;
    }
    const baseSnap = await getDocs(query(collection(getFirebaseDb(), 'announcements'), limit(1)));
    return baseSnap.empty ? DEMO_ANNOUNCEMENTS.find((a) => a.id === id) || null : null;
  } catch (error) {
    console.error('Error fetching announcement:', error);
    return DEMO_ANNOUNCEMENTS.find((a) => a.id === id) || null;
  }
}

export async function updateAnnouncement(id: string, data: Partial<Announcement>): Promise<void> {
  try {
    await updateDoc(doc(getFirebaseDb(), 'announcements', id), removeUndefined({
      ...data,
      updatedAt: Timestamp.now(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `announcements/${id}`);
  }
}

export async function deleteAnnouncement(id: string): Promise<void> {
  try {
    await deleteDoc(doc(getFirebaseDb(), 'announcements', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
  }
}

export async function getLatestAnnouncements(count = 5): Promise<Announcement[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'announcements'), orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Announcement);
    }
    return DEMO_ANNOUNCEMENTS.slice(0, count);
  } catch (error) {
    console.error('Error fetching latest announcements:', error);
    return DEMO_ANNOUNCEMENTS.slice(0, count);
  }
}

// ─── Notifications ─────────────────────────────────────────

export async function addNotification(data: Omit<Notification, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(getFirebaseDb(), 'notifications'), removeUndefined({
      ...data,
      createdAt: Timestamp.now(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
  }
}

export async function getNotifications(count = 20): Promise<Notification[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'notifications'), orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
    }
    return DEMO_NOTIFICATIONS.slice(0, count);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return DEMO_NOTIFICATIONS.slice(0, count);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  try {
    await deleteDoc(doc(getFirebaseDb(), 'notifications', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `notifications/${id}`);
  }
}

// ─── Upcoming Releases ─────────────────────────────────────

export async function addUpcomingRelease(data: Omit<UpcomingRelease, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(getFirebaseDb(), 'upcomingReleases'), removeUndefined({
      ...data,
      createdAt: Timestamp.now(),
    }));
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'upcomingReleases');
  }
}

export async function getUpcomingReleases(): Promise<UpcomingRelease[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'upcomingReleases'), orderBy('releaseDate', 'asc'), limit(20));
    const snap = await getDocs(q);
    if (snap.empty) {
      return getDemoUpcomingReleases();
    }
    const now = Date.now();
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as UpcomingRelease)
      .filter((r) => r.releaseDate.toMillis() > now);
  } catch (error) {
    console.error('Error fetching upcoming releases:', error);
    return getDemoUpcomingReleases();
  }
}

export async function deleteUpcomingRelease(id: string): Promise<void> {
  try {
    await deleteDoc(doc(getFirebaseDb(), 'upcomingReleases', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `upcomingReleases/${id}`);
  }
}

export async function getAllUpcomingReleases(): Promise<UpcomingRelease[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'upcomingReleases'), orderBy('releaseDate', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UpcomingRelease);
  } catch (error) {
    console.error('Error fetching all upcoming releases:', error);
    return [];
  }
}

// ─── User Requests ─────────────────────────────────────────

export async function addRequest(
  data: Omit<MangaRequest, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const docRef = await addDoc(
      collection(getFirebaseDb(), 'requests'),
      removeUndefined({
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'requests');
  }
}

export async function getAllRequests(): Promise<MangaRequest[]> {
  try {
    const q = query(collection(getFirebaseDb(), 'requests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as MangaRequest);
    }
    return DEMO_REQUESTS;
  } catch (error) {
    console.error('Error fetching requests:', error);
    return DEMO_REQUESTS;
  }
}

export async function updateRequest(id: string, data: Partial<MangaRequest>): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'requests', id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteRequest(id: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'requests', id));
}

export async function upvoteRequest(id: string, userId: string): Promise<void> {
  const reqDoc = doc(getFirebaseDb(), 'requests', id);

  await runTransaction(getFirebaseDb(), async (tx) => {
    const snap = await tx.get(reqDoc);
    if (!snap.exists()) return;

    const data = snap.data() as MangaRequest;
    const upvotedBy = Array.isArray(data.upvotedBy) ? data.upvotedBy : [];
    const currentUpvotes = typeof data.upvotes === 'number' ? data.upvotes : upvotedBy.length;

    if (upvotedBy.includes(userId)) {
      tx.update(reqDoc, {
        upvotes: Math.max(0, currentUpvotes - 1),
        upvotedBy: upvotedBy.filter((u) => u !== userId),
        updatedAt: serverTimestamp(),
      });
    } else {
      if (upvotedBy.length >= 500) {
        throw new Error('Maximum upvote limit (500) reached for this request.');
      }
      tx.update(reqDoc, {
        upvotes: currentUpvotes + 1,
        upvotedBy: [...upvotedBy, userId],
        updatedAt: serverTimestamp(),
      });
    }
  });
}
