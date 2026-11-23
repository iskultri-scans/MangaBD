import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Enable standalone output for AI Studio / containerized deployment
  output: 'standalone',

  // ✅ Allow AI Studio / Cloud Run preview hosts to access Next.js dev resources
  allowedDevOrigins: [
    '**.run.app',
    '*.asia-northeast1.run.app',
    '*.asia-southeast1.run.app',
    '*.run.app',
    'localhost',
    '127.0.0.1',
  ],

  // ✅ Enable React strict mode — catches bugs in development
  reactStrictMode: true,

  // ⚠️ Do NOT ignore TypeScript errors in production builds.
  // If there are type errors, fix them — don't hide them.
  typescript: {
    ignoreBuildErrors: false,
  },

  // ✅ Enable Next.js image optimization — critical for a manga site.
  // Without this, every cover/banner image loads at full size,
  // killing mobile data and LCP scores.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Manga covers / banners commonly come from these CDNs
      { protocol: 'https', hostname: '**' },
    ],
  },

  // Security + PWA headers
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://apis.google.com https://www.googletagmanager.com`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com https://firebaseinstallations.googleapis.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.jikan.moe https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com",
              "frame-src https://www.facebook.com https://web.facebook.com https://telegram.org https://t.me https://*.firebaseapp.com https://accounts.google.com",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
