import { getAdminAuth } from './firebase-admin';
import { SITE_CONFIG } from './config';

export async function verifyAdminSession(idToken: string): Promise<boolean> {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return Boolean(decodedToken.email && SITE_CONFIG.adminEmails.includes(decodedToken.email));
  } catch {
    return false;
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
  return getAdminAuth().createSessionCookie(idToken, { expiresIn });
}

export async function verifySessionCookie(sessionCookie: string): Promise<boolean> {
  try {
    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return Boolean(decodedClaims.email && SITE_CONFIG.adminEmails.includes(decodedClaims.email));
  } catch {
    return false;
  }
}
