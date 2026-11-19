// Server-side authentication & authorization helpers for Next.js API routes.
import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminFirestore, hasAdminCredentials } from '@/lib/firebase-admin';

export const SESSION_COOKIE_NAME = 'mangabd-session';

const ADMIN_CACHE_TTL_MS = 60 * 1000; // 60 seconds
const adminUidCache = new Map<string, { isAdmin: boolean; expiresAt: number }>();

export interface VerifiedUser {
  uid: string;
  email?: string;
  displayName?: string;
  emailVerified: boolean;
  isAdmin: boolean;
}

/**
 * Checks whether a UID has an `admins/{uid}` document in Firestore (Admin SDK),
 * with a 60-second in-memory TTL cache.
 */
export async function isAdminUid(uid: string): Promise<boolean> {
  if (!uid || !hasAdminCredentials()) return false;

  const now = Date.now();
  const cached = adminUidCache.get(uid);
  if (cached && cached.expiresAt > now) {
    return cached.isAdmin;
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('admins').doc(uid).get();
    const isAdmin = snap.exists;
    adminUidCache.set(uid, { isAdmin, expiresAt: now + ADMIN_CACHE_TTL_MS });
    return isAdmin;
  } catch (error) {
    console.error('[server-auth] Failed to check admins/{uid}:', error);
    return false;
  }
}

/**
 * Verifies a Firebase Auth ID token using Firebase Admin SDK (`admin.auth().verifyIdToken`).
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedUser | null> {
  if (!idToken || !hasAdminCredentials()) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const isAdmin = await isAdminUid(decoded.uid);
    return {
      uid: decoded.uid,
      email: decoded.email,
      displayName: decoded.name,
      emailVerified: Boolean(decoded.email_verified),
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
 * Authorizes an Admin API request using either:
 * 1) `Authorization: Bearer <idToken>` verified via Firebase Admin SDK + `admins/{uid}` lookup, or
 * 2) Cryptographically signed Firebase `mangabd-session` cookie verified via `verifySessionCookie`.
 */
export async function authorizeAdminRequest(request: NextRequest): Promise<boolean> {
  if (!hasAdminCredentials()) return false;

  const user = await getAuthenticatedUser(request);
  if (user?.isAdmin) return true;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return false;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return await isAdminUid(decoded.uid);
  } catch {
    return false;
  }
}
