import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const auth = getAuth(app);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

let authReadyPromise: Promise<FirebaseUser> | null = null;

/**
 * Establishes a Firebase session for application bootstrapping only.
 * This must not be treated as employee authentication. Employee login is
 * performed by signInWithEmployeeCredentials below.
 */
export const ensureFirebaseSession = (): Promise<FirebaseUser> => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);

  if (!authReadyPromise) {
    authReadyPromise = new Promise<FirebaseUser>((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
          return;
        }

        try {
          const credential = await signInAnonymously(auth);
          unsubscribe();
          resolve(credential.user);
        } catch (error) {
          unsubscribe();
          authReadyPromise = null;
          reject(error);
        }
      });
    });
  }

  return authReadyPromise;
};

/**
 * Production employee authentication. Passwords are verified by Firebase Auth;
 * DD World never compares or stores plaintext passwords in the browser.
 */
export const signInWithEmployeeCredentials = async (
  email: string,
  password: string,
): Promise<FirebaseUser> => {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Firebase Auth requires a valid email and password.');
  }

  const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
  authReadyPromise = Promise.resolve(credential.user);
  return credential.user;
};

export const signOutFirebase = async (): Promise<void> => {
  authReadyPromise = null;
  await signOut(auth);
};
