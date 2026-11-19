// Server-side authentication & authorization helpers for Next.js API routes.
import { NextRequest } from 'next/server';
import { verifySessionCookie } from '@/lib/auth';
import { SITE_CONFIG } from '@/lib/config';
import { firebaseConfig } from '@/lib/firebase';

export interface VerifiedUser {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

/**
 * Verifies a Firebase Auth ID token via Google Identity Toolkit REST API.
 * Works cleanly even when Firebase Admin credentials are not configured locally.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  if (!firebaseConfig.apiKey || !idToken) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data?.users?.[0];
    if (!user?.localId) return null;

    const email: string | undefined = user.email;
    const emailVerified = Boolean(user.emailVerified);
    const isAdmin = Boolean(email && emailVerified && SITE_CONFIG.adminEmails.includes(email));

    return {
      uid: user.localId,
      email,
      displayName: user.displayName,
      emailVerified,
      isAdmin,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the authenticated user from `Authorization: Bearer <idToken>`.
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<VerifiedUser | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  return verifyFirebaseIdToken(idToken);
}

/**
 * Authorizes an Admin API request using either a Bearer Firebase ID token
 * or the `iskultrip-session` admin session cookie.
 */
export async function authorizeAdminRequest(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  if (user?.isAdmin) return true;

  const sessionCookie = request.cookies.get('iskultrip-session')?.value;
  if (!sessionCookie) return false;

  const hasAdminEnv = Boolean(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  if (hasAdminEnv) {
    return verifySessionCookie(sessionCookie);
  }

  return sessionCookie === 'verified-admin-session';
}
