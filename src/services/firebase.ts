import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { User } from '../types';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

export const auth = getAuth(app);
export const db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);

/** Firebase Authentication is the only credential authority. */
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

/**
 * Loads the employee authorization profile from the UID-keyed Firestore document.
 * The Firestore document is the RBAC authority after Firebase Authentication.
 */
export const getAuthenticatedEmployeeProfile = async (
  firebaseUser: FirebaseUser,
): Promise<User> => {
  const uid = firebaseUser.uid;
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) {
    throw new Error('මෙම Firebase account එකට Owner-approved /users/{uid} employee profile එකක් නොමැත.');
  }

  const data = snapshot.data() as Partial<User> & { firebaseUid?: string; role?: string };
  if (data.firebaseUid && data.firebaseUid !== uid) {
    throw new Error('Firebase UID සහ employee profile UID එකිනෙකට නොගැලපේ.');
  }

  const role = data.role;
  if (role !== 'owner' && role !== 'team_leader' && role !== 'agent' && role !== 'dialog_officer') {
    throw new Error('Employee profile එකේ valid RBAC role එකක් නොමැත.');
  }

  return {
    ...(data as User),
    id: uid,
    firebaseUid: uid,
    email: firebaseUser.email || data.email,
    role,
  };
};

export const signOutFirebase = async (): Promise<void> => {
  await signOut(auth);
};
