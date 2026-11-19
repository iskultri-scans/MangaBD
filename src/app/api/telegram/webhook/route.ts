import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { sendTelegramTextReply } from '@/lib/telegram';
import { SITE_URL } from '@/lib/site-url';

interface TelegramUpdate {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
      type: string;
      username?: string;
      first_name?: string;
    };
    from?: {
      id: number;
      username?: string;
      first_name?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Verify Telegram webhook secret header if configured
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
    if (expectedSecret) {
      const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (incomingSecret !== expectedSecret) {
        return NextResponse.json({ ok: false, error: 'Invalid webhook secret.' }, { status: 401 });
      }
    }

    const update = (await request.json()) as TelegramUpdate;
    const message = update.message;

    // Ignore non-text or group/channel updates
    if (!message?.text || message.chat.type !== 'private') {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const username = message.from?.username || message.chat.username || null;
    const text = message.text.trim();

    // 1. Handle Account Linking: /start link_<token>
    const linkMatch = text.match(/^\/start(?:@\w+)?\s+link_([A-Za-z0-9_-]{12,128})$/);
    if (linkMatch) {
      const token = linkMatch[1];
      const db = getAdminFirestore();
      const tokenRef = db.collection('telegramLinkTokens').doc(token);
      const tokenSnap = await tokenRef.get();

      if (!tokenSnap.exists) {
        await sendTelegramTextReply(
          chatId,
          '<b>Invalid Link Token</b>\n\nThis link code was not found or has already been used. Please generate a new link from your MangaBD account.'
        );
        return NextResponse.json({ ok: true });
      }

      const tokenData = tokenSnap.data() as {
        userId: string;
        email?: string | null;
        displayName?: string | null;
        used?: boolean;
        expiresAt?: Timestamp;
      };

      const isExpired =
        !tokenData.expiresAt || tokenData.expiresAt.toMillis() < Date.now();

      if (tokenData.used || isExpired) {
        await tokenRef.delete().catch(() => {});
        await sendTelegramTextReply(
          chatId,
          '<b>Link Expired</b>\n\nThis link token has expired. Please click <b>Connect Telegram</b> again on MangaBD.'
        );
        return NextResponse.json({ ok: true });
      }

      // Link Telegram Chat ID to the user's Firestore profile
      await db.collection('users').doc(tokenData.userId).set(
        {
          ...(tokenData.email ? { email: tokenData.email } : {}),
          ...(tokenData.displayName ? { displayName: tokenData.displayName } : {}),
          telegramChatId: chatId,
          telegramUsername: username,
          telegramLinkedAt: Timestamp.now(),
          notificationsEnabled: true,
          telegramBlocked: false,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      // Consume token so it cannot be reused
      await tokenRef.delete().catch(() => {});

      await sendTelegramTextReply(
        chatId,
        `<b>Account Connected!</b>\n\nYour MangaBD account is now linked to this Telegram chat. You will receive instant alerts whenever your bookmarked manga get new chapters.\n\nSend /stop anytime to mute notifications.`
      );
      return NextResponse.json({ ok: true });
    }

    // 2. Handle /stop (mute DMs)
    if (text.startsWith('/stop')) {
      const db = getAdminFirestore();
      const snap = await db
        .collection('users')
        .where('telegramChatId', '==', chatId)
        .limit(5)
        .get();

      const batch = db.batch();
      snap.docs.forEach((doc) => {
        batch.update(doc.ref, {
          notificationsEnabled: false,
          updatedAt: Timestamp.now(),
        });
      });
      if (!snap.empty) {
        await batch.commit();
      }

      await sendTelegramTextReply(
        chatId,
        '<b>Notifications Muted</b>\n\nYou will no longer receive MangaBD DM alerts. Re-enable them anytime from your MangaBD account settings.'
      );
      return NextResponse.json({ ok: true });
    }

    // 3. Default /start greeting
    if (text.startsWith('/start')) {
      await sendTelegramTextReply(
        chatId,
        `<b>Welcome to MangaBD Bot</b>\n\nTo receive instant chapter alerts for your bookmarked manga, sign in at ${SITE_URL} and click <b>Connect Telegram</b> in your account menu.`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API /telegram/webhook] Error:', error);
    // Return 200 so Telegram does not infinitely retry malformed updates
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
