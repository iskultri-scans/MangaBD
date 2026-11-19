'use client';

import React, { useEffect, useState } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Megaphone,
  PenLine,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  getAllManga,
  getAllAnnouncements,
  type Manga,
  type Announcement,
} from '@/lib/firestore';
import { getFirebaseAuth } from '@/lib/firebase';
import { SITE_CONFIG } from '@/lib/config';
import { useToast } from '@/components/ui/Toast';

type SourceMode = 'manga' | 'announcement' | 'custom';

export default function AdminTelegramPage() {
  const { showToast } = useToast();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [channelUrl, setChannelUrl] = useState(SITE_CONFIG.social.telegram);

  const [mangaList, setMangaList] = useState<Manga[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [sourceMode, setSourceMode] = useState<SourceMode>('manga');
  const [selectedMangaId, setSelectedMangaId] = useState('');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');

  const [tag, setTag] = useState('NEW RELEASE');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [buttonLabel, setButtonLabel] = useState('Read on MangaBD');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [statusRes, mangaData, announcementData] = await Promise.all([
          fetch('/api/telegram/notify').then((r) => r.json()).catch(() => ({ configured: false })),
          getAllManga().catch(() => [] as Manga[]),
          getAllAnnouncements().catch(() => [] as Announcement[]),
        ]);
        setConfigured(Boolean(statusRes?.configured));
        if (statusRes?.channelUrl) setChannelUrl(statusRes.channelUrl);
        setMangaList(mangaData);
        setAnnouncements(announcementData);
      } finally {
        setLoadingData(false);
      }
    }
    load();
  }, []);

  const handleSelectManga = (id: string) => {
    setSelectedMangaId(id);
    const m = mangaList.find((item) => item.id === id);
    if (!m) return;
    setTag('NEW UPDATE');
    setTitle(m.title);
    const desc = (m.description || '').trim();
    setMessage(
      `${desc ? desc.slice(0, 220) + (desc.length > 220 ? '...' : '') : 'Check out this series on MangaBD!'}\n\nChapters: ${m.totalChapters} · Status: ${m.status.toUpperCase()} · Rating: ★ ${m.rating}`
    );
    setUrl(`${SITE_CONFIG.url}/manga/${m.slug}`);
    setCoverImage(m.coverImage || '');
    setButtonLabel('Read on MangaBD');
  };

  const handleSelectAnnouncement = (id: string) => {
    setSelectedAnnouncementId(id);
    const a = announcements.find((item) => item.id === id);
    if (!a) return;
    setTag(a.type === 'upcoming' ? 'UPCOMING' : 'ANNOUNCEMENT');
    setTitle(a.title || a.titleBn || '');
    const content = (a.content || a.contentBn || '').trim();
    setMessage(content.slice(0, 400));
    setUrl(`${SITE_CONFIG.url}/blog/${a.id}`);
    setCoverImage(a.coverImage || '');
    setButtonLabel('View Announcement');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setSending(true);
    try {
      const idToken = await getFirebaseAuth().currentUser?.getIdToken(true);
      if (!idToken) {
        showToast('Authentication required. Please sign in again.', 'error');
        return;
      }
      const res = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          tag: tag.trim() || undefined,
          title: title.trim(),
          message: message.trim(),
          url: url.trim() || undefined,
          coverImage: coverImage.trim() || undefined,
          buttonLabel: buttonLabel.trim() || 'Read on MangaBD',
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        showToast(data?.error || 'Failed to send Telegram broadcast.', 'error');
        return;
      }

      showToast(
        `Broadcast sent to Telegram (${data.method === 'sendPhoto' ? 'with cover photo' : 'text message'})!`,
        'success'
      );
    } catch {
      showToast('Network error while sending Telegram broadcast.', 'error');
    } finally {
      setSending(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  return (
    <div>
      <AdminHeader
        title="Telegram Broadcast"
        subtitle="Send formatted updates, chapter alerts, and cover previews directly to your MangaBD Telegram channel"
        actions={
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/15 transition-colors"
          >
            <ExternalLink size={14} />
            Open Channel
          </a>
        }
      />

      {/* Server Connection Status Banner */}
      <div
        className={`rounded-xl p-4 mb-6 flex items-start gap-3 border ${
          configured === true
            ? 'bg-emerald-500/10 border-emerald-500/25'
            : configured === false
              ? 'bg-amber-500/10 border-amber-500/25'
              : 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
        }`}
      >
        {configured === true ? (
          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="text-xs sm:text-sm">
          {configured === null ? (
            <p className="text-[var(--text-secondary)]">Checking Telegram Bot status...</p>
          ) : configured ? (
            <>
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">Telegram Bot Connected</p>
              <p className="text-[var(--text-secondary)] mt-0.5">
                Server credentials are configured. You can broadcast live updates below or automatically when publishing manga and chapters.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-amber-700 dark:text-amber-400">Server Configuration Required</p>
              <p className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                Add <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--accent)] font-mono-num">TELEGRAM_BOT_TOKEN</code> and{' '}
                <code className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--accent)] font-mono-num">TELEGRAM_CHAT_ID</code> (for example <code className="px-1 py-0.5 rounded bg-[var(--bg-subtle)] font-mono-num">@yourchannel</code>) to your server environment variables to activate live broadcasting.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Composer */}
        <form
          onSubmit={handleSend}
          className="xl:col-span-3 rounded-xl p-5 sm:p-6 space-y-4 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
        >
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Quick Fill Source
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'manga' as const, label: 'Manga', icon: BookOpen },
                { id: 'announcement' as const, label: 'Blog / News', icon: Megaphone },
                { id: 'custom' as const, label: 'Custom Post', icon: PenLine },
              ].map((tab) => {
                const active = sourceMode === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceMode(tab.id)}
                    className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                        : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {sourceMode === 'manga' && (
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Select Manga from Catalog
              </label>
              <select
                value={selectedMangaId}
                onChange={(e) => handleSelectManga(e.target.value)}
                disabled={loadingData}
                className={inputClass}
              >
                <option value="">
                  {loadingData ? 'Loading catalog...' : '-- Pick a manga to auto-fill --'}
                </option>
                {mangaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.totalChapters} ch)
                  </option>
                ))}
              </select>
            </div>
          )}

          {sourceMode === 'announcement' && (
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Select Blog / Announcement
              </label>
              <select
                value={selectedAnnouncementId}
                onChange={(e) => handleSelectAnnouncement(e.target.value)}
                disabled={loadingData}
                className={inputClass}
              >
                <option value="">
                  {loadingData ? 'Loading announcements...' : '-- Pick an announcement to auto-fill --'}
                </option>
                {announcements.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title || a.titleBn}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Tag Label</label>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="NEW CHAPTER"
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Headline *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Solo Leveling — Chapter 180"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Message Body *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              placeholder="Write your announcement or chapter release note..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
                Target Link URL (HTTPS for inline button)
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={`${SITE_CONFIG.url}/manga/...`}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Button Label</label>
              <input
                value={buttonLabel}
                onChange={(e) => setButtonLabel(e.target.value)}
                placeholder="Read on MangaBD"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">
              Cover Image URL (optional, HTTPS)
            </label>
            <input
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={sending || !configured || !title.trim() || !message.trim()}
            className="btn-accent w-full py-3 text-sm flex items-center justify-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending to Telegram...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Telegram Broadcast
              </>
            )}
          </button>
        </form>

        {/* Live Telegram Message Preview */}
        <div className="xl:col-span-2">
          <div className="rounded-xl p-5 sticky top-6 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
            <h3 className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Send size={16} className="text-sky-500" />
              Live Telegram Preview
            </h3>

            <div
              className="rounded-xl overflow-hidden border border-white/10"
              style={{ background: '#17212b' }}
            >
              {coverImage ? (
                <div className="relative h-48 bg-black/30">
                  <img
                    src={coverImage}
                    alt="Telegram preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center gap-2 text-xs text-slate-400 bg-black/20">
                  <ImageIcon size={16} />
                  No cover image attached
                </div>
              )}

              <div className="p-4 text-sm text-slate-100 space-y-2">
                {tag && (
                  <p className="font-mono-num text-xs font-bold text-sky-400 tracking-wide">
                    [{tag.toUpperCase()}]
                  </p>
                )}
                <p className="font-bold text-white leading-snug">
                  {title || 'Your Headline Preview'}
                </p>
                <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {message || 'Your broadcast message will appear here with clean HTML formatting.'}
                </p>
                <p className="text-xs italic text-slate-400 pt-1">— MangaBD</p>
              </div>

              {url && (
                <div className="px-4 pb-4">
                  <div className="w-full py-2.5 px-3 rounded-lg text-center text-xs font-semibold text-white bg-[#2b5278]">
                    {buttonLabel || 'Read on MangaBD'} ↗
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
