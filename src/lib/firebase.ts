// Firebase Client SDK - Browser & Server-side initialization
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || appletConfig.appId,
  ...(appletConfig.measurementId || process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    ? { measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || appletConfig.measurementId }
    : {}),
};

const firestoreDatabaseId = appletConfig.firestoreDatabaseId || undefined;

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Lazy auth and Firestore - avoid SSR initialization errors
let _auth: ReturnType<typeof getAuth> | null = null;
let _db: ReturnType<typeof getFirestore> | null = null;
let _connectionTested = false;

export function getFirebaseAuth() {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
}

export function getFirebaseDb() {
  if (!_db) {
    _db = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    if (typeof window !== 'undefined' && !_connectionTested) {
      _connectionTested = true;
      testFirestoreConnection(_db);
    }
  }
  return _db;
}

async function testFirestoreConnection(db: ReturnType<typeof getFirestore>) {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Firestore client is currently offline; will retry automatically.');
    }
  }
}

export { firebaseConfig };
export default app;
