import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
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

/**
 * Production employee authentication. Firebase Authentication is the
 * credential authority; the browser never compares or stores plaintext
 * passwords as a source of truth.
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
  return credential.user;
};

export const signOutFirebase = async (): Promise<void> => {
  await signOut(auth);
};
