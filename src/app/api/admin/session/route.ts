import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, verifyAdminSession } from '@/lib/auth';
import { SITE_CONFIG } from '@/lib/config';
import { firebaseConfig } from '@/lib/firebase';

async function verifyIdTokenViaRest(idToken: string): Promise<{ email?: string; emailVerified?: boolean } | null> {
  if (!firebaseConfig.apiKey) return null;
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
  if (!user) return null;
  return { email: user.email, emailVerified: Boolean(user.emailVerified) };
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const hasAdminEnv = Boolean(
      process.env.FIREBASE_ADMIN_PROJECT_ID &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
      process.env.FIREBASE_ADMIN_PRIVATE_KEY
    );

    let sessionCookieValue = '';

    if (hasAdminEnv) {
      const isAdmin = await verifyAdminSession(idToken);
      if (!isAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      sessionCookieValue = await createSessionCookie(idToken);
    } else {
      const user = await verifyIdTokenViaRest(idToken);
      if (!user?.email || !user.emailVerified || !SITE_CONFIG.adminEmails.includes(user.email)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      sessionCookieValue = 'verified-admin-session';
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('iskultrip-session', sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('iskultrip-session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
