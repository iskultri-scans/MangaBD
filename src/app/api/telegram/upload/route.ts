import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdminRequest } from '@/lib/server-auth';
import { isTelegramStorageConfigured, uploadImageToTelegram } from '@/lib/telegram';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

// Allow up to 60s for large chapter page uploads to Telegram on Vercel
export const maxDuration = 60;

// Server cap: 4MB per page (Vercel serverless payload limit) and 1 file per request
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 1;

export async function GET() {
  return NextResponse.json({
    configured: isTelegramStorageConfigured(),
    maxFileSizeMB: 4,
    maxFilesPerRequest: MAX_FILES_PER_REQUEST,
  });
}

export async function POST(request: NextRequest) {
  try {
    const isAdmin = await authorizeAdminRequest(request);
    if (!isAdmin) {
      return NextResponse.json({ ok: false, error: 'Unauthorized admin request' }, { status: 401 });
    }

    if (!isTelegramStorageConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Telegram Storage CDN is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_STORAGE_CHANNEL_ID in server environment variables.',
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const captionPrefix = String(formData.get('caption') || '').trim();
    const startPage = Math.max(1, Number(formData.get('startPage') || 1));

    const rawEntries = [
      ...formData.getAll('files'),
      ...formData.getAll('file'),
    ].filter((entry): entry is File => entry instanceof File);

    if (rawEntries.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'No image files provided. Send multipart/form-data with "file" or "files".' },
        { status: 400 }
      );
    }

    if (rawEntries.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { ok: false, error: `Maximum ${MAX_FILES_PER_REQUEST} pages per upload request.` },
        { status: 400 }
      );
    }

    // Validate all files before uploading
    for (const file of rawEntries) {
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        return NextResponse.json(
          { ok: false, error: `Unsupported file type "${file.type}" for "${file.name}". Allowed: JPEG, PNG, WebP, GIF, AVIF.` },
          { status: 400 }
        );
      }
      if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: `File "${file.name}" is empty or exceeds the 4MB upload limit.` },
          { status: 400 }
        );
      }
    }

    const uploadedPages: {
      pageNumber: number;
      filename: string;
      fileId: string;
      fileUniqueId?: string;
      fileSize?: number;
      mimeType?: string;
      proxyUrl: string;
    }[] = [];

    // Upload sequentially to preserve page order and avoid Telegram burst rate limits
    for (let i = 0; i < rawEntries.length; i++) {
      const file = rawEntries[i];
      const pageNumber = startPage + i;
      const caption = captionPrefix ? `${captionPrefix} — Page ${pageNumber}` : undefined;

      const result = await uploadImageToTelegram(file, file.name || `page-${pageNumber}.jpg`, caption);
      if (!result.ok || !result.fileId) {
        const isTimeout = Boolean(result.error && /timed out|timeout/i.test(result.error));
        return NextResponse.json(
          {
            ok: false,
            error: `Failed on page ${pageNumber} (${file.name}): ${result.error}`,
            uploadedPages,
          },
          { status: isTimeout ? 504 : 502 }
        );
      }

      uploadedPages.push({
        pageNumber,
        filename: file.name,
        fileId: result.fileId,
        fileUniqueId: result.fileUniqueId,
        fileSize: result.fileSize,
        mimeType: result.mimeType || file.type,
        proxyUrl: `/api/image/${encodeURIComponent(result.fileId)}`,
      });
    }

    return NextResponse.json({
      ok: true,
      count: uploadedPages.length,
      pages: uploadedPages,
    });
  } catch (error) {
    console.error('[API /telegram/upload] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to process image upload.' },
      { status: 500 }
    );
  }
}
