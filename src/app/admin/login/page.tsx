'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { useToast } from '@/components/ui/Toast';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { BrandLogo } from '@/components/layout/BrandLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(getFirebaseAuth(), provider);
      // Immediately exchange fresh ID token (within Firebase's 5-min freshness window) for signed session cookie
      const idToken = await cred.user.getIdToken(true);
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error('Unauthorized admin account');
      }
      showToast('Signed in to Admin Panel!', 'success');
      router.push('/admin');
    } catch {
      showToast('Admin Google sign-in failed or account is not authorized.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg-primary)]">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent-glow)] text-[var(--accent)] mb-3">
            <ShieldCheck size={24} />
          </div>
          <div className="flex justify-center">
            <BrandLogo size="md" suffix="Admin" />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1.5">
            Sign in with your authorized Google admin account
          </p>
        </div>

        <div className="rounded-xl p-6 sm:p-8 border border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2.5 border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <svg width="17" height="17" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Verifying admin...' : 'Continue with Google'}
          </button>

          <div className="mt-5 text-center">
            <Link href="/" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              &larr; Back to MangaBD
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
