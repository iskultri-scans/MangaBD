'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

interface AdultBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'badge' | 'banner';
  showIcon?: boolean;
}

export function AdultBadge({ size = 'sm', variant = 'badge', showIcon = true }: AdultBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1',
    lg: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const iconSize = { sm: 10, md: 12, lg: 14 };

  if (variant === 'banner') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold"
        style={{
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          color: 'var(--accent)',
        }}
      >
        {showIcon && <ShieldAlert size={13} />}
        <span>18+ Mature</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-md ${sizeClasses[size]}`}
      style={{
        background: 'var(--accent-glow)',
        border: '1px solid var(--accent)',
        color: 'var(--accent)',
      }}
      title="18+ Adult Content"
    >
      {showIcon && <ShieldAlert size={iconSize[size]} />}
      <span>18+</span>
    </span>
  );
}
