import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import type { User } from '../types';
import { OWNER_AGENT_CODE, OWNER_EMAIL, OWNER_NAME } from '../config/owner';

// Correct Firebase configuration for DD WORLD.
const firebaseConfig = {
  apiKey: 'AIzaSyB8ejwvlW5KYHUAbfGb7LoSV2C3DC_oQmE',
  authDomain: 'dd-world-app-dushmsntha.firebaseapp.com',
  projectId: 'dd-world-app-dushmsntha',
  storageBucket: 'dd-world-app-dushmsntha.firebasestorage.app',
  messagingSenderId: '1031838170425',
  appId: '1:1031838170425:web:cf3905ca9d59870db23ce8',
  measurementId: 'G-K56HHKSY0E',
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;

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

/** Owner-only password recovery. */
export const sendOwnerPasswordReset = async (): Promise<void> => {
  await sendPasswordResetEmail(auth, OWNER_EMAIL);
};

/** First-time Owner bootstrap. */
export const bootstrapOwnerProfileIfMissing = async (
  firebaseUser: FirebaseUser,
): Promise<User | null> => {
  const email = firebaseUser.email?.trim().toLowerCase() || '';
  if (!firebaseUser.emailVerified || email !== OWNER_EMAIL) return null;

  const userRef = doc(db, 'users', firebaseUser.uid);
  const existing = await getDoc(userRef);
  if (existing.exists()) return null;

  const now = new Date().toISOString();
  const ownerProfile: User = {
    id: firebaseUser.uid,
    firebaseUid: firebaseUser.uid,
    name: OWNER_NAME,
    email: OWNER_EMAIL,
    role: 'owner',
    agentCode: OWNER_AGENT_CODE,
    status: 'active',
    employmentStatus: 'ACTIVE',
    idApprovalStatus: 'APPROVED',
    approvedByOwner: true,
    idApprovedAt: now,
    idApprovedBy: 'SYSTEM_OWNER_BOOTSTRAP',
    createdAt: now,
    joinedDate: now.slice(0, 10),
  };

  await setDoc(userRef, ownerProfile);
  return ownerProfile;
};

/** Loads the UID-keyed employee authorization profile. */
export const getAuthenticatedEmployeeProfile = async (
  firebaseUser: FirebaseUser,
): Promise<User> => {
  const uid = firebaseUser.uid;
  let snapshot = await getDoc(doc(db, 'users', uid));

  if (!snapshot.exists()) {
    await bootstrapOwnerProfileIfMissing(firebaseUser);
    snapshot = await getDoc(doc(db, 'users', uid));
  }

  if (!snapshot.exists()) {
    throw new Error('මෙම Firebase account එකට Owner-approved /users/{uid} employee profile එකක් නොමැත.');
  }

  const data = snapshot.data() as Partial<User> & { firebaseUid?: string; role?: string };
  if (data.firebaseUid && data.firebaseUid !== uid) {
    throw new Error('Firebase UID සහ employee profile UID එකිනෙකට නොගැලපේ.');
  }

  const role = data.role;
  const validRoles = new Set<User['role']>(['owner', 'team_leader', 'junior_team_leader', 'agent', 'dialog_officer']);
  if (!role || !validRoles.has(role as User['role'])) {
    throw new Error('Employee profile එකේ valid RBAC role එකක් නොමැත.');
  }

  return {
    ...(data as User),
    id: uid,
    firebaseUid: uid,
    email: firebaseUser.email || data.email,
    role: role as User['role'],
  };
};

export const signOutFirebase = async (): Promise<void> => {
  await signOut(auth);
};
