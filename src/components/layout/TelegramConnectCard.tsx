'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { Send, CheckCircle2, Bell, BellOff, Unlink, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getFirebaseDb } from '@/lib/firebase';
import { useToast } from '@/components/ui/Toast';

interface TelegramStatus {
  linked: boolean;
  telegramUsername: string | null;
  notificationsEnabled: boolean;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 3 * 60 * 1000; // stop silent polling after 3 minutes

export function TelegramConnectCard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [togglingNotif, setTogglingNotif] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState<string | null>(null);
  const pendingRef = useRef<boolean>(false);

  useEffect(() => {
    pendingRef.current = Boolean(pendingDeepLink);
  }, [pendingDeepLink]);

  const fetchStatus = useCallback(
    async (silent = false) => {
      if (!user) return;
      if (!silent) setLoading(true);
      try {
        const idToken = await user.getIdToken();
        const res = await fetch('/api/telegram/link-token', {
          headers: { Authorization: `Bearer ${idToken}` },
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          const isLinked = Boolean(data.linked);
          setStatus({
            linked: isLinked,
            telegramUsername: data.telegramUsername || null,
            notificationsEnabled: data.notificationsEnabled ?? true,
          });
          if (isLinked) {
            if (pendingRef.current) {
              showToast('Telegram account connected!', 'success');
            }
            setPendingDeepLink(null);
          }
        }
      } catch (error) {
        if (!silent) {
          console.error('Failed to load Telegram link status:', error);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user, showToast]
  );

  useEffect(() => {
    fetchStatus(false);
  }, [fetchStatus]);

  // Auto-poll & refresh on focus/visibility while user is completing /start in Telegram
  useEffect(() => {
    if (!pendingDeepLink || status?.linked) return;

    const startedAt = Date.now();
    const interval = setInterval(() => {
      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) {
        clearInterval(interval);
        return;
      }
      fetchStatus(true);
    }, POLL_INTERVAL_MS);

    const handleReturn = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(true);
      }
    };

    window.addEventListener('focus', handleReturn);
    document.addEventListener('visibilitychange', handleReturn);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleReturn);
      document.removeEventListener('visibilitychange', handleReturn);
    };
  }, [pendingDeepLink, status?.linked, fetchStatus]);

  const handleConnect = async () => {
    if (!user) return;
    setConnecting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/telegram/link-token', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.deepLink) {
        showToast(data.error || 'Could not generate Telegram link', 'error');
        return;
      }
      setPendingDeepLink(data.deepLink);
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
      showToast('Opened Telegram! Tap "Start" in the bot — status will auto-update.', 'info');
    } catch {
      showToast('Failed to start Telegram connection', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user || !status) return;
    const nextValue = !status.notificationsEnabled;
    setTogglingNotif(true);
    try {
      await setDoc(
        doc(getFirebaseDb(), 'users', user.uid),
        {
          notificationsEnabled: nextValue,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setStatus((prev) => (prev ? { ...prev, notificationsEnabled: nextValue } : prev));
      showToast(
        nextValue ? 'Telegram alerts enabled' : 'Telegram alerts muted',
        'success'
      );
    } catch (error) {
      console.error('Failed to update notification preference:', error);
      showToast('Failed to update notification setting', 'error');
    } finally {
      setTogglingNotif(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    setDisconnecting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/telegram/link-token', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!res.ok) {
        showToast('Failed to disconnect Telegram', 'error');
        return;
      }
      setStatus({ linked: false, telegramUsername: null, notificationsEnabled: false });
      setPendingDeepLink(null);
      showToast('Telegram account disconnected', 'success');
    } catch {
      showToast('Failed to disconnect Telegram', 'error');
    } finally {
      setDisconnecting(false);
    }
  };

  if (!user) return null;

  return (
    <div
      className="p-2.5 rounded-lg space-y-2"
      style={{
        background: 'var(--bg-primary)',
        border: '1px solid var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <Send size={11} className="text-[var(--accent)]" />
          Telegram Alerts
        </span>
        <button
          type="button"
          onClick={() => fetchStatus(false)}
          disabled={loading}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          aria-label="Refresh Telegram status"
          title="Refresh status"
        >
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1.5 text-xs text-[var(--text-muted)]">
          <Loader2 size={13} className="animate-spin" />
          Checking status...
        </div>
      ) : status?.linked ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500">
            <CheckCircle2 size={13} className="shrink-0" />
            <span className="truncate">
              Connected{status.telegramUsername ? ` as @${status.telegramUsername}` : ''}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
              {status.notificationsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
              Chapter DMs
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={status.notificationsEnabled}
              disabled={togglingNotif}
              onClick={handleToggleNotifications}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                status.notificationsEnabled ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  status.notificationsEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent)] hover:bg-[var(--accent-glow)] transition-colors cursor-pointer"
            style={{ border: '1px solid var(--border-color)' }}
          >
            <Unlink size={11} />
            {disconnecting ? 'Disconnecting...' : 'Disconnect Telegram'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] text-[var(--text-muted)] leading-snug">
            Link your Telegram to get instant chapter DMs for bookmarked manga.
          </p>
          <button
            type="button"
            onClick={handleConnect}
            disabled={connecting}
            className="w-full flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            {connecting ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
            {connecting ? 'Generating Link...' : 'Connect Telegram'}
          </button>

          {pendingDeepLink && (
            <div className="space-y-1 pt-0.5">
              <a
                href={pendingDeepLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
              >
                <ExternalLink size={11} />
                Open Telegram Bot Link
              </a>
              <p className="text-[10px] text-center text-[var(--text-muted)]">
                Auto-checking connection...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
