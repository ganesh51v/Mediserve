import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBOAXJL1HfAhMjjdhADbL8kt-PE5V0dlGY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'mediserve-c7043.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'mediserve-c7043',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'mediserve-c7043.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '744877458190',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:744877458190:web:84c428b4497cc4f9e1cd5f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-Z8BN3DWC7N',
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Safe Analytics initialization (only in supported browser environments)
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;
