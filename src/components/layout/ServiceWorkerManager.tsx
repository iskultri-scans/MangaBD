'use client';

import { useEffect } from 'react';

export function ServiceWorkerManager() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } else {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => {
            reg.unregister().catch(() => {});
          });
        })
        .catch(() => {});

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => {
            keys.forEach((key) => {
              caches.delete(key).catch(() => {});
            });
          })
          .catch(() => {});
      }
    }
  }, []);

  return null;
}
