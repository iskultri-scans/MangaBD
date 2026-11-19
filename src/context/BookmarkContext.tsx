'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  addBookmark as addBookmarkToFirestore,
  removeBookmark as removeBookmarkFromFirestore,
  getUserBookmarks,
  type BookmarkData,
  type Manga,
} from '@/lib/firestore';

const STORAGE_KEY = 'iskultrip-bookmarks';

function getLocalBookmarks(): BookmarkData[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveLocalBookmarks(bookmarks: BookmarkData[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch {
    // Storage full or unavailable
  }
}

interface BookmarkContextType {
  bookmarks: BookmarkData[];
  loading: boolean;
  isBookmarked: (mangaId: string) => boolean;
  toggleBookmark: (manga: Manga) => Promise<void>;
  bookmarkCount: number;
  refreshBookmarks: () => Promise<void>;
}

const BookmarkContext = createContext<BookmarkContextType>({
  bookmarks: [],
  loading: true,
  isBookmarked: () => false,
  toggleBookmark: async () => {},
  bookmarkCount: 0,
  refreshBookmarks: async () => {},
});

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkData[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const firestoreBookmarks = await getUserBookmarks(user.uid);
        const localBookmarks = getLocalBookmarks();

        if (localBookmarks.length > 0) {
          const firestoreIds = new Set(firestoreBookmarks.map((b) => b.mangaId));
          const toMigrate = localBookmarks.filter((b) => !firestoreIds.has(b.mangaId));
          const merged = [...toMigrate, ...firestoreBookmarks];
          setBookmarks(merged);
          saveLocalBookmarks([]);
        } else {
          setBookmarks(firestoreBookmarks);
        }
      } else {
        setBookmarks(getLocalBookmarks());
      }
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      setBookmarks(getLocalBookmarks());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const isBookmarked = useCallback(
    (mangaId: string): boolean => {
      return bookmarks.some((b) => b.mangaId === mangaId);
    },
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (manga: Manga) => {
      const isCurrentlyBookmarked = bookmarks.some((b) => b.mangaId === manga.id);

      // Optimistic update
      if (isCurrentlyBookmarked) {
        setBookmarks((prev) => prev.filter((b) => b.mangaId !== manga.id));
      } else {
        const newBookmark: BookmarkData = {
          mangaId: manga.id,
          title: manga.title,
          titleBn: manga.titleBn,
          slug: manga.slug,
          coverImage: manga.coverImage,
          rating: manga.rating,
          status: manga.status,
          totalChapters: manga.totalChapters,
          language: manga.language,
          genres: manga.genres,
          bookmarkedAt: null as any,
        };
        setBookmarks((prev) => [newBookmark, ...prev]);
      }

      try {
        if (user) {
          if (isCurrentlyBookmarked) {
            await removeBookmarkFromFirestore(user.uid, manga.id);
          } else {
            await addBookmarkToFirestore(user.uid, manga);
          }
        } else {
          if (isCurrentlyBookmarked) {
            const updated = bookmarks.filter((b) => b.mangaId !== manga.id);
            saveLocalBookmarks(updated);
          } else {
            const newBookmark: BookmarkData = {
              mangaId: manga.id,
              title: manga.title,
              titleBn: manga.titleBn,
              slug: manga.slug,
              coverImage: manga.coverImage,
              rating: manga.rating,
              status: manga.status,
              totalChapters: manga.totalChapters,
              language: manga.language,
              genres: manga.genres,
              bookmarkedAt: null as any,
            };
            saveLocalBookmarks([newBookmark, ...bookmarks]);
          }
        }

        // Show toast
        toast({
          title: isCurrentlyBookmarked ? 'Bookmark Removed' : 'Bookmark Added',
          description: isCurrentlyBookmarked
            ? `"${manga.title}" removed from bookmarks`
            : `"${manga.title}" added to bookmarks`,
          duration: 2000,
        });
      } catch (error) {
        console.error('Failed to toggle bookmark:', error);
        // Revert on error
        await loadBookmarks();
        toast({
          title: 'Error',
          description: 'Failed to update bookmark. Please try again.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    },
    [bookmarks, user, loadBookmarks, toast]
  );

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        loading,
        isBookmarked,
        toggleBookmark,
        bookmarkCount: bookmarks.length,
        refreshBookmarks: loadBookmarks,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (!context) throw new Error('useBookmarks must be used within BookmarkProvider');
  return context;
}
