'use client';

/**
 * ContentModeContext — Adult Mode / Family Mode toggle
 *
 * কাজ:
 *   - Family Mode (default): সব `isAdult: true` manga লুকানো হবে
 *   - Adult Mode: সব manga দেখানো হবে, adult content-এ 18+ badge থাকবে
 *   - প্রথমবার Adult Mode-এ যাওয়ার সময় age verification modal দেখাবে
 *   - Preference localStorage + cookie-তে রাখা হয় (cookie দিয়ে server-side filtering করা যায়)
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AgeVerificationModal } from '@/components/layout/AgeVerificationModal';
import { SITE_CONFIG } from '@/lib/config';

export type ContentMode = 'family' | 'adult';

interface ContentModeContextType {
  mode: ContentMode;
  isAgeVerified: boolean;
  /** Switch to a specific mode. If switching to 'adult' without verification, opens the modal. */
  setMode: (mode: ContentMode) => void;
  /** Toggle between family ↔ adult. */
  toggleMode: () => void;
  /** Manually open the age verification modal. */
  requestAdultAccess: () => void;
  /** Filter a list of manga based on the current mode. */
  filterByMode: <T extends { isAdult?: boolean }>(manga: T[]) => T[];
}

const STORAGE_KEY_MODE = 'mangabd-content-mode';
const STORAGE_KEY_AGE = 'mangabd-age-verified';
const COOKIE_KEY_MODE = 'mangabd-content-mode';
const COOKIE_KEY_AGE = 'mangabd-age-verified';
const ADULT_MODE_ENABLED = SITE_CONFIG.features.adultModeEnabled;

function setCookie(name: string, value: string, days: number = 365) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

const ContentModeContext = createContext<ContentModeContextType>({
  mode: 'family',
  isAgeVerified: false,
  setMode: () => {},
  toggleMode: () => {},
  requestAdultAccess: () => {},
  filterByMode: (m) => m,
});

export function ContentModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ContentMode>('family');
  const [isAgeVerified, setIsAgeVerified] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load persisted preferences on mount
  useEffect(() => {
    if (!ADULT_MODE_ENABLED) {
      setModeState('family');
      setIsAgeVerified(false);
      setMounted(true);
      return;
    }
    try {
      const storedMode = localStorage.getItem(STORAGE_KEY_MODE) as ContentMode | null;
      const storedAge = localStorage.getItem(STORAGE_KEY_AGE) === 'true';

      setIsAgeVerified(storedAge);

      if (storedMode === 'adult' && storedAge) {
        setModeState('adult');
      } else {
        setModeState('family');
        if (storedMode === 'adult' && !storedAge) {
          localStorage.setItem(STORAGE_KEY_MODE, 'family');
          setCookie(COOKIE_KEY_MODE, 'family');
        }
      }
    } catch {
      // localStorage might be unavailable
    }
    setMounted(true);
  }, []);

  const persistMode = useCallback((newMode: ContentMode) => {
    const effectiveMode: ContentMode = ADULT_MODE_ENABLED ? newMode : 'family';
    setModeState(effectiveMode);
    try {
      localStorage.setItem(STORAGE_KEY_MODE, effectiveMode);
    } catch {}
    setCookie(COOKIE_KEY_MODE, effectiveMode);
  }, []);

  const persistAgeVerification = useCallback((verified: boolean) => {
    if (!ADULT_MODE_ENABLED) return;
    setIsAgeVerified(verified);
    try {
      localStorage.setItem(STORAGE_KEY_AGE, verified ? 'true' : 'false');
    } catch {}
    setCookie(COOKIE_KEY_AGE, verified ? 'true' : 'false');
  }, []);

  const setMode = useCallback(
    (newMode: ContentMode) => {
      if (!ADULT_MODE_ENABLED) {
        persistMode('family');
        return;
      }
      if (newMode === 'adult' && !isAgeVerified) {
        setShowAgeModal(true);
        return;
      }
      persistMode(newMode);
    },
    [isAgeVerified, persistMode]
  );

  const toggleMode = useCallback(() => {
    if (!ADULT_MODE_ENABLED) return;
    if (mode === 'family') {
      setMode('adult');
    } else {
      persistMode('family');
    }
  }, [mode, setMode, persistMode]);

  const requestAdultAccess = useCallback(() => {
    if (!ADULT_MODE_ENABLED) return;
    setShowAgeModal(true);
  }, []);

  const handleAgeVerified = useCallback(() => {
    persistAgeVerification(true);
    persistMode('adult');
    setShowAgeModal(false);
  }, [persistAgeVerification, persistMode]);

  const handleAgeDeclined = useCallback(() => {
    setShowAgeModal(false);
    persistMode('family');
  }, [persistMode]);

  const filterByMode = useCallback(
    <T extends { isAdult?: boolean }>(mangaList: T[]): T[] => {
      if (!ADULT_MODE_ENABLED || mode === 'family') {
        return mangaList.filter((m) => !m.isAdult);
      }
      return mangaList;
    },
    [mode]
  );

  return (
    <ContentModeContext.Provider
      value={{
        mode: ADULT_MODE_ENABLED ? mode : 'family',
        isAgeVerified: ADULT_MODE_ENABLED ? isAgeVerified : false,
        setMode,
        toggleMode,
        requestAdultAccess,
        filterByMode,
      }}
    >
      {children}
      {ADULT_MODE_ENABLED && mounted && showAgeModal && (
        <AgeVerificationModal onConfirm={handleAgeVerified} onCancel={handleAgeDeclined} />
      )}
    </ContentModeContext.Provider>
  );
}

export function useContentMode() {
  const context = useContext(ContentModeContext);
  if (!context) throw new Error('useContentMode must be used within ContentModeProvider');
  return context;
}
