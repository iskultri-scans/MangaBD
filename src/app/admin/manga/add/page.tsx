'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { MangaForm } from '@/components/admin/MangaForm';
import { addManga, getAllGenres, addNotification, type Genre } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseAuth } from '@/lib/firebase';
import { SITE_CONFIG } from '@/lib/config';
import { Timestamp } from 'firebase/firestore';

export default function AddMangaPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, isAdmin } = useAuth();
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);
  const [telegramConfigured, setTelegramConfigured] = useState(false);
  const [broadcastTelegram, setBroadcastTelegram] = useState(false);

  useEffect(() => {
    getAllGenres().then(setGenres);
    fetch('/api/telegram/notify')
      .then((res) => res.json())
      .then((data) => {
        if (data?.configured) {
          setTelegramConfigured(true);
          setBroadcastTelegram(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!user) {
      showToast('You must be logged in to add manga', 'error');
      return;
    }
    if (!isAdmin) {
      showToast('You do not have admin permission to add manga', 'error');
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const currentUser = auth.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken(true) : undefined;

      await addManga({
        title: data.title as string,
        titleBn: (data.titleBn as string) || undefined,
        slug: data.slug as string,
        description: (data.description as string) || '',
        coverImage: data.coverImage as string,
        bannerImage: (data.bannerImage as string) || undefined,
        genres: data.genres as string[],
        author: (data.author as string) || '',
        artist: (data.artist as string) || '',
        status: data.status as 'ongoing' | 'completed' | 'hiatus',
        rating: Number(data.rating),
        totalChapters: Number(data.totalChapters),
        language: data.language as 'en' | 'bn',
        featured: data.featured as boolean,
        trending: data.trending as boolean,
        isAdult: (data.isAdult as boolean) || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      const title = data.title as string;
      const slug = data.slug as string;

      try {
        await addNotification({
          title: `New Manga: ${title}`,
          message: `${title} has been added to MangaBD!`,
          type: 'new_manga',
          mangaSlug: slug,
          createdAt: Timestamp.now(),
        });
      } catch (notifError) {
        console.error('Failed to create notification:', notifError);
      }

      if (broadcastTelegram && telegramConfigured) {
        try {
          const synopsis = ((data.description as string) || '').trim();
          if (!idToken) {
            throw new Error('Authentication required for Telegram broadcast.');
          }
          const tgRes = await fetch('/api/telegram/notify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              tag: 'NEW SERIES',
              title,
              message: synopsis
                ? `${synopsis.slice(0, 260)}${synopsis.length > 260 ? '...' : ''}`
                : `${title} is now available on MangaBD!`,
              url: `${SITE_CONFIG.url}/manga/${slug}`,
              coverImage: data.coverImage as string,
              buttonLabel: 'View Series on MangaBD',
            }),
          });
          if (!tgRes.ok) {
            showToast('Manga added, but Telegram broadcast failed.', 'error');
          }
        } catch {
          showToast('Manga added, but Telegram broadcast failed.', 'error');
        }
      }

      showToast('Manga added successfully!', 'success');
      router.push('/admin/manga');
    } catch (error: unknown) {
      console.error('Error adding manga:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to add manga';
      if (errorMsg.includes('permission-denied') || errorMsg.includes('PERMISSION_DENIED')) {
        showToast('Permission denied — make sure you are logged in as admin', 'error');
      } else if (errorMsg.includes('network') || errorMsg.includes('offline')) {
        showToast('Network error — check your internet connection', 'error');
      } else if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        showToast('A manga with this slug already exists', 'error');
      } else {
        showToast(`Failed to add manga: ${errorMsg}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Add Manga" subtitle="Add a new series to the MangaBD catalog" />

      <div className="mb-5 max-w-2xl">
        <label className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer text-xs sm:text-sm border border-sky-500/25 bg-sky-500/10">
          <input
            type="checkbox"
            checked={broadcastTelegram}
            disabled={!telegramConfigured}
            onChange={(e) => setBroadcastTelegram(e.target.checked)}
            className="w-4 h-4 rounded accent-[#0088cc] disabled:opacity-40"
          />
          <Send size={15} className="text-sky-500 flex-shrink-0" />
          <span className="text-[var(--text-primary)] font-medium">
            Also broadcast new series to Telegram Channel
            {!telegramConfigured && (
              <span className="text-xs text-[var(--text-muted)] font-normal block mt-0.5">
                Configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID on the server to enable automatic channel posts.
              </span>
            )}
          </span>
        </label>
      </div>

      <MangaForm
        onSubmit={handleSubmit}
        genres={genres.map((g) => ({ name: g.name, slug: g.slug }))}
        loading={loading}
        submitLabel="Add Manga"
      />
    </div>
  );
}
