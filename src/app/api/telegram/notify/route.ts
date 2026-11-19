import { NextRequest, NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/auth';
import { SITE_CONFIG } from '@/lib/config';
import { firebaseConfig } from '@/lib/firebase';
import { isTelegramConfigured, sendTelegramBroadcast } from '@/lib/telegram';

async function verifyIdTokenViaRest(idToken: string): Promise<{ email?: string; emailVerified?: boolean } | null> {
  if (!firebaseConfig.apiKey) return null;
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
    if (!user) return null;
    return { email: user.email, emailVerified: Boolean(user.emailVerified) };
  } catch {
    return null;
  }
}

async function authorizeAdmin(request: NextRequest): Promise<boolean> {
  // 1) Check Bearer token if provided (works reliably even when cookie was cleared or refreshed)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.slice(7).trim();
    if (idToken) {
      const user = await verifyIdTokenViaRest(idToken);
      if (user?.email && user.emailVerified && SITE_CONFIG.adminEmails.includes(user.email)) {
        return true;
      }
    }
  }

  // 2) Fallback to admin session cookie
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

export async function GET() {
  return NextResponse.json({
    configured: isTelegramConfigured(),
    channelUrl: SITE_CONFIG.social.telegram,
    botUrl: SITE_CONFIG.telegramBotUrl,
  });
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await authorizeAdmin(request);
    if (!isAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized admin request' }, { status: 401 });
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in server environment variables.',
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as {
      title?: string;
      message?: string;
      url?: string;
      coverImage?: string;
      tag?: string;
      buttonLabel?: string;
    };

    if (!body.title?.trim() || !body.message?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Title and message are required.' },
        { status: 400 }
      );
    }

    const result = await sendTelegramBroadcast({
      title: body.title,
      message: body.message,
      url: body.url,
      coverImage: body.coverImage,
      tag: body.tag,
      buttonLabel: body.buttonLabel,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API /telegram/notify] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process Telegram broadcast request.' },
      { status: 500 }
    );
  }
}
