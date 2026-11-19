'use client';

import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, ShieldCheck, ChevronDown, Check } from 'lucide-react';
import { useContentMode, type ContentMode } from '@/context/ContentModeContext';
import { SITE_CONFIG } from '@/lib/config';

interface ContentModeToggleProps {
  isOpen?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}

export function ContentModeToggle({ isOpen, onToggle, onClose }: ContentModeToggleProps) {
  const { mode, setMode } = useContentMode();
  const [internalOpen, setInternalOpen] = useState(false);

  const open = isOpen !== undefined ? isOpen : internalOpen;
  const closeMenu = () => {
    if (onClose) onClose();
    else setInternalOpen(false);
  };
  const toggleMenu = () => {
    if (onToggle) onToggle();
    else setInternalOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (!SITE_CONFIG.features.adultModeEnabled) {
    return null;
  }

  const isFamily = mode === 'family';

  const options: { value: ContentMode; label: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      value: 'family',
      label: 'Family Mode',
      subtitle: 'Safe browsing (18+ hidden)',
      icon: <ShieldCheck size={16} className="text-emerald-500" />,
    },
    {
      value: 'adult',
      label: 'Adult Mode (18+)',
      subtitle: 'Show mature titles',
      icon: <Shield size={16} className="text-[var(--accent)]" />,
    },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className="flex items-center gap-1.5 px-2.5 min-h-[40px] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        style={{
          background: isFamily ? 'var(--bg-secondary)' : 'var(--accent-glow)',
          border: `1px solid ${isFamily ? 'var(--border-color)' : 'var(--accent)'}`,
          color: isFamily ? 'var(--text-secondary)' : 'var(--accent)',
        }}
        aria-label={`Content mode: ${isFamily ? 'Family Mode' : 'Adult Mode 18+'}`}
        aria-expanded={open}
        aria-haspopup="menu"
        title={`Current mode: ${isFamily ? 'Family Mode' : 'Adult Mode (18+)'}`}
      >
        {isFamily ? <EyeOff size={15} /> : <Eye size={15} />}
        <span className="hidden sm:inline">{isFamily ? 'Family' : '18+'}</span>
        <ChevronDown
          size={12}
          className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[70] bg-black/25 sm:bg-transparent"
            onClick={closeMenu}
            aria-hidden="true"
          />

          <div
            role="menu"
            className="fixed left-3 right-3 top-[62px] sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 rounded-xl overflow-hidden shadow-2xl z-[80]"
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="p-2">
              <p className="text-[11px] uppercase tracking-wider text-[var(--text-muted)] px-2.5 py-1.5 font-semibold">
                Reading Filter
              </p>

              <div className="space-y-1">
                {options.map((opt) => {
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => {
                        setMode(opt.value);
                        closeMenu();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 min-h-[44px] rounded-lg text-left transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer"
                      style={{
                        background: active ? 'var(--accent-glow)' : 'transparent',
                      }}
                    >
                      <span className="shrink-0">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                        >
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] truncate">
                          {opt.subtitle}
                        </p>
                      </div>
                      {active && <Check size={14} className="text-[var(--accent)] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
