# MangaBD

বাংলায় ও ইংরেজিতে মাঙ্গা পড়ুন — Read Bengali & English manga on MangaBD.

A Next.js 16 + Firebase + Tailwind CSS v4 manga directory and reader platform with **Telegram CDN chapter hosting**, **built-in vertical-scroll reader**, **Google OAuth**, and **Telegram Bot channel/DM alerts**.

---

## ✨ Features

- **📖 Built-in Chapter Reader (`/read/[slug]/[chapter]`)** — Vertical-scroll reader streaming hosted chapter pages via `/api/image/[fileId]` with lazy loading, next-2-page preloading, per-page retry, sticky chapter navigation, and external fallback for legacy links
- **🔍 Browse & Search** — Filter by genre, language (`EN`/`BN`), status, and sort by newest / rating / A-Z
- **📚 Manga Details & Metadata Auto-Fill** — Cover, banner, synopsis, author/artist, genre tags, and chapter list, with admin auto-fill powered by public MAL (Jikan), AniList, and MangaDex APIs
- **🔖 Cloud Bookmarks** — Save manga locally (guest) or to Firestore (signed-in Google accounts)
- **📲 Telegram CDN & Instant Alerts** — Admin chapter uploader compresses >3.5MB pages to WebP/JPEG, uploads to a private Telegram Storage Channel, broadcasts to the Main Channel, and sends targeted DM alerts to linked readers who bookmarked the series
- **🛡️ Feature-Flagged Content Filtering** — Adult Mode is disabled by default (`NEXT_PUBLIC_ENABLE_ADULT_MODE=false`), keeping the catalog strictly family-safe across SSR and client views
- **📱 PWA & Responsive UI** — Installable manifest, service worker, and Dark Ink / Light Paper themes
- **📝 Community Requests & Journal** — Signed-in readers can request titles, upvote atomically (1 vote per UID), and follow upcoming releases

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Firebase project (`mangabd-prod`, Firestore Native mode + Google Auth enabled)
- Telegram Bot token + Private Storage Channel + Main Broadcast Channel (optional for local UI browsing, required for CDN uploads/broadcasts)

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in Firebase Client, Firebase Admin, and Telegram server environment variables

# 3. Run dev server
npm run dev
```

Visit `http://localhost:3000`.

### Deploy to Vercel

1. Push commits to both `origin` (`mangabd/mangabd`) and `mirror` (`iskultri-scans/mangabd`) — never commit `.env.local` or secrets
2. Configure environment variables in Vercel project settings (see `.env.example` and `PROJECT_CONTEXT.md`)
3. Vercel auto-deploys from `mirror`

---

## 🔐 Security Notes

- **Authentication**: Google OAuth only (`signInWithPopup`).
- **Admin Access**: Verified via Firestore `admins/{uid}` documents in both `firestore.rules` and server-side API routes (`verifyIdToken` + signed `mangabd-session` HttpOnly cookie).
- **Telegram CDN Privacy**: `TELEGRAM_BOT_TOKEN` never leaves the server; `/api/image/[fileId]` streams images server-side without exposing Telegram `file_path` URLs.
- **Adult Mode Feature Flag**: `NEXT_PUBLIC_ENABLE_ADULT_MODE` defaults to `false`. Both SSR (`src/app/page.tsx`) and client UI (`ContentModeContext`, `ContentModeToggle`) keep Adult Mode disabled unless explicitly enabled.

---

## 📂 Project Structure

```text
src/
├── app/
│   ├── page.tsx                      # Home (Server Component + ISR)
│   ├── read/[slug]/[chapter]/        # Internal vertical-scroll manga reader
│   ├── manga/[slug]/                 # Manga detail & chapter list
│   ├── browse/                       # Filterable catalog
│   ├── search/                       # Search page
│   ├── genre/[slug]/                 # Genre filter page
│   ├── bookmarks/                    # User bookmarks
│   ├── requests/                     # Community manga requests
│   ├── blog/                         # Journal & announcements
│   ├── admin/                        # Editorial admin console (manga, chapters, telegram, genres, etc.)
│   └── api/                          # Server routes (admin/session, image/[fileId], manga/*, telegram/*)
├── components/                       # UI, layout, manga, home, and admin components
├── context/                          # Auth, Bookmark, ContentMode, Notification, Theme providers
├── hooks/                            # useDebounce, usePagination, use-mobile, use-toast
└── lib/                              # firebase, firebase-admin, firestore, auth, server-auth, telegram, jikan, config
```

---

## 🗄️ Firestore Rules & Indexes

Rules and composite indexes are defined in `firestore.rules` and `firestore.indexes.json` and deployed via Firebase CLI:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 📜 License & DMCA

This project is for community manga indexing and reading. Copyrighted content belongs to respective rights holders; DMCA takedown requests are handled via `/dmca`.

---

## 👨‍💻 Author

**MD MEHADI HASAN** — MangaBD
