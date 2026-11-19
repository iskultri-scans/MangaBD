'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ReadNowButtonProps {
  readLink: string | null | undefined;
}

export function ReadNowButton({ readLink }: ReadNowButtonProps) {
  if (!readLink) {
    return (
      <div className="relative group inline-block">
        <button disabled className="read-now-btn cursor-not-allowed flex items-center gap-2">
          <ExternalLink size={18} />
          Read Now
        </button>
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
        >
          Reading link not available
        </div>
      </div>
    );
  }

  return (
    <a
      href={readLink}
      target="_blank"
      rel="noopener noreferrer"
      className="read-now-btn inline-flex items-center gap-2"
    >
      <ExternalLink size={18} />
      Read Now
    </a>
  );
}
