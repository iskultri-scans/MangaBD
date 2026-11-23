'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = 'mangabd-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start with 'dark' to match SSR HTML and prevent hydration mismatches
  const [theme, setTheme] = useState<Theme>('dark');
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(stored);
      }
    } catch {
      // ignore storage access issues
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage access issues
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
