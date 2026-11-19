import { NextRequest, NextResponse } from 'next/server';
import { createSessionCookie, verifyAdminSession } from '@/lib/auth';
import { hasAdminCredentials } from '@/lib/firebase-admin';
import { SESSION_COOKIE_NAME } from '@/lib/server-auth';

export async function POST(request: NextRequest) {
  try {
    if (!hasAdminCredentials()) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK is not configured on the server.' },
        { status: 503 }
      );
    }

    const { idToken } = await request.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const isAdmin = await verifyAdminSession(idToken);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Cryptographically signed Firebase Auth session cookie (RS256 JWT)
    const sessionCookieValue = await createSessionCookie(idToken);

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, sessionCookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[API /admin/session] Session creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}
