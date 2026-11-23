import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { BookmarkProvider } from '@/context/BookmarkContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ContentModeProvider } from '@/context/ContentModeContext';
import { ToastProvider } from '@/components/ui/Toast';
import { PWAInstallPrompt } from '@/components/layout/PWAInstallPrompt';
import { ServiceWorkerManager } from '@/components/layout/ServiceWorkerManager';
import { SITE_URL } from '@/lib/site-url';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0B0E' },
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'MangaBD — Discover, Track & Read Manga',
  description: 'Your premier manga directory and reader hub. Browse trending series, track chapter releases, and get instant Telegram notifications.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MangaBD',
  },
  openGraph: {
    title: 'MangaBD — Discover, Track & Read Manga',
    description: 'Your premier manga directory and reader hub with instant Telegram chapter alerts.',
    url: SITE_URL,
    type: 'website',
    siteName: 'MangaBD',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'MangaBD - Manga Directory & Reader Hub',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MangaBD — Discover, Track & Read Manga',
    description: 'Browse trending manga, track chapters, and receive instant Telegram alerts.',
    images: ['/og-default.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${outfit.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <ServiceWorkerManager />
        <ThemeProvider>
          <AuthProvider>
            <ContentModeProvider>
              <BookmarkProvider>
                <NotificationProvider>
                  <ToastProvider>
                    {children}
                    <PWAInstallPrompt />
                  </ToastProvider>
                </NotificationProvider>
              </BookmarkProvider>
            </ContentModeProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
