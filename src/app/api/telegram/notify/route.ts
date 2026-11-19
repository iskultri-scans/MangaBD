import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/server-auth';
import { SITE_CONFIG } from '@/lib/config';
import { isTelegramConfigured, sendTelegramBroadcast } from '@/lib/telegram';

export async function GET() {
  return NextResponse.json({
    configured: isTelegramConfigured(),
    channelUrl: SITE_CONFIG.social.telegram,
    botUrl: SITE_CONFIG.telegramBotUrl,
  });
}

export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await authorizeAdminRequest(request);
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
