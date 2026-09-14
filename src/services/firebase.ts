import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { User } from '../types';
import { OWNER_AGENT_CODE, OWNER_EMAIL, OWNER_NAME } from '../config/owner';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// The new Spark project uses the default Firestore database. Keep legacy
// configs compatible without requiring firestoreDatabaseId in the JSON type.
const databaseId =
  'firestoreDatabaseId' in firebaseConfig &&
  typeof firebaseConfig.firestoreDatabaseId === 'string' &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
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
 * First-time Owner bootstrap.
 *
 * Firebase Authentication remains authoritative for the credential. If the
 * authenticated Owner has no /users/{uid} document yet, create the minimum
 * Owner authorization profile. This path is deliberately limited to the
 * configured Owner email and never bootstraps Agent/Team Leader accounts.
 */
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

/**
 * Loads the employee authorization profile from the UID-keyed Firestore document.
 * The Firestore document is the RBAC authority after Firebase Authentication.
 * A missing document is eligible for Owner-only first-login bootstrap.
 */
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
