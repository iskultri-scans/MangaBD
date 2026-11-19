'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'en' | 'bn' | 'status';
}

const variantStyles: Record<string, string> = {
  default: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-color)]',
  accent: 'bg-[var(--accent-glow)] text-[var(--accent)] border border-[var(--accent)]/30',
  en: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
  bn: 'bg-amber-500/12 text-amber-700 dark:text-amber-400 border border-amber-500/25',
  status: 'bg-slate-500/12 text-slate-700 dark:text-slate-300 border border-slate-500/25',
};

export function Badge({ variant = 'default', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
