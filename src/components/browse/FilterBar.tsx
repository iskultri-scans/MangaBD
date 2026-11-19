'use client';

import React from 'react';
import { SearchInput } from './SearchInput';
import { CustomDropdown, type DropdownOption } from '@/components/ui/CustomDropdown';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, Pause, Zap, BookOpen } from 'lucide-react';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  language: string;
  onLanguageChange: (value: string) => void;
  status: string;
  onStatusChange: (value: string) => void;
  genre: string;
  onGenreChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  genres: { name: string; slug: string }[];
}

const languageTabs = [
  { value: 'all', label: 'All Editions' },
  { value: 'en', label: 'EN' },
  { value: 'bn', label: 'BN' },
];

const statusOptions: DropdownOption[] = [
  { value: '', label: 'All Status', icon: <Zap size={14} /> },
  { value: 'ongoing', label: 'Ongoing', icon: <Clock size={14} className="text-emerald-500" /> },
  { value: 'completed', label: 'Completed', icon: <CheckCircle size={14} className="text-blue-500" /> },
  { value: 'hiatus', label: 'Hiatus', icon: <Pause size={14} className="text-amber-500" /> },
];

export function FilterBar({
  search,
  onSearchChange,
  language,
  onLanguageChange,
  status,
  onStatusChange,
  genre,
  onGenreChange,
  sort,
  onSortChange,
  genres,
}: FilterBarProps) {
  const genreOptions: DropdownOption[] = [
    { value: '', label: 'All Genres', icon: <BookOpen size={14} /> },
    ...genres.map((g) => ({
      value: g.slug,
      label: g.name,
    })),
  ];

  const sortOptions: DropdownOption[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'az', label: 'A — Z' },
  ];

  return (
    <div className="space-y-4 mb-6">
      <SearchInput value={search} onChange={onSearchChange} />

      <div className="flex flex-wrap items-center gap-3">
        {/* Language Segmented Tabs */}
        <div
          className="inline-flex p-1 rounded-lg"
          style={{ border: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}
        >
          {languageTabs.map((tab) => {
            const active = language === tab.value;
            return (
              <button
                type="button"
                key={tab.value}
                onClick={() => onLanguageChange(tab.value)}
                className={cn(
                  'px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors',
                  active
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <CustomDropdown
          options={statusOptions}
          value={status}
          onChange={onStatusChange}
          placeholder="All Status"
          size="sm"
          className="w-36"
        />

        <CustomDropdown
          options={genreOptions}
          value={genre}
          onChange={onGenreChange}
          placeholder="All Genres"
          size="sm"
          className="w-40"
        />

        <div className="sm:ml-auto">
          <CustomDropdown
            options={sortOptions}
            value={sort}
            onChange={onSortChange}
            placeholder="Sort by"
            size="sm"
            className="w-40"
          />
        </div>
      </div>
    </div>
  );
}
