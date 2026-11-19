# ISKULTRIP SCANS

বাংলায় মাঙ্গা পড়ুন — Read manga in Bengali.

A Next.js 16 + Firebase + Tailwind CSS manga reader with **Adult Mode / Family Mode** content filtering, designed primarily for Bangladeshi readers.

---

## ✨ Features

- **🔍 Browse & Search** — Filter by genre, language, status, sort by newest / rating / A-Z
- **📚 Manga details** — Cover, banner, synopsis, author/artist, genre tags, chapter list (links to Google Drive PDFs)
- **🔖 Bookmarks** — Save manga locally (guest) or to Firestore (logged-in users), auto-migrate from local to cloud
- **🔞 Adult Mode / Family Mode** — Toggle in navbar. Family Mode hides 18+ content entirely; Adult Mode (with age verification) shows everything with badges
- **🏠 Server-rendered home page** — ISR for SEO + fast LCP
- **📱 PWA** — Installable, offline-capable, with manifest and service worker
- **🎨 Dark / Light theme** — Auto-detect + manual toggle
- **🔔 Notifications** — In-app bell for new manga/chapters/announcements
- **📝 Manga requests** — Users can request new manga, upvote others' requests
- **📅 Upcoming releases** — Countdown to scheduled manga drops
- **🛡️ Admin panel** — Manage manga, chapters, genres, announcements, requests (admin-only via Firestore rules)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A Firebase project (Blaze plan recommended for Admin SDK)
- Google Drive for hosting chapter PDFs

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# 3. Run dev server
npm run dev
```

Visit http://localhost:3000

### Deploy to Vercel

1. Push to GitHub (DO NOT include `.env.local`)
2. Import repo on https://vercel.com
3. Add environment variables in Vercel project settings (see `.env.example`)
4. Deploy

---

## 🔐 Security Notes

- **Firestore rules**: Only the admin email can write to public collections. Anyone can read.
- **Admin access**: Controlled by `NEXT_PUBLIC_ADMIN_EMAIL` env var (matched against Firebase auth email)
- **Adult Mode**: Stored in both `localStorage` AND a cookie — the cookie lets the server filter adult content during SSR for SEO safety
- **Service worker**: Does NOT cache `/bookmarks` (auth-required page)
- **CSP**: `unsafe-eval` removed; `unsafe-inline` kept temporarily (migrate to nonce-based CSP later)

---

## 📂 Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── page.tsx              # Home (Server Component + ISR)
│   ├── manga/[slug]/         # Manga detail page (Server + Client)
│   ├── browse/               # Browse all manga
│   ├── search/               # Search page
│   ├── genre/[slug]/         # Genre filter page
│   ├── bookmarks/            # User bookmarks
│   ├── requests/             # Manga requests
│   ├── blog/                 # Blog
│   ├── admin/                # Admin panel
│   ├── api/                  # API routes
│   └── layout.tsx            # Root layout with all providers
├── components/
│   ├── layout/               # Navbar, Footer, ContentModeToggle, AgeVerificationModal
│   ├── manga/                # MangaCard, MangaGrid, MangaDetail, AdultBadge, etc.
│   ├── home/                 # HomeContent, HeroBanner, TrendingSection, etc.
│   ├── admin/                # MangaForm, ChapterManager, etc.
│   └── ui/                   # shadcn/ui primitives
├── context/                  # AuthContext, BookmarkContext, ContentModeContext, ThemeContext, NotificationContext
├── hooks/                    # useDebounce, usePagination, use-mobile, use-toast
└── lib/                      # firebase.ts, firebase-admin.ts, firestore.ts, auth.ts, config.ts, utils.ts, jikan.ts
```

---

## 🔧 Adult / Family Mode — How it Works

| State | What happens |
|-------|--------------|
| **Default (new visitor)** | Family Mode — 18+ manga hidden everywhere |
| **User clicks Adult Mode** | Age verification modal opens |
| **User confirms 18+** | `isAgeVerified=true` saved to localStorage + cookie, mode switches to Adult |
| **Adult Mode on** | All manga visible, 18+ badge shown on adult cards/details |
| **User toggles back to Family** | Adult manga immediately hidden |

Server-side: Home page checks the `iskultrip-content-mode` + `iskultrip-age-verified` cookies. If both are set to adult/true, adult content is included in SSR. Otherwise, only family-safe manga are server-rendered (good for SEO + safe defaults).

To mark a manga as adult: open Admin → Manga → Add/Edit → check "Adult Content (18+)".

---

## 🗄️ Firestore Indexes

Composite indexes are required for proper query performance. They are defined in `firestore.indexes.json` — deploy with:

```bash
firebase deploy --only firestore:indexes
```

The code automatically falls back to client-side filtering if indexes aren't deployed yet, but you'll see warnings in the logs.

---

## 📜 License

This project is for educational/community use. Manga content belongs to respective copyright holders. DMCA takedown requests are honored via the `/dmca` page.

---

## 👨‍💻 Author

**MD MEHADI HASAN** — ISKULTRIP SCANS
