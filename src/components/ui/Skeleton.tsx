'use client';

import React from 'react';

export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton ${className}`} {...props} />;
}

export function MangaCardSkeleton() {
  return (
    <div
      className="rounded-lg overflow-hidden border"
      style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
    >
      <Skeleton className="w-full rounded-none" style={{ aspectRatio: '3/4' }} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <Skeleton className="w-full min-h-[320px] sm:min-h-[380px] lg:min-h-[430px] rounded-xl" />
  );
}
