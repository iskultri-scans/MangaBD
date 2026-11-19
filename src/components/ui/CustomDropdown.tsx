'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
}

export function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  size = 'md',
  align = 'left',
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const sizeClasses = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 w-full rounded-lg outline-none cursor-pointer transition-colors ${sizeClasses}`}
        style={{
          background: 'var(--bg-secondary)',
          border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border-color)',
          color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
        }}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          size={size === 'sm' ? 13 : 14}
          className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            className={`absolute z-50 mt-1.5 w-full min-w-[180px] rounded-lg overflow-hidden shadow-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="py-1 max-h-[260px] overflow-y-auto no-scrollbar">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="w-full flex items-center justify-between px-3.5 py-2 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                    style={{
                      background: isSelected ? 'var(--accent-glow)' : undefined,
                      color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                    }}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {option.icon}
                      <span className={`text-xs sm:text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                        {option.label}
                      </span>
                    </span>
                    {isSelected && <Check size={13} className="shrink-0 text-[var(--accent)]" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
