// Site-wide configuration constants
import { SITE_URL } from './site-url';

export const SITE_CONFIG = {
  name: 'MangaBD',
  creator: 'MD MEHADI HASAN',
  url: SITE_URL,
  description:
    'Your premier Bengali & English manga directory and reader hub. Discover trending series, track chapters, and get instant Telegram alerts.',

  // Social Media Links
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://facebook.com/mangabd',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || 'https://t.me/mangabd',
  },
  telegramBotUrl:
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ||
    process.env.NEXT_PUBLIC_TELEGRAM_URL ||
    'https://t.me/mangabd',

  // Feature Flags (default OFF for adult mode)
  features: {
    adultModeEnabled: process.env.NEXT_PUBLIC_ENABLE_ADULT_MODE === 'true',
  },
};
