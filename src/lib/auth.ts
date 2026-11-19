import { getAdminAuth } from './firebase-admin';
import { isAdminUid } from './server-auth';

export async function verifyAdminSession(idToken: string): Promise<boolean> {
  try {
    const decodedToken = await getAdminAuth().verifyIdToken(idToken);
    return await isAdminUid(decodedToken.uid);
  } catch {
    return false;
  }
}

export async function createSessionCookie(idToken: string): Promise<string> {
  const expiresIn = 60 * 60 * 24 * 1000; // 24 hours
  return getAdminAuth().createSessionCookie(idToken, { expiresIn });
}

export async function verifySessionCookie(sessionCookie: string): Promise<boolean> {
  try {
    const decodedClaims = await getAdminAuth().verifySessionCookie(sessionCookie, true);
    return await isAdminUid(decodedClaims.uid);
  } catch {
    return false;
  }
}
