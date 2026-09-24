import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'doctor' | 'caretaker' | 'patient' | 'admin';
  phone?: string;
  specialization?: string;
  createdAt: string;
}

export const firebaseAuthService = {
  /**
   * Register a new user with Firebase Authentication and create user document in Firestore
   */
  async register(
    email: string,
    pass: string,
    displayName: string,
    role: 'doctor' | 'caretaker' | 'patient' | 'admin',
    extra?: { phone?: string; specialization?: string }
  ): Promise<FirebaseUserProfile> {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName });

    const profile: FirebaseUserProfile = {
      uid: cred.user.uid,
      email: cred.user.email || email,
      displayName,
      role,
      phone: extra?.phone,
      specialization: extra?.specialization,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'users', cred.user.uid), profile);
    } catch (e) {
      console.warn('Firestore user profile document creation skipped or pending rules setup:', e);
    }

    return profile;
  },

  /**
   * Sign in with Firebase Authentication
   */
  async login(email: string, pass: string): Promise<FirebaseUser> {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    return cred.user;
  },

  /**
   * Fetch extra user profile from Firestore
   */
  async getProfile(uid: string): Promise<FirebaseUserProfile | null> {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data() as FirebaseUserProfile;
      }
    } catch (e) {
      console.error('Error fetching Firebase profile:', e);
    }
    return null;
  },

  /**
   * Send Password Reset Email via Firebase
   */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Sign out from Firebase
   */
  async logout(): Promise<void> {
    await signOut(auth);
  },

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get current authenticated Firebase user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },
};
