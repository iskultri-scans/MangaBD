// Site-wide configuration constants
import { SITE_URL } from './site-url';

export const SITE_CONFIG = {
  name: 'MangaBD',
  creator: 'MD MEHADI HASAN',
  url: SITE_URL,
  description: 'Your premier English manga directory & reader hub. Discover trending series, track chapters, and get instant Telegram alerts.',

  // Social Media Links
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://facebook.com/mangabd',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/mangabd',
  },
  telegramBotUrl: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/mangabd',

  // Admin
  adminEmail: process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'mahadyking351@gmail.com',
  adminEmails: [
    ...(process.env.NEXT_PUBLIC_ADMIN_EMAIL ? [process.env.NEXT_PUBLIC_ADMIN_EMAIL] : []),
    'mahadyking351@gmail.com',
    'bongmanga.official@gmail.com',
  ],
};
