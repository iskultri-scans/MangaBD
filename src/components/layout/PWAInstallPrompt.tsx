'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const dismissed = sessionStorage.getItem('pwa-prompt-dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 right-4 z-50 mx-auto max-w-md toast-enter">
      <div
        className="rounded-xl p-4 shadow-xl"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-glow)' }}
          >
            <Smartphone size={18} className="text-[var(--accent)]" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">
              Install MangaBD
            </h3>
            {isIOS ? (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Tap <Share size={13} className="inline mx-0.5 text-[var(--accent)]" /> Share then &quot;Add to Home Screen&quot; to install.
              </p>
            ) : (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Add MangaBD to your home screen for instant catalog access.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0 cursor-pointer"
            aria-label="Dismiss install prompt"
          >
            <X size={16} />
          </button>
        </div>

        {!isIOS && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstall}
            className="mt-3 w-full btn-accent flex items-center justify-center gap-2 text-xs py-2.5 cursor-pointer"
          >
            <Download size={15} />
            Install App
          </button>
        )}
      </div>
    </div>
  );
}
