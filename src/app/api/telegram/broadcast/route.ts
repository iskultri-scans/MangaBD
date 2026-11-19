import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { authorizeAdminRequest } from '@/lib/server-auth';
import { getAdminFirestore } from '@/lib/firebase-admin';
import {
  isTelegramConfigured,
  sendTelegramBroadcast,
  sendTelegramMessageToChat,
  type TelegramBroadcastPayload,
} from '@/lib/telegram';

const DM_BATCH_SIZE = 20;
const DM_BATCH_DELAY_MS = 1000;

interface BroadcastRequestBody {
  type?: 'chapter' | 'announcement';
  mangaId?: string;
  title?: string;
  message?: string;
  url?: string;
  coverImage?: string;
  tag?: string;
  buttonLabel?: string;
  sendToChannel?: boolean;
  sendDMs?: boolean;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await authorizeAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized admin request' }, { status: 401 });
    }

    if (!isTelegramConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_MAIN_CHANNEL_ID in server environment variables.',
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as BroadcastRequestBody;
    const type = body.type === 'announcement' ? 'announcement' : 'chapter';
    const sendToChannel = body.sendToChannel !== false;
    const sendDMs = body.sendDMs !== false;

    if (!body.title?.trim() || !body.message?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'Title and message are required.' },
        { status: 400 }
      );
    }

    const payload: TelegramBroadcastPayload = {
      title: body.title.trim(),
      message: body.message.trim(),
      url: body.url?.trim(),
      coverImage: body.coverImage?.trim(),
      tag: body.tag?.trim() || (type === 'chapter' ? 'New Chapter' : 'Announcement'),
      buttonLabel: body.buttonLabel?.trim() || (type === 'chapter' ? 'Read Chapter' : 'View on MangaBD'),
    };

    // 1. Post to Main Telegram Channel
    let channelSent = false;
    let channelError: string | undefined;
    if (sendToChannel) {
      const channelRes = await sendTelegramBroadcast(payload);
      channelSent = channelRes.ok;
      if (!channelRes.ok) channelError = channelRes.error;
    }

    // 2. Send Targeted DMs (Bookmark-filtered for chapters; all linked users for global announcements)
    let dmTargeted = 0;
    let dmSent = 0;
    let dmFailed = 0;

    if (sendDMs) {
      try {
        const db = getAdminFirestore();
        const usersSnap = await db
          .collection('users')
          .where('notificationsEnabled', '==', true)
          .get();

        const eligibleTargets: { uid: string; chatId: string }[] = [];

        for (const userDoc of usersSnap.docs) {
          const data = userDoc.data();
          if (!data.telegramChatId || data.telegramBlocked === true) continue;

          if (type === 'chapter' && body.mangaId) {
            // Only DM users who bookmarked this specific manga
            const bookmarkSnap = await userDoc.ref
              .collection('bookmarks')
              .doc(body.mangaId)
              .get();
            if (!bookmarkSnap.exists) continue;
          }

          eligibleTargets.push({
            uid: userDoc.id,
            chatId: String(data.telegramChatId),
          });
        }

        dmTargeted = eligibleTargets.length;

        // Send in rate-limited batches (~20 msg/sec, safely under Telegram's 30 msg/sec limit)
        for (let i = 0; i < eligibleTargets.length; i += DM_BATCH_SIZE) {
          const batch = eligibleTargets.slice(i, i + DM_BATCH_SIZE);

          await Promise.all(
            batch.map(async (target) => {
              const res = await sendTelegramMessageToChat(target.chatId, payload);
              if (res.ok) {
                dmSent += 1;
              } else {
                dmFailed += 1;
                if (res.blocked) {
                  await db
                    .collection('users')
                    .doc(target.uid)
                    .update({
                      telegramBlocked: true,
                      updatedAt: Timestamp.now(),
                    })
                    .catch(() => {});
                }
              }
            })
          );

          if (i + DM_BATCH_SIZE < eligibleTargets.length) {
            await sleep(DM_BATCH_DELAY_MS);
          }
        }

        // Record audit log in Firestore
        await db.collection('broadcastLogs').add({
          type,
          ...(body.mangaId ? { mangaId: body.mangaId } : {}),
          title: payload.title.slice(0, 200),
          channelSent,
          dmTargeted,
          dmSent,
          dmFailed,
          createdAt: Timestamp.now(),
        });
      } catch (dmError) {
        console.error('[API /telegram/broadcast] DM fan-out error:', dmError);
      }
    }

    return NextResponse.json({
      ok: channelSent || dmSent > 0 || (!sendToChannel && dmTargeted === 0),
      channelSent,
      ...(channelError ? { channelError } : {}),
      dmTargeted,
      dmSent,
      dmFailed,
    });
  } catch (error) {
    console.error('[API /telegram/broadcast] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process Telegram broadcast.' },
      { status: 500 }
    );
  }
}
