import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase is used as the authenticated persistence layer for the existing DD World
// application identity system. The app's Owner/Team Leader/Agent profile remains
// separate from Firebase Auth; Firebase Auth supplies the session required by Firestore.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

export const auth = getAuth(app);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

let authReadyPromise: Promise<FirebaseUser> | null = null;

/**
 * Ensure every app session has a Firebase Auth identity before Firestore is used.
 * Anonymous Auth is intentional here because DD World has its own role/password
 * system and migrating those credentials to Firebase Auth requires server-side
 * account provisioning. This removes the unauthenticated Firestore 403 path.
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
