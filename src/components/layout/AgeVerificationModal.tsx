'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, Check, X, Eye, EyeOff } from 'lucide-react';

interface AgeVerificationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function AgeVerificationModal({ onConfirm, onCancel }: AgeVerificationModalProps) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-[2px]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-verify-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-xl overflow-hidden shadow-2xl toast-enter"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-3 right-3 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <div className="p-6 sm:p-8 text-center">
          <div
            className="w-12 h-12 mx-auto mb-4 rounded-lg flex items-center justify-center"
            style={{
              background: 'var(--accent-glow)',
              border: '1px solid var(--accent)',
            }}
          >
            <ShieldAlert size={24} className="text-[var(--accent)]" />
          </div>

          <h2 id="age-verify-title" className="font-display text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
            Enable Adult Mode (18+)
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-5 leading-relaxed">
            This mode displays mature 18+ series. Confirm that you are{' '}
            <strong className="text-[var(--text-primary)]">18 years of age or older</strong>.
          </p>

          <div
            className="text-left rounded-lg p-3.5 mb-5 space-y-2.5"
            style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
          >
            <div className="flex items-start gap-2.5">
              <Eye size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                Adult-tagged series are displayed and clearly marked with an 18+ indicator.
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <EyeOff size={14} className="text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--text-secondary)]">
                Switch back to Family Mode anytime from the top navigation bar.
              </p>
            </div>
          </div>

          <label className="flex items-center justify-center gap-2.5 cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--accent)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              I confirm that I am 18+ and consent to viewing mature content.
            </span>
          </label>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 min-h-[42px] rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!checked}
              className="flex-1 btn-accent flex items-center justify-center gap-2 text-sm min-h-[42px] cursor-pointer"
            >
              <Check size={16} />
              Enable Adult Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
