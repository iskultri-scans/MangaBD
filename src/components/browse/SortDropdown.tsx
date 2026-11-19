'use client';

import React from 'react';
import { CustomDropdown, type DropdownOption } from '@/components/ui/CustomDropdown';

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

const sortOptions: DropdownOption[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'az', label: 'A — Z' },
];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <CustomDropdown
      options={sortOptions}
      value={value}
      onChange={onChange}
      placeholder="Sort by"
      size="sm"
      className="w-40"
    />
  );
}
