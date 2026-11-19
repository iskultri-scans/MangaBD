import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { getAdminFirestore, hasAdminCredentials } from '@/lib/firebase-admin';
import { getTelegramBotUsername } from '@/lib/telegram';

const TOKEN_TTL_SECONDS = 600; // 10 minutes

export async function GET(request: NextRequest) {
  try {
    if (!hasAdminCredentials()) {
      return NextResponse.json(
        { ok: false, error: 'Firebase Admin SDK is not configured.' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const db = getAdminFirestore();
    const userSnap = await db.collection('users').doc(user.uid).get();
    const data = userSnap.exists ? userSnap.data() : null;

    return NextResponse.json({
      ok: true,
      linked: Boolean(data?.telegramChatId),
      telegramUsername: data?.telegramUsername || null,
      notificationsEnabled: data?.notificationsEnabled ?? true,
      botUsername: getTelegramBotUsername(),
    });
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code === 5) {
      return NextResponse.json(
        { ok: false, error: 'Firestore database not found (5 NOT_FOUND). Check Admin SDK project/database.' },
        { status: 503 }
      );
    }
    console.error('[API /telegram/link-token GET] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to check Telegram link status.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasAdminCredentials()) {
      return NextResponse.json(
        { ok: false, error: 'Firebase Admin SDK is not configured.' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const botUsername = getTelegramBotUsername();
    if (!botUsername) {
      return NextResponse.json(
        { ok: false, error: 'Telegram Bot is not configured (missing TELEGRAM_BOT_USERNAME).' },
        { status: 503 }
      );
    }

    const token = crypto.randomBytes(18).toString('base64url');
    const nowMs = Date.now();
    const db = getAdminFirestore();

    await db.collection('telegramLinkTokens').doc(token).set({
      userId: user.uid,
      email: user.email || null,
      displayName: user.displayName || null,
      used: false,
      createdAt: Timestamp.fromMillis(nowMs),
      expiresAt: Timestamp.fromMillis(nowMs + TOKEN_TTL_SECONDS * 1000),
    });

    return NextResponse.json({
      ok: true,
      token,
      deepLink: `https://t.me/${botUsername}?start=link_${token}`,
      command: `/start link_${token}`,
      expiresInSeconds: TOKEN_TTL_SECONDS,
    });
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code === 5) {
      return NextResponse.json(
        { ok: false, error: 'Firestore database not found (5 NOT_FOUND). Check Admin SDK project/database.' },
        { status: 503 }
      );
    }
    console.error('[API /telegram/link-token POST] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to generate Telegram link token.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!hasAdminCredentials()) {
      return NextResponse.json(
        { ok: false, error: 'Firebase Admin SDK is not configured.' },
        { status: 503 }
      );
    }

    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Authentication required.' }, { status: 401 });
    }

    const db = getAdminFirestore();
    await db.collection('users').doc(user.uid).set(
      {
        telegramChatId: null,
        telegramUsername: null,
        telegramLinkedAt: null,
        notificationsEnabled: false,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, linked: false });
  } catch (error: unknown) {
    const code = (error as { code?: number })?.code;
    if (code === 5) {
      return NextResponse.json(
        { ok: false, error: 'Firestore database not found (5 NOT_FOUND). Check Admin SDK project/database.' },
        { status: 503 }
      );
    }
    console.error('[API /telegram/link-token DELETE] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to unlink Telegram account.' },
      { status: 500 }
    );
  }
}
