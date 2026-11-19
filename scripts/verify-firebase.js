/**
 * ISKULTRIP SCANS - Firebase Setup Verification Script
 *
 * Run this script to verify that Firebase is properly configured.
 * Usage: node scripts/verify-firebase.js
 */

const admin = require('firebase-admin');

// Load environment variables from .env.local
const fs = require('fs');
const path = require('path');

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

async function verify() {
  console.log('🔍 ISKULTRIP SCANS — Firebase Setup Verification\n');
  console.log('━'.repeat(50));

  // ─── Check Environment Variables ─────────────────
  console.log('\n📋 Checking environment variables...\n');

  const requiredVars = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', label: 'Firebase API Key' },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', label: 'Auth Domain' },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', label: 'Project ID' },
    { key: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', label: 'Storage Bucket' },
    { key: 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', label: 'Messaging Sender ID' },
    { key: 'NEXT_PUBLIC_FIREBASE_APP_ID', label: 'App ID' },
    { key: 'FIREBASE_ADMIN_PROJECT_ID', label: 'Admin Project ID' },
    { key: 'FIREBASE_ADMIN_CLIENT_EMAIL', label: 'Admin Client Email' },
    { key: 'FIREBASE_ADMIN_PRIVATE_KEY', label: 'Admin Private Key' },
    { key: 'NEXT_PUBLIC_ADMIN_EMAIL', label: 'Admin Email' },
    { key: 'NEXT_PUBLIC_SITE_URL', label: 'Site URL' },
    { key: 'NEXT_PUBLIC_FACEBOOK_URL', label: 'Facebook URL' },
    { key: 'NEXT_PUBLIC_TELEGRAM_URL', label: 'Telegram URL' },
  ];

  let allPresent = true;
  for (const { key, label } of requiredVars) {
    const value = process.env[key];
    if (value) {
      // Show partial value for security
      const masked = key.includes('KEY')
        ? value.substring(0, 30) + '...'
        : key.includes('PRIVATE')
          ? '*** (present, length: ' + value.length + ')'
          : value;
      console.log(`   ✅ ${label}: ${masked}`);
    } else {
      console.log(`   ❌ ${label}: NOT SET`);
      allPresent = false;
    }
  }

  if (!allPresent) {
    console.log('\n⚠️  Some environment variables are missing. Check .env.local');
  }

  // ─── Test Firebase Admin SDK ─────────────────────
  console.log('\n' + '━'.repeat(50));
  console.log('\n🔐 Testing Firebase Admin SDK...\n');

  try {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.log('   ❌ Missing Admin SDK credentials');
    } else {
      // Handle private key formatting
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      console.log('   ✅ Firebase Admin SDK initialized successfully');

      // Test Firestore access
      const db = admin.firestore();
      const mangaSnapshot = await db.collection('manga').limit(1).get();
      console.log(`   ✅ Firestore accessible (found ${mangaSnapshot.size} manga documents)`);

      // Test Auth access
      try {
        const userList = await admin.auth().listUsers(1);
        console.log(`   ✅ Firebase Auth accessible (${userList.users.length} users found)`);
      } catch (authErr) {
        console.log('   ⚠️  Firebase Auth: ' + authErr.message);
        console.log('      Make sure Email/Password and Google sign-in are enabled in Firebase Console');
      }
    }
  } catch (error) {
    console.log('   ❌ Firebase Admin SDK error:', error.message);
  }

  // ─── Summary ─────────────────────────────────────
  console.log('\n' + '━'.repeat(50));
  console.log('\n📊 Summary:\n');

  console.log('   🌐 Site URL: ' + (process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET'));
  console.log('   📧 Admin Email: ' + (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'NOT SET'));
  console.log('   📘 Facebook: ' + (process.env.NEXT_PUBLIC_FACEBOOK_URL || 'NOT SET'));
  console.log('   ✈️  Telegram: ' + (process.env.NEXT_PUBLIC_TELEGRAM_URL || 'NOT SET'));
  console.log('   🔥 Project: ' + (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'NOT SET'));

  console.log('\n💡 Next Steps:');
  console.log('   1. Enable Email/Password & Google Auth in Firebase Console');
  console.log('   2. Create admin user: ' + (process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bongmanga.official@gmail.com'));
  console.log('   3. Run seed script: node scripts/seed-manga.js');
  console.log('   4. Deploy to Vercel: vercel --prod\n');

  process.exit(0);
}

verify().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
