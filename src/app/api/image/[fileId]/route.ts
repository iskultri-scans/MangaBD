import { NextRequest, NextResponse } from 'next/server';
import { fetchTelegramFileStream } from '@/lib/telegram';

const VALID_FILE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;

  if (!fileId || !VALID_FILE_ID.test(fileId)) {
    return NextResponse.json({ ok: false, error: 'Invalid Telegram file_id.' }, { status: 400 });
  }

  const result = await fetchTelegramFileStream(fileId);

  if (!result.ok || !result.stream) {
    return NextResponse.json(
      { ok: false, error: result.error || 'Unable to fetch image.' },
      { status: result.status || 502 }
    );
  }

  const headers = new Headers();
  headers.set('Content-Type', result.contentType || 'image/jpeg');
  if (result.contentLength) {
    headers.set('Content-Length', result.contentLength);
  }
  if (result.etag) {
    headers.set('ETag', result.etag);
  }
  if (result.lastModified) {
    headers.set('Last-Modified', result.lastModified);
  }
  // Telegram file_ids are immutable — allow browsers and Vercel edge CDNs to cache aggressively
  headers.set('Cache-Control', 'public, max-age=31536000, immutable, s-maxage=31536000');
  headers.set('CDN-Cache-Control', 'public, max-age=31536000, immutable, s-maxage=31536000');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new NextResponse(result.stream, {
    status: 200,
    headers,
  });
}
