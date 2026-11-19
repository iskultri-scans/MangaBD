'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { SITE_CONFIG } from '@/lib/config';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useToast } from '@/components/ui/Toast';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';

const LOCK_DURATION = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        setLockedUntil(null);
        setFailedAttempts(0);
        setCountdown('');
        clearInterval(interval);
        return;
      }
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${mins}:${secs.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockedUntil && Date.now() < lockedUntil) return;

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);

      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error('Unauthorized');
      }

      setFailedAttempts(0);
      showToast('Signed in successfully!', 'success');
      router.push('/admin');
    } catch {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= MAX_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCK_DURATION);
        showToast('Too many failed attempts. Locked for 15 minutes.', 'error');
      } else {
        showToast(`Invalid credentials. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (lockedUntil && Date.now() < lockedUntil) return;
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(getFirebaseAuth(), provider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error('Unauthorized');
      }
      showToast('Signed in with Google!', 'success');
      router.push('/admin');
    } catch {
      showToast('Admin Google sign-in failed or unauthorized email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;
  const inputClass =
    'w-full px-3.5 py-2.5 rounded-lg text-sm outline-none border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:border-[var(--accent)] transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md rounded-xl p-7 sm:p-8 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 border border-[var(--border-color)] bg-[var(--accent-glow)]">
            <Shield size={22} className="text-[var(--accent)]" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Manga<span className="text-[var(--accent)]">BD</span>
          </h1>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mt-1">
            Editorial Admin Access
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              <Mail size={13} /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLocked}
              className={inputClass}
              placeholder="admin@mangabd.app"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
              <Lock size={13} /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLocked}
              className={inputClass}
              placeholder="Enter password"
            />
          </div>

          {isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertCircle size={16} className="text-red-500" />
              <span className="font-mono-num text-sm text-red-500">
                Locked. Try again in {countdown}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="btn-accent w-full py-2.5 text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Lock size={15} />
                Sign In
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || isLocked}
            className="w-full py-2.5 rounded-lg text-sm font-medium border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  );
}
