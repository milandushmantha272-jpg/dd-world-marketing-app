import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { User } from '../types';
import { useData } from './DataContext';
import { safeStorage } from '../utils/safeStorage';
import {
  auth,
  getAuthenticatedEmployeeProfile,
  signInWithEmployeeCredentials,
  signOutFirebase,
} from '../services/firebase';

interface AuthContextType {
  currentUser: User | null;
  login: (userOrId: User | string, password?: string) => Promise<void>;
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
  const approvalStatus = user.idApprovalStatus || 'PENDING';
  return employmentStatus === 'ACTIVE' && approvalStatus === 'APPROVED' && user.status !== 'blocked';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, updateUserAppStatus } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const establishAuthorizedSession = async (firebaseUid: string) => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== firebaseUid) return;

    if (!firebaseUser.emailVerified) {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      return;
    }

    const firestoreProfile = await getAuthenticatedEmployeeProfile(firebaseUser);
    if (isBlockedUser(firestoreProfile) || !isApprovedActiveEmployee(firestoreProfile)) {
      await signOutFirebase();
      setCurrentUser(null);
      safeStorage.removeItem('ddworld_current_user_v2');
      throw new Error('Owner approval සහ ACTIVE employee status නොමැති account එකකට access ලබා නොදේ.');
    }

    // Firestore /users/{firebaseUid} is authoritative for identity and RBAC.
    // Local INITIAL_USERS data is only supplementary display metadata.
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
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setCurrentUser(null);
        safeStorage.removeItem('ddworld_current_user_v2');
        return;
      }

      if (!users.length) return;

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

  useEffect(() => {
    const handleForceLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string; status: string }>;
      if (currentUser && (customEvent.detail?.userId === currentUser.id || customEvent.detail?.userId === currentUser.firebaseUid)) {
        void logout();
        window.dispatchEvent(
          new CustomEvent('ddworld_auth_alert', {
            detail: { message: `පරිපාලක (Owner) විසින් ඔබව පද්ධතියෙන් ඉවත් කරන ලදී (${customEvent.detail.status}).` },
          }),
        );
      }
    };

    window.addEventListener('ddworld_force_logout', handleForceLogout);
    return () => window.removeEventListener('ddworld_force_logout', handleForceLogout);
  }, [currentUser]);

  const login = async (userOrId: User | string, password?: string) => {
    let targetUser: User | undefined;
    if (typeof userOrId === 'string') {
      const cleanInput = userOrId.trim().toLowerCase();
      targetUser = users.find(
        (user) =>
          user.id.toLowerCase() === cleanInput ||
          user.agentCode?.trim().toLowerCase() === cleanInput ||
          user.employeeId?.trim().toLowerCase() === cleanInput ||
          user.email?.trim().toLowerCase() === cleanInput,
      );
    } else {
      targetUser = userOrId;
    }

    if (!targetUser) throw new Error('DD World employee account was not found.');
    if (!targetUser.email?.trim()) throw new Error('මෙම employee account එකට Firebase email එකක් සකසා නැත.');
    if (!password) throw new Error('Firebase Password එක අවශ්‍යයි.');

    // Credentials are verified only by Firebase Authentication.
    const firebaseUser = await signInWithEmployeeCredentials(targetUser.email, password);
    if (!firebaseUser.emailVerified) {
      await signOutFirebase();
      throw new Error('Firebase email verification සම්පූර්ණ කළ පසු පමණක් login විය හැක.');
    }

    // The authenticated UID is then bound to /users/{uid}; role/status are taken
    // from that Firestore document, never from a password field or UI-only profile.
    await establishAuthorizedSession(firebaseUser.uid);
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
