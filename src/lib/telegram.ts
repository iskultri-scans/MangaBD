// Server-side Telegram Bot API helper — never import this in client components.

export interface TelegramBroadcastPayload {
  title: string;
  message: string;
  url?: string;
  coverImage?: string;
  tag?: string;
  buttonLabel?: string;
}

export interface TelegramBroadcastResult {
  ok: boolean;
  method?: 'sendPhoto' | 'sendMessage';
  messageId?: number;
  blocked?: boolean;
  error?: string;
}

export interface TelegramUploadResult {
  ok: boolean;
  fileId?: string;
  fileUniqueId?: string;
  fileSize?: number;
  mimeType?: string;
  messageId?: number;
  error?: string;
}

export interface TelegramFileStreamResult {
  ok: boolean;
  stream?: ReadableStream<Uint8Array>;
  contentType?: string;
  contentLength?: string | null;
  etag?: string | null;
  lastModified?: string | null;
  status?: number;
  error?: string;
}

// ─── In-Memory TTL Cache for Telegram file_id -> file_path ───────────────────
// Telegram guarantees file_path is valid for at least 1 hour; cache for 45 min.
const FILE_PATH_TTL_MS = 45 * 60 * 1000;
const MAX_CACHE_ENTRIES = 2000;

interface CachedFilePath {
  filePath: string;
  expiresAt: number;
}

const filePathCache = new Map<string, CachedFilePath>();

function getCachedFilePath(fileId: string): string | null {
  const entry = filePathCache.get(fileId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    filePathCache.delete(fileId);
    return null;
  }
  return entry.filePath;
}

function setCachedFilePath(fileId: string, filePath: string): void {
  if (filePathCache.size >= MAX_CACHE_ENTRIES) {
    // Evict oldest entry (Map preserves insertion order)
    const oldestKey = filePathCache.keys().next().value;
    if (oldestKey) filePathCache.delete(oldestKey);
  }
  filePathCache.set(fileId, {
    filePath,
    expiresAt: Date.now() + FILE_PATH_TTL_MS,
  });
}

// ─── Environment Helpers ─────────────────────────────────────────────────────

export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() || null;
}

export function getTelegramMainChannelId(): string | null {
  return (
    process.env.TELEGRAM_MAIN_CHANNEL_ID?.trim() ||
    process.env.TELEGRAM_CHAT_ID?.trim() ||
    null
  );
}

export function getTelegramStorageChannelId(): string | null {
  return process.env.TELEGRAM_STORAGE_CHANNEL_ID?.trim() || null;
}

export function getTelegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!raw) return null;
  return raw.replace(/^@/, '');
}

export function isTelegramConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramMainChannelId());
}

export function isTelegramStorageConfigured(): boolean {
  return Boolean(getTelegramBotToken() && getTelegramStorageChannelId());
}

// ─── Formatting Helpers ──────────────────────────────────────────────────────

export function escapeTelegramHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function isPublicHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname !== 'localhost' &&
      parsed.hostname !== '127.0.0.1'
    );
  } catch {
    return false;
  }
}

export function formatTelegramHtml(payload: TelegramBroadcastPayload): string {
  const parts: string[] = [];

  if (payload.tag?.trim()) {
    parts.push(`<b>[${escapeTelegramHtml(payload.tag.trim().toUpperCase())}]</b>`);
  }

  parts.push(`<b>${escapeTelegramHtml(payload.title.trim())}</b>`);

  if (payload.message?.trim()) {
    parts.push('');
    parts.push(escapeTelegramHtml(payload.message.trim()));
  }

  if (payload.url && !isPublicHttpsUrl(payload.url)) {
    parts.push('');
    parts.push(`Link: ${escapeTelegramHtml(payload.url)}`);
  }

  parts.push('');
  parts.push('<i>— MangaBD</i>');

  return parts.join('\n');
}

const TELEGRAM_API_TIMEOUT_MS = 10_000;
const TELEGRAM_UPLOAD_TIMEOUT_MS = 45_000;
const TELEGRAM_STREAM_TIMEOUT_MS = 15_000;
const MAX_RETRY_AFTER_MS = 8_000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryDelayMs(res: Response, retryAfterSec?: number): number | null {
  if (res.status !== 429 && retryAfterSec === undefined) return null;
  const headerVal = res.headers.get('retry-after');
  const parsedSec =
    typeof retryAfterSec === 'number' && Number.isFinite(retryAfterSec)
      ? retryAfterSec
      : headerVal
        ? Number(headerVal)
        : 1;
  if (!Number.isFinite(parsedSec) || parsedSec <= 0) return 1000;
  const delayMs = parsedSec * 1000 + 150;
  return delayMs <= MAX_RETRY_AFTER_MS ? delayMs : null;
}

interface TelegramJsonPayload {
  ok: boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
  result?: unknown;
}

async function fetchTelegramJsonWithRetry<T extends TelegramJsonPayload>(
  url: string,
  createInit: () => RequestInit,
  timeoutMs = TELEGRAM_API_TIMEOUT_MS,
  maxAttempts = 2
): Promise<{ res: Response; data: T | null }> {
  let lastRes: Response | null = null;
  let lastData: T | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(url, {
      ...createInit(),
      signal: AbortSignal.timeout(timeoutMs),
    });
    let data: T | null = null;
    try {
      data = (await res.json()) as T;
    } catch {
      data = null;
    }

    lastRes = res;
    lastData = data;

    const isRateLimited = res.status === 429 || data?.error_code === 429;
    if (isRateLimited && attempt < maxAttempts - 1) {
      const retryMs = getRetryDelayMs(res, data?.parameters?.retry_after);
      if (retryMs !== null) {
        await sleep(retryMs);
        continue;
      }
    }

    return { res, data };
  }

  return { res: lastRes as Response, data: lastData };
}

// ─── Messaging & Broadcasting ────────────────────────────────────────────────

export async function sendTelegramMessageToChat(
  chatId: string | number,
  payload: TelegramBroadcastPayload
): Promise<TelegramBroadcastResult> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, error: 'Missing TELEGRAM_BOT_TOKEN on server.' };
  }

  const baseUrl = `https://api.telegram.org/bot${token}`;
  const html = formatTelegramHtml(payload);
  const replyMarkup = isPublicHttpsUrl(payload.url)
    ? {
        inline_keyboard: [
          [
            {
              text: payload.buttonLabel?.trim() || 'Read on MangaBD',
              url: payload.url,
            },
          ],
        ],
      }
    : undefined;

  if (isPublicHttpsUrl(payload.coverImage) && html.length <= 1024) {
    try {
      const { res: photoRes, data: photoData } = await fetchTelegramJsonWithRetry<
        TelegramJsonPayload & { result?: { message_id?: number } }
      >(
        `${baseUrl}/sendPhoto`,
        () => ({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: payload.coverImage,
            caption: html,
            parse_mode: 'HTML',
            ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
          }),
        }),
        TELEGRAM_API_TIMEOUT_MS
      );

      if (photoRes.ok && photoData?.ok) {
        return {
          ok: true,
          method: 'sendPhoto',
          messageId: photoData.result?.message_id,
        };
      }
      if (photoRes.status === 403 || photoData?.error_code === 403) {
        return {
          ok: false,
          blocked: true,
          error: photoData?.description || 'User blocked the bot',
        };
      }
    } catch (err) {
      console.warn('[Telegram] sendPhoto error, falling back to sendMessage:', err);
    }
  }

  try {
    const { res: msgRes, data: msgData } = await fetchTelegramJsonWithRetry<
      TelegramJsonPayload & { result?: { message_id?: number } }
    >(
      `${baseUrl}/sendMessage`,
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: html.slice(0, 4096),
          parse_mode: 'HTML',
          disable_web_page_preview: false,
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      }),
      TELEGRAM_API_TIMEOUT_MS
    );

    if (!msgRes.ok || !msgData?.ok) {
      return {
        ok: false,
        blocked: msgRes.status === 403 || msgData?.error_code === 403,
        error: msgData?.description || `Telegram API error (${msgRes.status})`,
      };
    }

    return {
      ok: true,
      method: 'sendMessage',
      messageId: msgData.result?.message_id,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to reach Telegram API',
    };
  }
}

export async function sendTelegramBroadcast(
  payload: TelegramBroadcastPayload
): Promise<TelegramBroadcastResult> {
  const chatId = getTelegramMainChannelId();
  if (!chatId) {
    return {
      ok: false,
      error: 'Telegram Main Channel is not configured (missing TELEGRAM_MAIN_CHANNEL_ID or TELEGRAM_CHAT_ID).',
    };
  }
  return sendTelegramMessageToChat(chatId, payload);
}

export async function sendTelegramTextReply(
  chatId: string | number,
  text: string
): Promise<boolean> {
  const token = getTelegramBotToken();
  if (!token) return false;
  try {
    const { res, data } = await fetchTelegramJsonWithRetry(
      `https://api.telegram.org/bot${token}/sendMessage`,
      () => ({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      }),
      TELEGRAM_API_TIMEOUT_MS
    );
    return Boolean(res.ok && data?.ok);
  } catch {
    return false;
  }
}

// ─── Image CDN: Upload & Streaming Proxy ─────────────────────────────────────

/**
 * Uploads an image as an uncompressed document to the Telegram Private Storage Channel
 * and returns the permanent Telegram `file_id`.
 */
export async function uploadImageToTelegram(
  file: Blob,
  filename: string,
  caption?: string
): Promise<TelegramUploadResult> {
  const token = getTelegramBotToken();
  const storageChannelId = getTelegramStorageChannelId();

  if (!token || !storageChannelId) {
    return {
      ok: false,
      error: 'Telegram Storage CDN is not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_STORAGE_CHANNEL_ID).',
    };
  }

  try {
    const buildFormData = () => {
      const formData = new FormData();
      formData.append('chat_id', storageChannelId);
      formData.append('document', file, filename);
      formData.append('disable_notification', 'true');
      if (caption?.trim()) {
        formData.append('caption', caption.trim().slice(0, 1024));
      }
      return formData;
    };

    const { res, data } = await fetchTelegramJsonWithRetry<
      TelegramJsonPayload & {
        result?: {
          message_id?: number;
          document?: {
            file_id: string;
            file_unique_id: string;
            file_size?: number;
            mime_type?: string;
          };
        };
      }
    >(
      `https://api.telegram.org/bot${token}/sendDocument`,
      () => ({
        method: 'POST',
        body: buildFormData(),
      }),
      TELEGRAM_UPLOAD_TIMEOUT_MS
    );

    if (!res.ok || !data?.ok || !data.result?.document?.file_id) {
      return {
        ok: false,
        error: data?.description || `Telegram upload failed (${res.status})`,
      };
    }

    const doc = data.result.document;
    return {
      ok: true,
      fileId: doc.file_id,
      fileUniqueId: doc.file_unique_id,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      messageId: data.result.message_id,
    };
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return {
      ok: false,
      error: isTimeout
        ? `Telegram upload timed out after ${Math.round(TELEGRAM_UPLOAD_TIMEOUT_MS / 1000)}s`
        : error instanceof Error
          ? error.message
          : 'Network error uploading to Telegram',
    };
  }
}

async function resolveTelegramFilePath(fileId: string, bypassCache = false): Promise<string | null> {
  if (!bypassCache) {
    const cached = getCachedFilePath(fileId);
    if (cached) return cached;
  }

  const token = getTelegramBotToken();
  if (!token) return null;

  const { res, data } = await fetchTelegramJsonWithRetry<
    TelegramJsonPayload & { result?: { file_path?: string } }
  >(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    () => ({ cache: 'no-store' }),
    TELEGRAM_API_TIMEOUT_MS
  );

  if (!res.ok) return null;

  const filePath = data?.result?.file_path;
  if (!data?.ok || !filePath) return null;

  setCachedFilePath(fileId, filePath);
  return filePath;
}

function inferImageContentType(filePath: string, upstreamHeader: string | null): string {
  if (upstreamHeader && upstreamHeader.startsWith('image/')) {
    return upstreamHeader;
  }
  const lower = filePath.toLowerCase();
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.avif')) return 'image/avif';
  return 'image/jpeg';
}

/**
 * Fetches a Telegram file as a ReadableStream using the 45-minute file_path TTL cache.
 * Automatically retries once if a cached file_path expired early.
 */
export async function fetchTelegramFileStream(fileId: string): Promise<TelegramFileStreamResult> {
  const token = getTelegramBotToken();
  if (!token) {
    return { ok: false, status: 503, error: 'Telegram Bot Token is not configured.' };
  }

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const filePath = await resolveTelegramFilePath(fileId, attempt === 1);
      if (!filePath) {
        return { ok: false, status: 404, error: 'Image not found on Telegram.' };
      }

      const fileRes = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`, {
        signal: AbortSignal.timeout(TELEGRAM_STREAM_TIMEOUT_MS),
      });
      if (fileRes.ok && fileRes.body) {
        return {
          ok: true,
          stream: fileRes.body,
          contentType: inferImageContentType(filePath, fileRes.headers.get('content-type')),
          contentLength: fileRes.headers.get('content-length'),
          etag: fileRes.headers.get('etag'),
          lastModified: fileRes.headers.get('last-modified'),
        };
      }

      // If Telegram returned 404 on cached path, invalidate cache and retry once
      if (fileRes.status === 404 && attempt === 0) {
        filePathCache.delete(fileId);
        continue;
      }

      return {
        ok: false,
        status: fileRes.status === 404 ? 404 : 502,
        error: `Failed to stream image from Telegram (${fileRes.status})`,
      };
    }
  } catch (error) {
    const isTimeout =
      error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      error: isTimeout
        ? 'Telegram image upstream timed out.'
        : error instanceof Error
          ? error.message
          : 'Failed to reach Telegram image upstream.',
    };
  }

  return { ok: false, status: 502, error: 'Failed to resolve Telegram image stream.' };
}
