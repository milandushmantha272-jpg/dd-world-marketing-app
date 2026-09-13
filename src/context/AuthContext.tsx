import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole } from '../types';
import { useData } from './DataContext';
import { safeStorage } from '../utils/safeStorage';
import {
  auth,
  getAuthenticatedEmployeeProfile,
  signInWithEmployeeCredentials,
  signOutFirebase,
} from '../services/firebase';
import { OWNER_EMAIL } from '../config/owner';

interface AuthContextType {
  currentUser: User | null;
  login: (userOrId: User | string, password?: string, expectedRole?: UserRole) => Promise<void>;
  loginAsUser: (userOrId: User | string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isBlockedUser = (user: User) =>
  user.employmentStatus === 'BLOCKED' ||
  user.employmentStatus === 'SUSPENDED' ||
  user.employmentStatus === 'EXITED' ||
  user.status === 'blocked';

const isApprovedActiveEmployee = (user: User) => {
  const employmentStatus = user.employmentStatus || (user.status === 'blocked' ? 'BLOCKED' : 'ACTIVE');

  // Owner is the ultimate authority. Existing Owner documents from before the
  // employee-approval fields were introduced remain valid when ACTIVE.
  if (user.role === 'owner') {
    return employmentStatus === 'ACTIVE' && user.status !== 'blocked';
  }

  const approvalStatus = user.idApprovalStatus || 'PENDING';
  return employmentStatus === 'ACTIVE' && approvalStatus === 'APPROVED' && user.status !== 'blocked';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, updateUserAppStatus } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const establishAuthorizedSession = async (firebaseUid: string): Promise<User> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== firebaseUid) throw new Error('Firebase session is no longer available.');

    if (!firebaseUser.emailVerified) {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      throw new Error('Firebase email verification සම්පූර්ණ කළ පසු පමණක් login විය හැක.');
    }

    // Firebase Auth proves the credential. The UID-keyed Firestore profile is
    // then loaded; Owner-only first-login bootstrap is handled in firebase.ts.
    const firestoreProfile = await getAuthenticatedEmployeeProfile(firebaseUser);
    if (isBlockedUser(firestoreProfile) || !isApprovedActiveEmployee(firestoreProfile)) {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      throw new Error('Owner approval සහ ACTIVE employee status නොමැති account එකකට access ලබා නොදේ.');
    }

    const localProfile = users.find(
      (u) => u.firebaseUid === firebaseUid || u.email?.trim().toLowerCase() === firestoreProfile.email?.trim().toLowerCase(),
    );
    const authorizedProfile: User = {
      ...(localProfile || {}),
      ...firestoreProfile,
      id: firebaseUid,
      firebaseUid,
    };

    setCurrentUser(authorizedProfile);
    safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(authorizedProfile));

    if (localProfile && localProfile.role !== 'owner') {
      updateUserAppStatus(localProfile.id, {
        isAppDownloaded: true,
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString(),
        appVersion: 'v5.4',
      });
    }

    return authorizedProfile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        safeStorage.removeItem('ddworld_current_user_v2');
        return;
      }

      // Do not wait for the users collection. A first-time Owner may have no
      // Firestore employee document yet and must be able to bootstrap it.
      try {
        await establishAuthorizedSession(firebaseUser.uid);
      } catch (error) {
        console.warn('Firebase employee authorization rejected:', error);
        setCurrentUser(null);
        safeStorage.removeItem('ddworld_current_user_v2');
      }
    });

    return unsubscribe;
  }, [users]);

  useEffect(() => {
    if (!currentUser || !users.length) return;
    const updated = users.find(
      (u) => u.firebaseUid === currentUser.firebaseUid || u.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase(),
    );
    if (!updated) return;

    if (isBlockedUser(updated) || !isApprovedActiveEmployee(updated)) {
      void logout();
      window.dispatchEvent(
        new CustomEvent('ddworld_auth_alert', {
          detail: { message: 'ඔබගේ DD WORLD employee account එක ACTIVE සහ OWNER-APPROVED තත්ත්වයේ නොමැති නිසා access අවහිර කරන ලදී.' },
        }),
      );
    }
  }, [users, currentUser]);

  const login = async (userOrId: User | string, password?: string, expectedRole?: UserRole) => {
    let targetUser: User | undefined;
    let credentialEmail = '';

    if (typeof userOrId === 'string') {
      const cleanInput = userOrId.trim().toLowerCase();
      targetUser = users.find(
        (user) =>
          user.id.toLowerCase() === cleanInput ||
          user.agentCode?.trim().toLowerCase() === cleanInput ||
          user.employeeId?.trim().toLowerCase() === cleanInput ||
          user.email?.trim().toLowerCase() === cleanInput,
      );

      // Owner first login must not depend on the local/Firestore users list.
      // This also removes the stale old-email lookup as a prerequisite for Auth.
      if (!targetUser && cleanInput.includes('@')) credentialEmail = cleanInput;
    } else {
      targetUser = userOrId;
    }

    if (!targetUser && !credentialEmail) throw new Error('DD World employee account was not found.');
    if (targetUser && !targetUser.email?.trim()) throw new Error('මෙම employee account එකට Firebase email එකක් සකසා නැත.');
    if (!password) throw new Error('Firebase Password එක අවශ්‍යයි.');

    credentialEmail = credentialEmail || targetUser!.email!.trim().toLowerCase();
    const firebaseUser = await signInWithEmployeeCredentials(credentialEmail, password);
    const authorizedProfile = await establishAuthorizedSession(firebaseUser.uid);

    if (expectedRole && authorizedProfile.role !== expectedRole) {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      throw new Error(`මෙම account එක ${authorizedProfile.role} role එකට අයත්ය.`);
    }

    // The configured Owner email is accepted directly by Firebase Auth even
    // when no local/Firestore employee lookup record existed before login.
    if (credentialEmail === OWNER_EMAIL && authorizedProfile.role !== 'owner') {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      throw new Error('Configured Owner Firebase account එක Owner role එකක් නොවේ.');
    }
  };

  const loginAsUser = async (userOrId: User | string, password?: string) => login(userOrId, password);

  const logout = async () => {
    setCurrentUser(null);
    safeStorage.removeItem('ddworld_current_user_v2');
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn('Firebase sign-out warning:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginAsUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
