/**
 * Site URL helper — safely returns a valid absolute URL.
 *
 * Vercel's NEXT_PUBLIC_SITE_URL environment variable can sometimes be set
 * without a protocol (e.g., 'mangabd.vercel.app'), which breaks
 * `new URL()`. This helper auto-prepends 'https://' if missing.
 *
 * Always use this instead of reading process.env.NEXT_PUBLIC_SITE_URL directly.
 */

const FALLBACK_URL = 'https://mangabd.vercel.app';

function normalizeUrl(input: string | undefined): string {
  if (!input || typeof input !== 'string' || input.trim() === '') {
    return FALLBACK_URL;
  }
  const trimmed = input.trim();
  // Already has protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  // localhost with port
  if (trimmed.startsWith('localhost')) {
    return `http://${trimmed}`;
  }
  // Otherwise prepend https://
  return `https://${trimmed}`;
}

export const SITE_URL = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);

/**
 * Build an absolute URL by joining a path to SITE_URL.
 * Handles leading/trailing slashes safely.
 */
export function absoluteUrl(path: string = ''): string {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path; // already absolute
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${cleanPath}`;
}
