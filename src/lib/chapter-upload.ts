import type { ChapterPage } from '@/lib/firestore';

export const UPLOAD_CONCURRENCY = 2;
export const MAX_RETRIES = 2;
export const COMPRESS_THRESHOLD_BYTES = 3.5 * 1024 * 1024; // 3.5MB -> compress on client
export const SERVER_MAX_BYTES = 4 * 1024 * 1024; // 4MB server cap
export const WATERMARK_TIMEOUT_MS = 10_000; // 10s timeout for watermark + canvas.toBlob
export const PAGE_STUCK_TIMEOUT_MS = 180_000; // 180s stuck-guard per page (across retries)
export const ATTEMPT_FETCH_TIMEOUT_MS = 90_000; // 90s per-request fetch timeout (> 60s Vercel maxDuration)
export const TIMEOUT_RETRY_DELAY_MS = 3_000; // 3s cooldown before retry after timeout-abort
const MAX_CANVAS_DIMENSION = 8192;

export interface PreparedPageImage {
  file: File;
  watermarked: boolean;
  warning?: string;
}

export interface PageFailureInfo {
  pageNumber: number;
  filename: string;
  error: string;
}

export interface BatchUploadResult {
  uploadedPages: ChapterPage[];
  failedPages: PageFailureInfo[];
}

export function isUnsupportedCanvasFormat(file: File): boolean {
  const name = file.name.toLowerCase();
  const type = (file.type || '').toLowerCase();
  return (
    /\.(heic|heif|svg)$/.test(name) ||
    type === 'image/heic' ||
    type === 'image/heif' ||
    type === 'image/svg+xml'
  );
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export async function encodeCanvasBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
  timeoutMs = WATERMARK_TIMEOUT_MS
): Promise<Blob | null> {
  const blobPromise = new Promise<Blob | null>((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } catch {
      resolve(null);
    }
  });

  return withTimeout(blobPromise, timeoutMs, `Canvas encoding (${mimeType}) timed out`);
}

export function stampMangaBDWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const fontSize = Math.max(14, Math.min(28, Math.round(width * 0.022)));
  const paddingX = Math.max(12, Math.round(fontSize * 0.8));
  const paddingY = Math.max(10, Math.round(fontSize * 0.65));

  ctx.save();
  ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'right';

  // Crisp subtle bottom-right attribution badge (legible on both dark & white panels)
  ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.14));
  ctx.strokeStyle = 'rgba(11, 11, 14, 0.34)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.strokeText('MangaBD', width - paddingX, height - paddingY);
  ctx.fillText('MangaBD', width - paddingX, height - paddingY);

  // Very faint diagonal mid-page watermark so cropping the corner still keeps subtle attribution
  const tileFontSize = Math.max(20, Math.min(44, Math.round(width * 0.042)));
  ctx.font = `700 ${tileFontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(width / 2, height / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.fillStyle = 'rgba(140, 140, 148, 0.075)';
  ctx.fillText('MangaBD', 0, 0);
  ctx.restore();
}

function getSafeCanvasDimensions(width: number, height: number): { width: number; height: number } {
  if (width <= MAX_CANVAS_DIMENSION && height <= MAX_CANVAS_DIMENSION) {
    return { width, height };
  }
  const scale = Math.min(MAX_CANVAS_DIMENSION / width, MAX_CANVAS_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function flattenCanvasWhiteBackground(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-over';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

async function renderToCanvasAndEncode(
  file: File,
  withWatermark: boolean,
  timeoutMs: number
): Promise<File> {
  const bitmap = await withTimeout(
    createImageBitmap(file),
    timeoutMs,
    `Decoding "${file.name}" timed out`
  );

  const canvas = document.createElement('canvas');
  let scaledCanvas: HTMLCanvasElement | null = null;

  try {
    const dims = getSafeCanvasDimensions(bitmap.width, bitmap.height);
    canvas.width = dims.width;
    canvas.height = dims.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('2D canvas context unavailable');
    }

    ctx.drawImage(bitmap, 0, 0, dims.width, dims.height);
    bitmap.close();

    if (withWatermark) {
      stampMangaBDWatermark(ctx, canvas.width, canvas.height);
    }

    const qualities = file.size <= COMPRESS_THRESHOLD_BYTES ? [0.9, 0.8, 0.7] : [0.85, 0.72, 0.58];
    const baseName = file.name.replace(/\.[^.]+$/, '');

    // 1) Try WebP (preserves alpha cleanly)
    for (const q of qualities) {
      const blob = await encodeCanvasBlob(canvas, 'image/webp', q, timeoutMs);
      if (blob && blob.size <= SERVER_MAX_BYTES) {
        return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
      }
    }

    // 2) Fallback to JPEG (flatten alpha onto white first so WebP/PNG alpha never turns black)
    flattenCanvasWhiteBackground(canvas, ctx);
    for (const q of qualities) {
      const blob = await encodeCanvasBlob(canvas, 'image/jpeg', q, timeoutMs);
      if (blob && blob.size <= SERVER_MAX_BYTES) {
        return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      }
    }

    // 3) Final downscale fallback (0.75x) + JPEG if ultra-high resolution
    scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = Math.max(1, Math.round(canvas.width * 0.75));
    scaledCanvas.height = Math.max(1, Math.round(canvas.height * 0.75));
    const scaledCtx = scaledCanvas.getContext('2d');
    if (scaledCtx) {
      scaledCtx.fillStyle = '#FFFFFF';
      scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
      scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
      for (const q of [0.82, 0.68]) {
        const blob = await encodeCanvasBlob(scaledCanvas, 'image/jpeg', q, timeoutMs);
        if (blob && blob.size <= SERVER_MAX_BYTES) {
          return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
        }
      }
    }

    throw new Error(`"${file.name}" could not be compressed under 4MB.`);
  } finally {
    try {
      bitmap.close();
    } catch {
      // already closed
    }
    canvas.width = 0;
    canvas.height = 0;
    if (scaledCanvas) {
      scaledCanvas.width = 0;
      scaledCanvas.height = 0;
    }
  }
}

export async function compressImageWithoutWatermark(
  file: File,
  timeoutMs = WATERMARK_TIMEOUT_MS
): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD_BYTES) {
    return file;
  }
  if (isUnsupportedCanvasFormat(file)) {
    if (file.size <= SERVER_MAX_BYTES) return file;
    throw new Error(`"${file.name}" uses an unsupported format above 4MB.`);
  }
  return renderToCanvasAndEncode(file, false, timeoutMs);
}

/**
 * Prepares a chapter page image for upload:
 * - When watermark is enabled: tries Canvas watermark + encode inside a 10s timeout.
 * - On any error, unsupported format (HEIC/SVG), or 10s timeout: logs a warning and
 *   silently falls back to the original (or non-watermarked compressed) image so batches never hang.
 */
export async function preparePageImageForUpload(
  file: File,
  options: {
    watermarkEnabled: boolean;
    watermarkTimeoutMs?: number;
  }
): Promise<PreparedPageImage> {
  const timeoutMs = options.watermarkTimeoutMs ?? WATERMARK_TIMEOUT_MS;

  if (!options.watermarkEnabled) {
    const prepared = await compressImageWithoutWatermark(file, timeoutMs);
    return { file: prepared, watermarked: false };
  }

  if (isUnsupportedCanvasFormat(file)) {
    console.warn(`[ChapterUpload] Skipping watermark for unsupported format: ${file.name}`);
    if (file.size <= SERVER_MAX_BYTES) {
      return {
        file,
        watermarked: false,
        warning: 'Unsupported format for watermark; uploaded original.',
      };
    }
    throw new Error(`"${file.name}" uses an unsupported format (${file.type || 'HEIC'}) over 4MB.`);
  }

  try {
    const watermarkedFile = await withTimeout(
      renderToCanvasAndEncode(file, true, timeoutMs),
      timeoutMs,
      `Watermark timed out after ${Math.round(timeoutMs / 1000)}s`
    );
    return { file: watermarkedFile, watermarked: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ChapterUpload] Watermark failed/timed out for "${file.name}", falling back without watermark:`,
      reason
    );

    const fallbackFile = await compressImageWithoutWatermark(file, timeoutMs);
    return {
      file: fallbackFile,
      watermarked: false,
      warning: `Watermark skipped (${reason}); uploaded without watermark.`,
    };
  }
}

function sleepWithSignal(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(
      signal.reason instanceof Error ? signal.reason : new Error('Aborted')
    );
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason instanceof Error ? signal.reason : new Error('Aborted'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function isTimeoutError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  return /timed out|timeout|stuck-guard|aborted/i.test(err.message);
}

export function classifyUploadError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Upload failed');
  if (/^(timeout|HTTP \d{3}(?:\s*\([^)]+\))?|parse error|network error):/i.test(raw)) {
    return raw;
  }
  if (isTimeoutError(err)) {
    return `timeout: ${raw}`;
  }
  if (/Unexpected token|JSON|SyntaxError/i.test(raw)) {
    return `parse error: ${raw}`;
  }
  if (/Failed to fetch|NetworkError|ECONNRESET|ETIMEDOUT/i.test(raw)) {
    return `network error: ${raw}`;
  }
  return raw;
}

export async function runPageUploadBatch(params: {
  tasks: Array<{ file: File; pageNumber: number }>;
  uploadSingleAttempt: (
    task: { file: File; pageNumber: number },
    signal: AbortSignal
  ) => Promise<ChapterPage>;
  onPageSuccess?: (page: ChapterPage) => void;
  onPageFailure?: (failure: PageFailureInfo) => void;
  concurrency?: number;
  maxRetries?: number;
  pageTimeoutMs?: number;
  retryBaseDelayMs?: number;
  timeoutRetryDelayMs?: number;
}): Promise<BatchUploadResult> {
  const {
    tasks,
    uploadSingleAttempt,
    onPageSuccess,
    onPageFailure,
    concurrency = UPLOAD_CONCURRENCY,
    maxRetries = MAX_RETRIES,
    pageTimeoutMs = PAGE_STUCK_TIMEOUT_MS,
    retryBaseDelayMs = 500,
    timeoutRetryDelayMs = TIMEOUT_RETRY_DELAY_MS,
  } = params;

  const uploadedPages: ChapterPage[] = [];
  const failedPages: PageFailureInfo[] = [];
  let cursor = 0;

  const processOneTask = async (task: { file: File; pageNumber: number }): Promise<void> => {
    const controller = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const stuckGuardPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const timeoutErr = new Error(
          `timeout: Stuck-guard timed out after ${Math.round(pageTimeoutMs / 1000)}s`
        );
        controller.abort(timeoutErr);
        reject(timeoutErr);
      }, pageTimeoutMs);
    });

    const executeWithRetries = async (): Promise<ChapterPage> => {
      let lastError = new Error(`Page ${task.pageNumber} upload failed`);

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (controller.signal.aborted) {
          throw controller.signal.reason instanceof Error
            ? controller.signal.reason
            : new Error('timeout: Page upload aborted');
        }
        try {
          return await uploadSingleAttempt(task, controller.signal);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          if (attempt < maxRetries && !controller.signal.aborted) {
            const delayMs = isTimeoutError(lastError)
              ? timeoutRetryDelayMs
              : retryBaseDelayMs * (attempt + 1);
            await sleepWithSignal(delayMs, controller.signal);
          }
        }
      }

      throw lastError;
    };

    try {
      const page = await Promise.race([executeWithRetries(), stuckGuardPromise]);
      uploadedPages.push(page);
      onPageSuccess?.(page);
    } catch (err) {
      const failure: PageFailureInfo = {
        pageNumber: task.pageNumber,
        filename: task.file.name,
        error: classifyUploadError(err),
      };
      failedPages.push(failure);
      onPageFailure?.(failure);
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  };

  const worker = async () => {
    while (cursor < tasks.length) {
      const task = tasks[cursor++];
      await processOneTask(task);
    }
  };

  const workerCount = Math.min(Math.max(1, concurrency), tasks.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { uploadedPages, failedPages };
}
