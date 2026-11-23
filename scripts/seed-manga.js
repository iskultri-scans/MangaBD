/**
 * MangaBD - Demo Data Seed Script
 *
 * Run this script to populate Firestore with sample manga data.
 * Usage: node scripts/seed-manga.js
 *
 * Prerequisites:
 * - Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local
 * - Or pass them as environment variables
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    return;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();

    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile();

// Initialize Firebase Admin
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Missing Firebase Admin credentials. Set environment variables first.');
  console.error('   See .env.local for required variables.');
  process.exit(1);
}

// Handle private key formatting
if (privateKey.includes('\\n')) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}
// Remove surrounding quotes if present
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}

const { getFirestore } = require('firebase-admin/firestore');
const appletConfig = require('../firebase-applet-config.json');

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = appletConfig.firestoreDatabaseId
  ? getFirestore(admin.app(), appletConfig.firestoreDatabaseId)
  : admin.firestore();

// ─── Demo Genres ─────────────────────────────────────────
const demoGenres = [
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
  { name: 'Isekai', slug: 'isekai', mangaCount: 0 },
  { name: 'Martial Arts', slug: 'martial-arts', mangaCount: 0 },
  { name: 'Shounen', slug: 'shounen', mangaCount: 0 },
  { name: 'Seinen', slug: 'seinen', mangaCount: 0 },
  { name: 'Shoujo', slug: 'shoujo', mangaCount: 0 },
];

// ─── Demo Manga ──────────────────────────────────────────
const demoManga = [
  {
    title: 'Solo Leveling',
    titleBn: 'সলো লেভেলিং',
    slug: 'solo-leveling',
    description: 'In a world where hunters — humans who possess magic abilities — must battle deadly monsters to protect mankind from total annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.\n\nOne day, after a particularly devastating dungeon raid that nearly costs him his life, a mysterious System appears and grants him the power to level up infinitely. Now the weakest hunter must rise from the ashes and become the most powerful hunter humanity has ever seen.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/222295l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/222295l.jpg',
    genres: ['Action', 'Adventure', 'Fantasy', 'Isekai'],
    author: 'Chugong',
    artist: 'Dubu (Redice Studio)',
    status: 'completed',
    rating: 9.2,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/32477-updated-solo-leveling',
    featured: true,
    trending: true,
  },
  {
    title: 'One Piece',
    titleBn: 'ওয়ান পিস',
    slug: 'one-piece',
    description: 'Gol D. Roger, a man referred to as the "Pirate King," is set to be executed by the World Government. But just before his demise, he confirms the existence of a great treasure, One Piece, located somewhere within the vast ocean known as the Grand Line.\n\nAnnouncing that One Piece can be claimed by anyone brave enough to reach it, the Pirate King has ushered in the Great Age of Pirates. Monkey D. Luffy, a boy who consumed a Devil Fruit and gained the power of rubber, sets off on a journey to find the legendary treasure and become the next Pirate King.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/2/253146l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/2/253146l.jpg',
    genres: ['Action', 'Adventure', 'Comedy', 'Fantasy', 'Shounen'],
    author: 'Oda Eiichiro',
    artist: 'Oda Eiichiro',
    status: 'ongoing',
    rating: 9.5,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/31477-one-piece',
    featured: true,
    trending: true,
  },
  {
    title: 'Jujutsu Kaisen',
    titleBn: 'জুজুৎসু কাইসেন',
    slug: 'jujutsu-kaisen',
    description: 'Yuji Itadori is an unnaturally fit high school student living in Sendai. On the day his grandfather dies, he meets Megumi Fushiguro, a Jujutsu Sorcerer, and soon finds himself entangled in a world of curses — supernatural beings formed from negative emotions.\n\nAfter swallowing one of Sukuna\'s fingers to protect his friends, Yuji becomes the vessel for the King of Curses. Now enrolled at Tokyo Jujutsu High, he must learn to control his newfound powers while facing increasingly dangerous curses.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/210341l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/210341l.jpg',
    genres: ['Action', 'Fantasy', 'Supernatural', 'Horror', 'Shounen'],
    author: 'Akutami Gege',
    artist: 'Akutami Gege',
    status: 'completed',
    rating: 8.8,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/51377-jujutsu-kaisen',
    featured: true,
    trending: true,
  },
  {
    title: 'Chainsaw Man',
    titleBn: 'চেইনস ম্যান',
    slug: 'chainsaw-man',
    description: 'Denji is a teenage boy living with a Chainsaw Devil named Pochita. Due to debts his father left behind, he has been living a rock-bottom life while repaying his debt by harvesting devil corpses with Pochita.\n\nOne day, Denji is betrayed and killed. As his consciousness fades, he makes a contract with Pochita and gets revived as "Chainsaw Man" — a man with a devil\'s heart. Now able to transform parts of his body into chainsaws, Denji joins the Public Safety Bureau of Devil Hunters.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/202461l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/202461l.jpg',
    genres: ['Action', 'Fantasy', 'Horror', 'Supernatural', 'Seinen'],
    author: 'Fujimoto Tatsuki',
    artist: 'Fujimoto Tatsuki',
    status: 'ongoing',
    rating: 8.9,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/31777-chainsaw-man',
    featured: false,
    trending: true,
  },
  {
    title: 'Spy x Family',
    titleBn: 'স্পাই এক্স ফ্যামিলি',
    slug: 'spy-x-family',
    description: 'Master spy Twilight is the best at what he does when it comes to going undercover on dangerous missions for the betterment of the world. But when he receives the ultimate assignment — to get married and have a kid — he may finally be in over his head!\n\nNot one to depend on others, Twilight has his work cut out for him procuring both a wife and a child for his mission to infiltrate an elite private school. What he doesn\'t know is that the wife he\'s chosen is an assassin and the child he\'s adopted is a telepath!',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/232794l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/232794l.jpg',
    genres: ['Action', 'Comedy', 'Slice of Life', 'Shounen'],
    author: 'Endou Tatsuya',
    artist: 'Endou Tatsuya',
    status: 'ongoing',
    rating: 8.7,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/34777-spy-x-family',
    featured: true,
    trending: false,
  },
  {
    title: 'Demon Slayer',
    titleBn: 'ডেমন স্লেয়ার',
    slug: 'demon-slayer',
    description: 'Ever since the death of his father, young Tanjirou takes it upon himself to support his family. Although their lives are hardened by tragedy, they\'ve found happiness in their modest existence. That is, until one fateful day when Tanjirou returns home to find his entire family slaughtered by demons.\n\nOnly his sister Nezuko has survived — but she has been transformed into a demon herself! Determined to turn his sister back into a human, Tanjirou sets out on a dangerous journey to find a cure and become a Demon Slayer.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/179023l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/179023l.jpg',
    genres: ['Action', 'Adventure', 'Fantasy', 'Supernatural', 'Shounen'],
    author: 'Gotouge Koyoharu',
    artist: 'Gotouge Koyoharu',
    status: 'completed',
    rating: 8.6,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://mangadex.org/title/81377-kimetsu-no-yaiba',
    featured: false,
    trending: true,
  },
  {
    title: 'Tower of God',
    titleBn: 'টাওয়ার অফ গড',
    slug: 'tower-of-god',
    description: 'What do you desire? Money and wealth? Honor and pride? Authority and power? Revenge? Or something that transcends them all? Whatever you desire — it\'s here.\n\nThe Tower of God centers around a boy named Twenty-Fifth Bam, who has spent most of his life trapped beneath a vast and mysterious Tower. When his only friend Rachel disappears into the Tower, Bam follows her, entering a world of danger, tests, and powerful beings known as Rankers.',
    coverImage: 'https://cdn.myanimelist.net/images/manga/3/209298l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/3/209298l.jpg',
    genres: ['Action', 'Adventure', 'Fantasy', 'Mystery', 'Drama'],
    author: 'SIU',
    artist: 'SIU',
    status: 'hiatus',
    rating: 8.4,
    totalChapters: 0,
    language: 'en',
    readLink: 'https://www.webtoons.com/en/fantasy/tower-of-god/list?title_no=95',
    featured: false,
    trending: false,
  },
  {
    title: 'Bengali Folk Tales',
    titleBn: 'বাংলার লোককাহিনী',
    slug: 'bengali-folk-tales',
    description: 'একটি অসাধারণ সংকলন যেখানে বাংলাদেশ ও পশ্চিমবঙ্গের প্রাচীন লোককাহিনীগুলো মাঙ্গা শিল্পে পুনরায় জীবন্ত করা হয়েছে। রাজা-রানী, রাক্ষস-বাঘ, জাদুকর ও সাধারণ মানুষের গল্প এই মাঙ্গায় নতুন রূপ পেয়েছে।\n\nপ্রতিটি অধ্যায়ে একটি নতুন লোককাহিনী আছে, যা শিশুদের জন্যও উপযোগী এবং প্রাপ্তবয়স্কদের জন্যও আনন্দদায়ক।',
    coverImage: 'https://cdn.myanimelist.net/images/manga/1/245777l.jpg',
    bannerImage: 'https://cdn.myanimelist.net/images/manga/1/245777l.jpg',
    genres: ['Fantasy', 'Adventure', 'Drama', 'Supernatural'],
    author: 'MangaBD Team',
    artist: 'MangaBD Team',
    status: 'ongoing',
    rating: 7.8,
    totalChapters: 0,
    language: 'bn',
    readLink: 'https://t.me/mangabd_official',
    featured: true,
    trending: false,
  },
];

// ─── Demo Chapters ───────────────────────────────────────
const demoChapters = {
  'solo-leveling': [
    { title: 'Chapter 1 — I\'m Used to It', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/1' },
    { title: 'Chapter 2 — If I Had One More Chance', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/2' },
    { title: 'Chapter 3 — This Is a Hunt', chapterNumber: 3, readLink: 'https://mangadex.org/chapter/3' },
    { title: 'Chapter 4 — It\'s Like a Game', chapterNumber: 4, readLink: 'https://mangadex.org/chapter/4' },
    { title: 'Chapter 5 — A Job That\'s Not a Job', chapterNumber: 5, readLink: 'https://mangadex.org/chapter/5' },
    { title: 'Chapter 6 — The Real Hunt Begins', chapterNumber: 6, readLink: 'https://mangadex.org/chapter/6' },
    { title: 'Chapter 7 — What to Do With a S-Rank Gate', chapterNumber: 7, readLink: 'https://mangadex.org/chapter/7' },
    { title: 'Chapter 8 — The Jeju Island Raid', chapterNumber: 8, readLink: 'https://mangadex.org/chapter/8' },
  ],
  'one-piece': [
    { title: 'Chapter 1 — Romance Dawn', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/101' },
    { title: 'Chapter 2 — Introducing Nami', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/102' },
    { title: 'Chapter 3 — The Pirate Hunter', chapterNumber: 3, readLink: 'https://mangadex.org/chapter/103' },
    { title: 'Chapter 4 — The Grand Line', chapterNumber: 4, readLink: 'https://mangadex.org/chapter/104' },
    { title: 'Chapter 5 — A New Crew Member', chapterNumber: 5, readLink: 'https://mangadex.org/chapter/105' },
  ],
  'jujutsu-kaisen': [
    { title: 'Chapter 1 — Ryomen Sukuna', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/201' },
    { title: 'Chapter 2 — For Myself', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/202' },
    { title: 'Chapter 3 — Jujutsu High', chapterNumber: 3, readLink: 'https://mangadex.org/chapter/203' },
    { title: 'Chapter 4 — Curse Womb Must Die', chapterNumber: 4, readLink: 'https://mangadex.org/chapter/204' },
  ],
  'chainsaw-man': [
    { title: 'Chapter 1 — Dog & Chainsaw', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/301' },
    { title: 'Chapter 2 — Arriving in Tokyo', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/302' },
    { title: 'Chapter 3 — Meowy\'s Whereabouts', chapterNumber: 3, readLink: 'https://mangadex.org/chapter/303' },
  ],
  'spy-x-family': [
    { title: 'Chapter 1 — Mission 1', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/401' },
    { title: 'Chapter 2 — Secure a Wife', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/402' },
  ],
  'demon-slayer': [
    { title: 'Chapter 1 — Cruelty', chapterNumber: 1, readLink: 'https://mangadex.org/chapter/501' },
    { title: 'Chapter 2 — Someone Unknown', chapterNumber: 2, readLink: 'https://mangadex.org/chapter/502' },
    { title: 'Chapter 3 — Don\'t Cry', chapterNumber: 3, readLink: 'https://mangadex.org/chapter/503' },
  ],
  'bengali-folk-tales': [
    { title: 'পর্ব ১ — লালকামিনী', chapterNumber: 1, readLink: 'https://t.me/mangabd_official/1' },
    { title: 'পর্ব ২ — বুড়ো বাঘ', chapterNumber: 2, readLink: 'https://t.me/mangabd_official/2' },
    { title: 'পর্ব ৩ — জাদুকরের ছাতা', chapterNumber: 3, readLink: 'https://t.me/mangabd_official/3' },
  ],
};

async function seed() {
  console.log('🌱 Seeding MangaBD demo data...\n');

  // ─── Seed Genres ───────────────────────────────────
  console.log('📝 Adding genres...');
  const genreBatch = db.batch();
  const genreRefs = [];

  for (const genre of demoGenres) {
    const ref = db.collection('genres').doc(genre.slug);
    genreRefs.push({ ref, name: genre.name });
    genreBatch.set(ref, {
      ...genre,
      mangaCount: 0,
    });
  }

  await genreBatch.commit();
  console.log(`   ✅ Added ${demoGenres.length} genres\n`);

  // ─── Seed Manga ────────────────────────────────────
  console.log('📚 Adding manga...');
  const mangaIds = {};

  for (const manga of demoManga) {
    const docRef = db.collection('manga').doc();
    mangaIds[manga.slug] = docRef.id;

    await docRef.set({
      ...manga,
      totalChapters: demoChapters[manga.slug]?.length || 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`   ✅ Added: ${manga.title} (${manga.language})`);
  }

  // ─── Seed Chapters ─────────────────────────────────
  console.log('\n📖 Adding chapters...');
  for (const [slug, chapters] of Object.entries(demoChapters)) {
    const mangaId = mangaIds[slug];
    if (!mangaId) continue;

    for (const chapter of chapters) {
      const chapterRef = db.collection('manga').doc(mangaId).collection('chapters').doc();
      await chapterRef.set({
        ...chapter,
        mangaId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    console.log(`   ✅ Added ${chapters.length} chapters for ${slug}`);
  }

  // ─── Update genre manga counts ─────────────────────
  console.log('\n🔢 Updating genre manga counts...');
  const genreCountMap = {};
  for (const manga of demoManga) {
    for (const genreName of manga.genres) {
      genreCountMap[genreName] = (genreCountMap[genreName] || 0) + 1;
    }
  }

  for (const [name, count] of Object.entries(genreCountMap)) {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const genreRef = db.collection('genres').doc(slug);
    await genreRef.update({ mangaCount: count });
    console.log(`   ✅ ${name}: ${count} manga`);
  }

  console.log('\n🎉 Seed complete! Your MangaBD site now has demo data.');
  console.log('   Visit your site to see the manga listings.\n');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
