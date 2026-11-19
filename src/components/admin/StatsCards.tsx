'use client';

import React from 'react';
import { BookOpen, Globe, Clock, CheckCircle } from 'lucide-react';

interface StatsCardsProps {
  stats: {
    total: number;
    en: number;
    bn: number;
    ongoing: number;
    completed: number;
  };
}

type StatKey = 'total' | 'en' | 'bn' | 'ongoing' | 'completed';

const cards: {
  key: StatKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
}[] = [
  { key: 'total', label: 'Total Series', icon: BookOpen, color: 'text-[var(--accent)]' },
  { key: 'en', label: 'English', icon: Globe, color: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'bn', label: 'Bengali', icon: Globe, color: 'text-amber-600 dark:text-amber-400' },
  { key: 'ongoing', label: 'Ongoing', icon: Clock, color: 'text-sky-600 dark:text-sky-400' },
  { key: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400' },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-xl p-4 border border-[var(--border-color)] bg-[var(--bg-secondary)]"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs text-[var(--text-muted)] font-medium">{card.label}</span>
              <Icon size={16} className={card.color} />
            </div>
            <p className="font-mono-num text-2xl font-bold text-[var(--text-primary)]">
              {stats[card.key]}
            </p>
          </div>
        );
      })}
    </div>
  );
}
