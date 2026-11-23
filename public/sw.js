const CACHE_NAME = 'mangabd-v3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/brand/mangabd-mark.svg',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/no-cover.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Next.js internal chunks, HMR, API routes, or Firebase/external calls
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Always network-first for HTML documents and scripts/styles
  if (request.mode === 'navigate' || url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Cache static media/icons/fonts with network fallback
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
            });
          }
          return response;
        });
      })
    );
  }
});
