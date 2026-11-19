// Site-wide configuration constants
import { SITE_URL } from './site-url';

export const SITE_CONFIG = {
  name: 'MangaBD',
  creator: 'MD MEHADI HASAN',
  url: SITE_URL,
  description:
    'Your premier Bengali & English manga directory and reader hub. Discover trending series, track chapters, and get instant Telegram alerts.',

  // Social Media Links (empty when env var is not set)
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL || '',
    telegram: process.env.NEXT_PUBLIC_TELEGRAM_URL || '',
  },
  telegramBotUrl:
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/bong_manga_bot',

  // Feature Flags (default OFF for adult mode)
  features: {
    adultModeEnabled: process.env.NEXT_PUBLIC_ENABLE_ADULT_MODE === 'true',
  },
};
