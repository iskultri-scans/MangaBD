# PROJECT_CONTEXT.md — MangaBD

> **Status:** Round 6 Complete (Seamless Reader & Image CDN Speed)  
> **Last Updated:** 2026-11-23  
> **Owner:** Mehedi  
> **Role Structure:** PM (external AI) → Lead Engineer (codebase agent)

---

## 1. Identity (LOCKED)
- **Product Name:** MangaBD
- **Purpose:** Bengali & English manga reading platform with Google Auth, bookmarks, Telegram CDN image hosting, and targeted Telegram chapter broadcast notifications.
- **Target Production Firebase Project:** `mangabd-prod` (Business Google Account, Firestore Native mode, region `asia-south1`).

## 2. Stack (LOCKED)
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript 5
- **Styling:** Tailwind CSS v4 + Radix UI / shadcn primitives + `lucide-react` + `framer-motion`
- **Database & Auth:** Firebase Auth (Google OAuth) + Cloud Firestore (Client SDK + Firebase Admin SDK)
- **Image Hosting & Notifications:** Telegram Bot API (`@bong_manga_bot`) — Private Storage Channel (CDN) + Main Channel Broadcast + Targeted User DMs
- **Deployment Target:** Vercel (HTTPS production)

## 3. Architecture (LOCKED)
- **Web App (Next.js):** Handles reader UI, Google login, bookmarks, admin panel, and server-side API routes.
- **Telegram Private Storage Channel:** Admin uploads chapter images via `/api/telegram/upload` → server sends to Telegram Private Channel → stores immutable `file_id`s in Firestore `chapters` subcollection.
- **Image Proxy (`/api/image/[fileId]`):** Streams images from Telegram server-side without exposing `TELEGRAM_BOT_TOKEN` or `file_path`, with 45-minute in-memory `file_path` TTL cache + `Cache-Control: public, max-age=31536000, immutable`.
- **Account Linking:** Authenticated user clicks **Connect Telegram** → `POST /api/telegram/link-token` creates 10-minute single-use token → user opens `https://t.me/<bot>?start=link_<token>` → `/api/telegram/webhook` verifies `X-Telegram-Bot-Api-Secret-Token`, links `telegramChatId` to `users/{uid}`, and deletes token.
- **Broadcasts:** Admin publishes chapter → `POST /api/telegram/broadcast` posts to Main Channel and sends rate-limited DMs (20/batch, 1s delay) only to linked users with `notificationsEnabled: true` who bookmarked that manga (or all linked users for global announcements).

## 4. Security Invariants (LOCKED)
1. **Zero secrets in client code or git & controlled writes:** `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `FIREBASE_ADMIN_*` must stay server-only and never be committed. Admin লেখা client SDK দিয়ে হলেও চলবে যদি `firestore.rules`-এ `isAdmin()` + schema validation enforced থাকে।
2. **Admin-only mutations:** `/api/telegram/upload` and `/api/telegram/broadcast` must strictly require verified admin authorization (`admins/{uid}`).
3. **Webhook authentication:** `/api/telegram/webhook` must verify `X-Telegram-Bot-Api-Secret-Token` (mandatory in production, `503` if unset).
4. **Single-use expiring link tokens:** `telegramLinkTokens` must expire (10 min) and be invalidated atomically inside `runTransaction`; client read/write completely blocked.
5. **No Telegram URL leakage:** `/api/image/[fileId]` must never leak `file_path` or `bot_token` to the browser.
6. **No Adult Content Uploads:** Adult content upload is strictly prohibited; adult mode remains feature-flagged OFF (`NEXT_PUBLIC_ENABLE_ADULT_MODE=false`).

## 5. Environment Variables (LOCKED)
*(Names and locations only — never store values here.)*

### Client-side (`NEXT_PUBLIC_*` — Vercel & `.env.local`)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` *(optional)*
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ENABLE_ADULT_MODE` *(default `false`)*
- `NEXT_PUBLIC_FACEBOOK_URL` *(optional)*
- `NEXT_PUBLIC_TELEGRAM_URL` *(optional)*
- `NEXT_PUBLIC_TELEGRAM_BOT_URL` *(optional)*

### Server-side (Secrets — Vercel & `.env.local` ONLY)
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` *(single-line PEM with literal `\n`)*
- `FIREBASE_ADMIN_DATABASE_ID` *(optional named DB override)*
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_STORAGE_CHANNEL_ID`
- `TELEGRAM_MAIN_CHANNEL_ID`
- `TELEGRAM_WEBHOOK_SECRET`

## 6. Roadmap (LOCKED)
- **Round 1:** Codebase & Security Audit + Business Firebase Migration Guide *(Completed)*
- **Round 1.5:** `PROJECT_CONTEXT.md` + `.gitignore` verification + Baseline GitHub Push *(Current)*
- **Round 2:** Security & UX Fixes (`S1`–`S7`, `U1`–`U3`), Branding cleanup, Adult-flag tasks *(Pending PM trigger)*
- **Round 3+:** Production cutover (`mangabd-prod` + Vercel + Webhook + Smoke Test), Monetization / Premium unlock (if approved by PM)

## 7. Rules (LOCKED)
- সেশন শুরুতে `git fetch` করে `HEAD` vs `origin` মিলাও; `.git` না থাকলে থামো, রিপোর্ট করো — নতুন টোকেনে re-clone হবে।
- **Dual-Push & Mirror Workflow (LOCKED):** Business repo `origin` (`https://github.com/mangabd/mangabd.git`) হলো **source of truth**, এবং personal private repo `mirror` (`https://github.com/iskultri-scans/mangabd.git`) হলো **deploy-only mirror** (personal Vercel অ্যাকাউন্ট `iskultri-scans`-এর সাথে connected থাকায় `mirror`-এ push হলেই auto-deploy ট্রিগার হয়)। প্রতিটি commit অবশ্যই দুই remote-এ (`origin` + `mirror`) push করতে হবে এবং কখনো `.git/config`-এ token সেভ রাখা যাবে না।
- **Commit Author Identity (LOCKED):** প্রতি সেশনে প্রতিটি commit অবশ্যই repo মালিকের identity-তে করতে হবে: `git config user.name "mangabd"` এবং `git config user.email "mangabd99@gmail.com"` (অন্য author যেমন `mahady1212` দিলে Vercel Hobby + private repo auto-deploy ব্লক হয়)।
- Adult কনটেন্ট আপলোড নিষেধ।
- Never fabricate code or deployment state; verify against the actual repository.
- Never print secrets (tokens, private keys, service account JSON, API keys) in chat, commits, or docs.
- Update Decision Log & Changelog after every completed round.

---

## 8. Complete Folder Tree & Key File Responsibilities

```text
.
├── .env.example                          # Template for required environment variables (no secrets)
├── .gitignore                            # Ignores node_modules, .next, .env*.local, service account JSONs
├── PROJECT_CONTEXT.md                    # Single source of truth for PM & Lead Engineer
├── firebase-applet-config.json           # AI Studio provisioned client Firebase config (dev fallback)
├── firebase-blueprint.json               # Firestore entity schemas & collection paths
├── firestore.indexes.json                # Firestore composite index definitions
├── firestore.rules                       # Firestore security rules
├── next.config.ts                        # Next.js configuration (images, headers)
├── package.json                          # Dependencies & npm scripts
├── public/                               # Static assets, PWA manifest, service worker, icons
├── scripts/                              # Seed & Firebase verification helper scripts
└── src/
    ├── middleware.ts                     # Route middleware
    ├── app/
    │   ├── layout.tsx                    # Root layout, fonts, providers, metadata
    │   ├── page.tsx                      # Home page
    │   ├── admin/                        # Admin dashboard pages (manga, chapters, announcements, requests)
    │   ├── api/
    │   │   ├── admin/session/route.ts    # Admin session cookie management
    │   │   ├── image/[fileId]/route.ts   # Telegram CDN streaming image proxy with immutable cache
    │   │   └── telegram/
    │   │       ├── broadcast/route.ts    # Admin-only Main Channel + bookmark-targeted DM broadcast
    │   │       ├── link-token/route.ts   # User Telegram link status, token generation, unlink
    │   │       ├── notify/route.ts       # Legacy/simple Telegram notification endpoint
    │   │       ├── upload/route.ts       # Admin-only multi-image uploader to Telegram Private Channel
    │   │       └── webhook/route.ts      # Telegram Bot webhook (/start link_<token>, /stop, /start)
    │   ├── blog/                         # Announcements / blog pages
    │   ├── bookmarks/                    # User bookmarks page
    │   ├── browse/                       # Filterable manga catalog
    │   ├── dmca/                         # DMCA policy page
    │   ├── genre/                        # Genre listing pages
    │   ├── login/                        # User/Admin login page
    │   ├── manga/                        # Manga detail & chapter list pages
    │   ├── read/[slug]/[chapter]/page.tsx# Internal vertical-scroll chapter reader (/api/image/[fileId])
    │   ├── requests/                     # Community manga request board
    │   └── search/                       # Search page
    ├── components/
    │   ├── admin/ChapterManager.tsx      # Admin chapter form: multi-image batched upload + internal reader fallback
    │   ├── layout/TelegramConnectCard.tsx# User profile card: Connect/Disconnect Telegram + notifications toggle
    │   ├── layout/UserMenu.tsx           # Desktop user dropdown embedding TelegramConnectCard
    │   ├── layout/MobileMenu.tsx         # Mobile drawer embedding TelegramConnectCard
    │   ├── manga/ChapterList.tsx         # Chapter list linking Read button to /read/{slug}/{chapter} or external readLink
    │   ├── manga/MangaReaderModal.tsx    # Legacy modal reader component
    │   └── ui/                           # Reusable UI primitives
    ├── context/                          # React contexts (Auth, Bookmark, ContentMode, Notification, Theme)
    ├── hooks/                            # Custom hooks (useDebounce, usePagination, use-mobile, use-toast)
    └── lib/
        ├── auth.ts                       # Admin session cookie verification helper
        ├── config.ts                     # Site config, social links, admin email allowlist
        ├── firebase.ts                   # Firebase Client SDK singleton (Auth + Firestore)
        ├── firebase-admin.ts             # Firebase Admin SDK singleton (newline-safe private key, DB selection)
        ├── firestore.ts                  # Client-side Firestore CRUD helpers & TypeScript interfaces
        ├── server-auth.ts                # Server-side Bearer ID token & admin authorization helpers
        ├── site-url.ts                   # Canonical site URL normalizer
        └── telegram.ts                   # Telegram Bot API client (upload, 45m TTL cache, proxy stream, broadcast, DMs)
```

---

## 9. Firestore Schema

| Collection Path | Fields & Types |
| :--- | :--- |
| `/manga/{mangaId}` | `title: string`, `titleBn?: string`, `slug: string`, `description?: string`, `coverImage: string`, `bannerImage?: string`, `genres: string[]`, `author?: string`, `artist?: string`, `status: 'ongoing'\|'completed'\|'hiatus'`, `rating?: number`, `totalChapters?: number`, `language: 'en'\|'bn'`, `readLink?: string`, `featured?: boolean`, `trending?: boolean`, `isAdult?: boolean`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `/manga/{mangaId}/chapters/{chapterId}` | `mangaId: string`, `title: string`, `chapterNumber: number`, `readLink: string`, `pages?: Array<{ pageNumber: number, fileId: string }>`, `createdAt: Timestamp` |
| `/genres/{genreId}` | `name: string`, `slug: string`, `mangaCount?: number` |
| `/announcements/{announcementId}` | `title: string`, `titleBn?: string`, `content: string`, `contentBn?: string`, `type: 'announcement'\|'upcoming'\|'update'`, `mangaId?: string`, `coverImage?: string`, `releaseDate?: Timestamp`, `createdAt: Timestamp`, `updatedAt: Timestamp` |
| `/upcomingReleases/{upcomingReleaseId}` | `title: string`, `titleBn?: string`, `mangaId?: string`, `mangaSlug?: string`, `coverImage?: string`, `releaseDate: Timestamp`, `description?: string`, `createdAt: Timestamp` |
| `/notifications/{notificationId}` | `title: string`, `titleBn?: string`, `message: string`, `messageBn?: string`, `type: 'new_manga'\|'new_chapter'\|'announcement'`, `mangaId?: string`, `mangaSlug?: string`, `createdAt: Timestamp` |
| `/users/{userId}` | `email?: string`, `displayName?: string`, `telegramChatId?: string\|null`, `telegramUsername?: string\|null`, `telegramLinkedAt?: Timestamp\|null`, `notificationsEnabled?: boolean`, `telegramBlocked?: boolean`, `updatedAt?: Timestamp` |
| `/users/{userId}/bookmarks/{bookmarkId}` | `mangaId: string`, `title: string`, `titleBn?: string`, `slug: string`, `coverImage: string`, `rating?: number`, `status?: string`, `totalChapters?: number`, `language?: string`, `genres?: string[]`, `bookmarkedAt?: Timestamp` |
| `/telegramLinkTokens/{tokenId}` | `userId: string`, `email?: string\|null`, `displayName?: string\|null`, `used: boolean`, `createdAt: Timestamp`, `expiresAt: Timestamp` *(Server-only)* |
| `/broadcastLogs/{logId}` | `type: 'chapter'\|'announcement'`, `mangaId?: string`, `title: string`, `channelSent: boolean`, `dmTargeted: number`, `dmSent: number`, `dmFailed: number`, `createdAt: Timestamp` *(Server write, Admin read)* |
| `/requests/{requestId}` | `mangaTitle: string`, `mangaTitleBn?: string`, `description: string`, `requestedBy: string`, `status: 'pending'\|'approved'\|'completed'\|'rejected'`, `upvotes: number`, `upvotedBy: string[]`, `adminNote?: string`, `createdAt: Timestamp`, `updatedAt: Timestamp` |

---

## 10. API Route Contracts

| Route | Method | Auth | Request | Response |
| :--- | :--- | :--- | :--- | :--- |
| `/api/telegram/upload` | `GET` | Public | None | `{ configured, maxFileSizeMB: 4, maxFilesPerRequest: 1 }` |
| `/api/telegram/upload` | `POST` | Admin (`Bearer` or session cookie) | `multipart/form-data` (`files`/`file`, `startPage?`, `caption?`) | `{ ok, count, pages: [{ pageNumber, filename, fileId, fileUniqueId, fileSize, mimeType, proxyUrl }] }` |
| `/api/image/[fileId]` | `GET` | Public | Path param `fileId` (`^[A-Za-z0-9_-]{10,200}$`) | Binary image stream + `Cache-Control: public, max-age=31536000, immutable` |
| `/api/telegram/link-token` | `GET` | Authenticated User (`Bearer`) | None | `{ ok, linked, telegramUsername, notificationsEnabled, botUsername, adminConfigured }` |
| `/api/telegram/link-token` | `POST` | Authenticated User (`Bearer`) | None | `{ ok, token, deepLink, command, expiresInSeconds: 600 }` |
| `/api/telegram/link-token` | `DELETE` | Authenticated User (`Bearer`) | None | `{ ok, linked: false }` |
| `/api/telegram/webhook` | `POST` | Header `X-Telegram-Bot-Api-Secret-Token` | Telegram `Update` JSON | `{ ok: true }` (always 200 on handled updates to prevent Telegram retry loops) |
| `/api/telegram/broadcast` | `POST` | Admin (`Bearer` or session cookie) | JSON `{ type, mangaId?, title, message, url?, coverImage?, tag?, buttonLabel?, sendToChannel?, sendDMs? }` | `{ ok, channelSent, channelError?, dmTargeted, dmSent, dmFailed }` |
| `/api/admin/session` | `POST`/`DELETE` | Admin | Session token / logout | Sets or clears `mangabd-session` HTTP-only cookie |

---

## 11. Known Bugs & Fix Status (Round 2 Queue)

### Known Bugs
1. Dev environment mismatch: Client SDK points to `forward-mesh-7xctm` while local Admin SDK service account points to `nexusplay` (which has no `(default)` Firestore database yet → `5 NOT_FOUND`). Resolved permanently by migrating both to `mangabd-prod`.
2. Webhook is currently unset (`url: ""`) until production Vercel URL is live.

### Security & UX Fix Tracker (Round 2 Completed)
| ID | Category | Status |
| :--- | :--- | :--- |
| `S1` | Admin verify via `admins/{uid}` (60s cache) + remove hardcoded emails | `done` |
| `S2` | Firebase Admin `verifyIdToken()` + signed `mangabd-session` cookie only | `done` |
| `S3` | Mandatory `TELEGRAM_WEBHOOK_SECRET` in production (`503` if unset) | `done` |
| `S4` | Remove `memoryLinkTokens` & silent code-5 masking → explicit `503` | `done` |
| `S5` | Atomic link token consume inside Firestore `runTransaction` | `done` |
| `S6` | Server upload cap `4MB` + `1` file per request | `done` |
| `S7` | `firestore.rules` `isAdmin()` = `admins/{uid}` only (ready for PM review) | `done` |
| `U1` | Branding unified to `MangaBD` (`package.json`, `SITE_CONFIG`, `mangabd-session`) | `done` |
| `U2` | Adult mode gated OFF via `SITE_CONFIG.features.adultModeEnabled` (default `false`) | `done` |
| `U3` | Client uploader: per-page, concurrency 3, retry 2, resume/partial-merge, >3.5MB WebP compress | `done` |

---

## 12. Smoke Test Checklist (B11)
- [ ] Google Login works on production Vercel URL
- [ ] **Connect Telegram** opens `@bong_manga_bot` deep link
- [ ] Pressing **Start** in Telegram returns *"Account Connected!"*
- [ ] `users/{uid}` in `mangabd-prod` Firestore has `telegramChatId` & `telegramUsername`, and `telegramLinkTokens/{token}` is deleted
- [ ] Admin Panel uploads a 5-page chapter with progress bar and saves 5 `fileId`s to Firestore
- [ ] Manga Reader loads all 5 pages cleanly via `/api/image/<fileId>`
- [ ] Self-broadcast posts to Main Channel and sends DM to bookmarked linked account

---

## 13. Decision Log & Changelog

### Decision Log
- **2026-11-17:** Approved Next.js + Firebase Firestore + Telegram CDN/Broadcast decoupled architecture.
- **2026-11-18:** Decided to migrate from personal Firebase project to dedicated Business Firebase project `mangabd-prod` (`asia-south1`) + Vercel deployment.
- **2026-11-19:** Established `PROJECT_CONTEXT.md` as single source of truth for PM ↔ Lead Engineer workflow; completed Round 2 security, upload, and branding hardening.
- **2026-11-19 (P2 Reminder):** P2 premium ফিচার ইমপ্লিমেন্ট করার সময় `firestore.rules`-এর `hasOnly` whitelist-এ `isPremium` / `unlock` ফিল্ডগুলো যোগ করতে হবে।
- **2026-11-19 (Vote Cap Note):** `requests` collection-এ `upvotedBy.size() <= 500` ক্যাপ আছে (৫০০ ভোটের পর upvote বন্ধ — গ্রহণযোগ্য)।
- **2026-11-22 (Mirror Auto-Deploy):** Decided to keep `mangabd/mangabd` (`origin`) as business source of truth and `iskultri-scans/mangabd` (`mirror`) as deploy-only private mirror for Vercel auto-deploy; all commits must be dual-pushed to `origin` and `mirror`.
- **2026-11-23 (Round 4 — Internal Reader):** Added dedicated public reader route `/read/[slug]/[chapter]` rendering Telegram CDN pages via `/api/image/[fileId]` with next-2-page preloading and retry, while preserving external `readLink` fallback for legacy/external chapters.
- **2026-11-23 (Round 5 — Audit, Restore & Polish):** Unified `/admin/chapters` by reusing `<ChapterManager />`, upgraded metadata auto-fill to public multi-source cascade (`Jikan/MAL → AniList → MangaDex`) with inline title lookup, cleaned up leftover `ISKULTRIP` branding/cookies, and added client JPEG compression fallback, Telegram `429` retry + `AbortSignal.timeout`, atomic `runTransaction` request upvotes, and auto-polling in `TelegramConnectCard`.
- **2026-11-23 (Commit Identity Rule):** Locked commit author identity to repo owner (`mangabd <mangabd99@gmail.com>`) to prevent Vercel Hobby + private repo deployment blocks triggered by mismatched commit authors.
- **2026-11-23 (Round 6 — Seamless Reader & Speed):** Removed inter-page bars/borders/gaps in `/read/[slug]/[chapter]` (`flex-col gap-0`, `line-height: 0`, `block w-full h-auto`), switched pages 1–2 to `loading="eager"` with 3-page lookahead preload, and added `s-maxage=31536000` edge caching + `ETag`/`Last-Modified` pass-through in `/api/image/[fileId]`.

### Changelog
- **2026-11-17:** Implemented Telegram CDN upload, streaming image proxy, account linking (token + webhook), targeted broadcast APIs, and UI integrations (`TelegramConnectCard`, `ChapterManager`, `MangaReaderModal`).
- **2026-11-18:** Completed full Round 1 Audit Report (A1–A9) and Business Firebase Migration Guide (B1–B11).
- **2026-11-19:** Created `PROJECT_CONTEXT.md`, verified `.gitignore`, pushed baseline commit to `mangabd/mangabd`, and completed Round 2 security + upload + branding fixes.
- **2026-11-19 (Round 2.5):** Google OAuth only (removed email/password auth), `DELETE /api/admin/session` on signOut, 24h session cookie expiry, clean `config.ts` defaults, removed unused `next-auth`/`uuid`/`z-ai-web-dev-sdk`, added `NEXT_PUBLIC_ENABLE_ADULT_MODE` to `.env.example`, updated `PROJECT_CONTEXT.md`.
- **2026-11-19 (Round 3):** Hardened `firestore.rules` (`requests` 1-UID-1-vote + symmetric unvote, `isValidBookmark` optional `titleBn`, `users` create blocks `telegramUsername`/`telegramBlocked`), enforced non-null Bearer token in admin client callers, added internal reader `readLink` fallback in `ChapterManager`.
- **2026-11-19 (Round 3.5):** Fixed `addChapter`/`addBookmark`/`addRequest` to use `serverTimestamp()` and clean types (removed `chapters[0].createdAt` copy, `undefined as unknown as never` hacks, and `bookmarkedAt: null as any`), documented 500-vote cap in `PROJECT_CONTEXT.md`.
- **2026-11-20:** Updated `firebase-applet-config.json` for `mangabd-prod` (`(default)` DB), added `firebase.json`, and deployed `firestore.rules` + `firestore.indexes.json` to `mangabd-prod`.
- **2026-11-22:** Configured `mirror` remote (`iskultri-scans/mangabd`) and documented the dual-push auto-deploy workflow in `PROJECT_CONTEXT.md`.
- **2026-11-23 (Round 4):** Added `/read/[slug]/[chapter]` vertical-scroll reader (sticky chapter nav, lazy-load + next-2-page preload, page numbers, retry on error, external fallback), updated `ChapterList` + `MangaDetail` Read buttons to route hosted chapters to `/read/{slug}/{chapter}`, and updated `ChapterManager` `effectiveReadLink` fallback to `/read/{slug}/{chapter}`.
- **2026-11-23 (Round 5):**
  - `B1`: Refactored `/admin/chapters` to reuse `<ChapterManager />` (Telegram CDN multi-page upload, compression, retry, resume, `/api/telegram/broadcast`, optional external link, quick series picks + `?q=` redirect to Add Manga) and fixed `4MB` error message in `/api/telegram/upload`.
  - `B2`: Upgraded `/api/manga/search`, `/api/manga/detail`, `src/lib/jikan.ts`, `MangaForm.tsx`, and `/admin/manga/add` with `Jikan (MAL) → AniList → MangaDex` cascade, open-by-default search on Add Manga, debounced title auto-fill, and manual fallback.
  - `B3`: Rewrote `README.md` for MangaBD (Adult Mode OFF, Google-only, Telegram CDN, internal reader), cleaned `scripts/*.js` branding, fixed `admin/layout.tsx` signOut to clear `mangabd-session`, aligned `src/app/page.tsx` cookies (`mangabd-*` + `adultModeEnabled`), and hid disabled adult toggle in `MobileMenu.tsx`.
  - `B4`: Added WebP→JPEG(+scale) fallback in `ChapterManager`, `429` `retry_after` + `AbortSignal.timeout` in `src/lib/telegram.ts`, atomic `runTransaction` in `upvoteRequest` (`src/lib/firestore.ts`), and background auto-poll + focus/visibility refresh in `TelegramConnectCard.tsx`.
- **2026-11-23 (Commit Identity Fix):** Documented mandatory git commit identity (`mangabd <mangabd99@gmail.com>`) in `PROJECT_CONTEXT.md` rules and changelog.
- **2026-11-23 (Round 6):** Seamless vertical reader (`gap-0`, `leading-[0]`, `block w-full h-auto`, no per-page borders/captions), eager first-2-page loading + 3-page preload, and `s-maxage=31536000` + `ETag`/`Last-Modified` pass-through in `/api/image/[fileId]` and `src/lib/telegram.ts`.
