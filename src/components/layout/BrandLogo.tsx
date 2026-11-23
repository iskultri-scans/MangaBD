import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showMark?: boolean;
  suffix?: string;
  className?: string;
}

/**
 * Central MangaBD brand mark + wordmark.
 * To swap the logo later, replace `/public/brand/mangabd-mark.svg`
 * or set `NEXT_PUBLIC_BRAND_LOGO_URL`.
 */
export const BRAND_ASSET_PATHS = {
  mark: process.env.NEXT_PUBLIC_BRAND_LOGO_URL || '/brand/mangabd-mark.svg',
  wordmark: '/brand/mangabd-wordmark.svg',
  favicon: '/icon.svg',
  ogImage: '/og-default.png',
} as const;

export function BrandMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  if (process.env.NEXT_PUBLIC_BRAND_LOGO_URL) {
    return (
      <img
        src={BRAND_ASSET_PATHS.mark}
        alt="MangaBD"
        width={size}
        height={size}
        className={`shrink-0 rounded-md object-contain ${className}`}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      <rect width="64" height="64" rx="14" fill="#0B0B0E" />
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="12"
        stroke="var(--accent)"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <path
        d="M14 17C14 14.7909 15.7909 13 18 13H46C48.2091 13 50 14.7909 50 17V39C50 41.2091 48.2091 43 46 43H31L21 51V43H18C15.7909 43 14 41.2091 14 39V17Z"
        fill="#18181D"
        stroke="#F4F4F5"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M21 34V22L32 29L43 22V34"
        stroke="var(--accent)"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 29V35"
        stroke="#F4F4F5"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({
  size = 'md',
  showMark = true,
  suffix,
  className = '',
}: BrandLogoProps) {
  const markSize = size === 'sm' ? 24 : size === 'lg' ? 34 : 28;
  const textClass =
    size === 'sm'
      ? 'text-lg sm:text-xl'
      : size === 'lg'
        ? 'text-2xl sm:text-3xl'
        : 'text-xl sm:text-2xl';

  return (
    <span
      className={`font-display font-bold tracking-tight text-[var(--text-primary)] whitespace-nowrap inline-flex items-center gap-2 ${textClass} ${className}`}
    >
      {showMark && <BrandMark size={markSize} />}
      <span>
        Manga<span className="text-[var(--accent)]">BD</span>
        {suffix ? <span className="ml-1.5 font-semibold">{suffix}</span> : null}
      </span>
    </span>
  );
}
