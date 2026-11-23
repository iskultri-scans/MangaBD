/**
 * MangaBD — Demo Data Seeder
 *
 * This script populates your Firestore with sample manga, genres, and chapters
 * so you can preview the website immediately.
 *
 * Usage:
 *   1. Make sure your .env.local has valid Firebase credentials
 *   2. Run: node scripts/seed.js
 *
 * It uses the Firebase Admin SDK to write directly to Firestore.
 */

const admin = require('firebase-admin');

// ─── Load env variables from .env.local ─────────────────────
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

// ─── Initialize Firebase Admin ──────────────────────────────
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
};

const { getFirestore } = require('firebase-admin/firestore');
const appletConfig = require('../firebase-applet-config.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = appletConfig.firestoreDatabaseId
  ? getFirestore(admin.app(), appletConfig.firestoreDatabaseId)
  : admin.firestore();

// ─── Genre Data ─────────────────────────────────────────────
const genres = [
  { name: 'Action', slug: 'action', mangaCount: 0 },
  { name: 'Adventure', slug: 'adventure', mangaCount: 0 },
  { name: 'Comedy', slug: 'comedy', mangaCount: 0 },
  { name: 'Drama', slug: 'drama', mangaCount: 0 },
  { name: 'Fantasy', slug: 'fantasy', mangaCount: 0 },
  { name: 'Horror', slug: 'horror', mangaCount: 0 },
  { name: 'Mystery', slug: 'mystery', mangaCount: 0 },
  { name: 'Romance', slug: 'romance', mangaCount: 0 },
  { name: 'Sci-Fi', slug: 'sci-fi', mangaCount: 0 },
  { name: 'Slice of Life', slug: 'slice-of-life', mangaCount: 0 },
  { name: 'Sports', slug: 'sports', mangaCount: 0 },
  { name: 'Supernatural', slug: 'supernatural', mangaCount: 0 },
  { name: 'Thriller', slug: 'thriller', mangaCount: 0 },
  { name: 'Psychological', slug: 'psychological', mangaCount: 0 },
  { name: 'Isekai', slug: 'isekai', mangaCount: 0 },
  { name: 'Shounen', slug: 'shounen', mangaCount: 0 },
  { name: 'Seinen', slug: 'seinen', mangaCount: 0 },
  { name: 'Shoujo', slug: 'shoujo', mangaCount: 0 },
];

// ─── Manga Data ─────────────────────────────────────────────
const mangaList = [
  {
    title: 'One Piece',
    titleBn: 'ওয়ান পিস',
    slug: 'one-piece',
    description: 'Monkey D. Luffy sets off on an adventure to find the fabled treasure One Piece and become the King of the Pirates. Along the way, he gathers a diverse crew of pirates, each with their own dreams and ambitions. Facing powerful enemies, ancient mysteries, and the freedom of the open sea, Luffy\'s journey is one of the greatest adventures ever told in manga history.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/258245l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/258245l.jpg',
    genres: ['Action', 'Adventure', 'Comedy', 'Shounen'],
    author: 'Eiichiro Oda',
    artist: 'Eiichiro Oda',
    status: 'ongoing',
    rating: 9.2,
    totalChapters: 12,
    language: 'en',
    readLink: 'https://mangareader.to/one-piece-3',
    featured: true,
    trending: true,
  },
  {
    title: 'Attack on Titan',
    titleBn: 'অ্যাটাক অন টাইটান',
    slug: 'attack-on-titan',
    description: 'In a world where humanity lives inside cities surrounded by enormous walls due to the Titans—gigantic humanoid creatures—a young boy named Eren Yeager vows to eliminate every last Titan after his mother is devoured during a devastating attack. The story unfolds into a complex tale of war, politics, and the dark truths hidden within the walls of civilization.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/2/37846l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/2/37846l.jpg',
    genres: ['Action', 'Drama', 'Fantasy', 'Horror', 'Psychological'],
    author: 'Hajime Isayama',
    artist: 'Hajime Isayama',
    status: 'completed',
    rating: 9.0,
    totalChapters: 8,
    language: 'en',
    readLink: 'https://mangareader.to/attack-on-titan-31',
    featured: true,
    trending: true,
  },
  {
    title: 'Jujutsu Kaisen',
    titleBn: 'জুজুতসু কাইসেন',
    slug: 'jujutsu-kaisen',
    description: 'Yuji Itadori, a high school student with remarkable physical abilities, joins a secret organization of Jujutsu Sorcerers to kill a powerful Curse named Ryomen Sukuna after becoming his host. The series explores dark themes of death, purpose, and the moral complexities of protecting the innocent in a world plagued by cursed spirits born from negative human emotions.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/210341l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/210341l.jpg',
    genres: ['Action', 'Supernatural', 'Horror', 'Shounen'],
    author: 'Gege Akutami',
    artist: 'Gege Akutami',
    status: 'completed',
    rating: 8.8,
    totalChapters: 6,
    language: 'en',
    readLink: 'https://mangareader.to/jujutsu-kaisen-2',
    featured: true,
    trending: true,
  },
  {
    title: 'Solo Leveling',
    titleBn: 'সোলো লেভেলিং',
    slug: 'solo-leveling',
    description: 'In a world where hunters—humans who possess magic abilities—must battle deadly monsters to protect mankind, Sung Jin-Woo, the weakest hunter of all mankind, finds himself in a mysterious dungeon that gives him the power to level up infinitely. He rises from being the weakest to the strongest hunter, uncovering the truth behind the dungeons and the monstrous threats they harbor.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/222295l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/222295l.jpg',
    genres: ['Action', 'Adventure', 'Fantasy', 'Isekai'],
    author: 'Chugong',
    artist: 'Dubu (Redice Studio)',
    status: 'completed',
    rating: 8.9,
    totalChapters: 5,
    language: 'en',
    readLink: 'https://mangareader.to/solo-leveling-2',
    featured: true,
    trending: true,
  },
  {
    title: 'Spy x Family',
    titleBn: 'স্পাই এক্স ফ্যামিলি',
    slug: 'spy-x-family',
    description: 'A spy known as "Twilight" must build a fake family to execute a mission, not realizing that the girl he adopts is a telepath and his wife is an assassin. This heartwarming comedy-action series follows the Forger family as they navigate their secret lives while trying to maintain the facade of a normal family, creating genuinely touching moments amidst the espionage.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/232794l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/232794l.jpg',
    genres: ['Action', 'Comedy', 'Slice of Life', 'Shounen'],
    author: 'Tatsuya Endo',
    artist: 'Tatsuya Endo',
    status: 'ongoing',
    rating: 8.7,
    totalChapters: 4,
    language: 'en',
    readLink: 'https://mangareader.to/spy-x-family-2',
    featured: false,
    trending: true,
  },
  {
    title: 'Chainsaw Man',
    titleBn: 'চেইনস ম্যান',
    slug: 'chainsaw-man',
    description: 'Denji, a young man burdened with poverty and debt, merges with his pet devil Pochita to become Chainsaw Man—a human with the ability to transform parts of his body into chainsaws. Recruited by the Public Safety Division, Denji hunts devils while searching for a normal life with good food and shelter, but the truth about Chainsaw Man\'s power draws dangerous attention.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/216464l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/216464l.jpg',
    genres: ['Action', 'Horror', 'Supernatural', 'Seinen'],
    author: 'Tatsuki Fujimoto',
    artist: 'Tatsuki Fujimoto',
    status: 'ongoing',
    rating: 8.8,
    totalChapters: 3,
    language: 'en',
    readLink: 'https://mangareader.to/chainsaw-man-2',
    featured: false,
    trending: true,
  },
  {
    title: 'My Hero Academia',
    titleBn: 'মাই হিরো একাডেমিয়া',
    slug: 'my-hero-academia',
    description: 'In a world where most people have superpowers called "Quirks," Izuku Midoriya is born without one. Despite this, he dreams of becoming a hero. After inheriting a power from the greatest hero All Might, Midoriya enrolls in a prestigious hero academy and begins his journey to become the world\'s greatest hero while facing villains who threaten the very foundation of hero society.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/209370l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/209370l.jpg',
    genres: ['Action', 'Adventure', 'Comedy', 'Shounen'],
    author: 'Kohei Horikoshi',
    artist: 'Kohei Horikoshi',
    status: 'completed',
    rating: 8.5,
    totalChapters: 4,
    language: 'en',
    readLink: 'https://mangareader.to/my-hero-academia-2',
    featured: false,
    trending: false,
  },
  {
    title: 'Demon Slayer',
    titleBn: 'ডেমন স্লেয়ার',
    slug: 'demon-slayer',
    description: 'Tanjiro Kamado becomes a demon slayer after his family is slaughtered by demons and his sister Nezuko is turned into one. With his sister by his side, Tanjiro fights to find a cure for Nezuko while battling the demons that plague humanity. His journey takes him through breathtaking battles and emotional encounters as he seeks to avenge his family and restore his sister\'s humanity.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/179023l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/179023l.jpg',
    genres: ['Action', 'Adventure', 'Fantasy', 'Supernatural'],
    author: 'Koyoharu Gotouge',
    artist: 'Koyoharu Gotouge',
    status: 'completed',
    rating: 8.6,
    totalChapters: 3,
    language: 'en',
    readLink: 'https://mangareader.to/demon-slayer-kimetsu-no-yaiba-2',
    featured: false,
    trending: false,
  },
  {
    title: 'বাংলায় মাঙ্গা সিরিজ ১',
    slug: 'bangla-manga-series-1',
    description: 'একটি রোমাঞ্চকর বাংলা মাঙ্গা সিরিজ যেখানে একজন তরুণ বীর তার গ্রামকে রক্ষা করার জন্য লড়াই করে। প্রাচীন শক্তি আর আধুনিক সাহসের মিশ্রণে তৈরি এই গল্প পাঠকদের মুগ্ধ করবে। অশুভ শক্তির বিরুদ্ধে লড়াইয়ে সে আবিষ্কার করে তার ভেতরে লুকিয়ে থাকা অসীম শক্তি।',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/279616l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/279616l.jpg',
    genres: ['Action', 'Fantasy', 'Adventure'],
    author: 'বাংলা লেখক',
    artist: 'বাংলা শিল্পী',
    status: 'ongoing',
    rating: 7.8,
    totalChapters: 3,
    language: 'bn',
    readLink: 'https://example.com/bangla-manga-1',
    featured: false,
    trending: true,
  },
  {
    title: 'বাংলায় মাঙ্গা সিরিজ ২',
    slug: 'bangla-manga-series-2',
    description: 'একটি হাস্যরসাত্মক ও আবেগময় বাংলা মাঙ্গা যেখানে স্কুল জীবনের বিভিন্ন মজার ও কান্নার গল্প বলা হয়েছে। বন্ধুত্ব, প্রথম ভালোবাসা, এবং বড় হওয়ার চ্যালেঞ্জগুলো নিয়ে এই মাঙ্গা পাঠকদের নস্টালজিয়ায় ভাসাবে।',
    coverImage: 'https://cdn.myanimelist.net/images/manga/2/263579l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/2/263579l.jpg',
    genres: ['Comedy', 'Romance', 'Slice of Life', 'Shoujo'],
    author: 'বাংলা লেখিকা',
    artist: 'বাংলা শিল্পী',
    status: 'ongoing',
    rating: 7.5,
    totalChapters: 2,
    language: 'bn',
    readLink: 'https://example.com/bangla-manga-2',
    featured: false,
    trending: false,
  },
];

// ─── Chapter Generation ─────────────────────────────────────
function generateChapters(mangaSlug, totalChapters) {
  const chapters = [];
  for (let i = 1; i <= totalChapters; i++) {
    chapters.push({
      title: `Chapter ${i}`,
      chapterNumber: i,
      readLink: `https://mangareader.to/${mangaSlug}/${i}`,
    });
  }
  return chapters;
}

// ─── Seed Function ──────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting database seeding...\n');

  // 1. Seed Genres
  console.log('📁 Seeding genres...');
  const genreBatch = db.batch();

  for (const genre of genres) {
    const ref = db.collection('genres').doc();
    genreBatch.set(ref, {
      ...genre,
      mangaCount: 0,
    });
  }

  await genreBatch.commit();
  console.log(`  ✅ Added ${genres.length} genres\n`);

  // 2. Seed Manga + Chapters
  console.log('📚 Seeding manga...');
  let mangaCount = 0;
  let chapterCount = 0;

  for (const manga of mangaList) {
    const mangaRef = db.collection('manga').doc();
    const chapters = generateChapters(manga.slug, manga.totalChapters);

    await mangaRef.set({
      ...manga,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });

    // Seed chapters as subcollection
    for (const chapter of chapters) {
      const chapterRef = mangaRef.collection('chapters').doc();
      await chapterRef.set({
        ...chapter,
        mangaId: mangaRef.id,
        createdAt: admin.firestore.Timestamp.now(),
      });
      chapterCount++;
    }

    mangaCount++;
    console.log(`  ✅ "${manga.title}" — ${chapters.length} chapters`);
  }

  console.log(`\n  📊 Total: ${mangaCount} manga, ${chapterCount} chapters\n`);

  // 3. Update genre mangaCount
  console.log('🔢 Updating genre counts...');
  const allMangaSnap = await db.collection('manga').get();
  const genreCountMap = {};

  allMangaSnap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.genres && Array.isArray(data.genres)) {
      data.genres.forEach((g) => {
        genreCountMap[g] = (genreCountMap[g] || 0) + 1;
      });
    }
  });

  const genreSnap = await db.collection('genres').get();
  const updateBatch = db.batch();
  genreSnap.docs.forEach((doc) => {
    const name = doc.data().name;
    if (genreCountMap[name] !== undefined) {
      updateBatch.update(doc.ref, { mangaCount: genreCountMap[name] });
    }
  });
  await updateBatch.commit();

  console.log('  ✅ Genre counts updated\n');
  console.log('🎉 Seeding complete! Your website is ready to preview.');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
