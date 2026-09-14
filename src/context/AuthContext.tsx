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
  authError: string | null;
  retryAuth: () => Promise<void>;
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
  if (user.role === 'owner') return employmentStatus === 'ACTIVE' && user.status !== 'blocked';
  const approvalStatus = user.idApprovalStatus || 'PENDING';
  return employmentStatus === 'ACTIVE' && approvalStatus === 'APPROVED' && user.status !== 'blocked';
};

const formatAuthError = (error: unknown): string => {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code || '')
    : '';
  const raw = error instanceof Error ? error.message : String(error || 'Unknown error');

  if (code === 'permission-denied' || code === 'firestore/permission-denied' || /permission[- ]denied/i.test(raw)) {
    return 'Firestore permission denied: Owner bootstrap සඳහා Firebase Firestore Security Rules නිවැරදිව deploy කර තිබේදැයි පරීක්ෂා කරන්න.';
  }
  if (/failed-precondition|database.*not.*found|cloud firestore.*not.*enabled/i.test(raw)) {
    return 'Firestore database එක සූදානම් නැත. Firebase Console එකේ Cloud Firestore database එක create/enable කර තිබේදැයි පරීක්ෂා කරන්න.';
  }
  if (/network|offline|unavailable/i.test(raw)) {
    return 'Firebase/Firestore connection එක ලබාගත නොහැක. Internet connection එක පරීක්ෂා කර Retry කරන්න.';
  }
  return `Login authorization/bootstrap failed: ${raw}`;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, updateUserAppStatus } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const clearSession = () => {
    setCurrentUser(null);
    safeStorage.removeItem('ddworld_current_user_v2');
  };

  const establishAuthorizedSession = async (firebaseUid: string): Promise<User> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || firebaseUser.uid !== firebaseUid) throw new Error('Firebase session is no longer available.');

    if (!firebaseUser.emailVerified) {
      await signOutFirebase();
      clearSession();
      throw new Error('Firebase email verification සම්පූර්ණ කළ පසු පමණක් login විය හැක.');
    }

    const firestoreProfile = await getAuthenticatedEmployeeProfile(firebaseUser);
    if (isBlockedUser(firestoreProfile) || !isApprovedActiveEmployee(firestoreProfile)) {
      await signOutFirebase();
      clearSession();
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

  const retryAuth = async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setAuthError('Firebase login session එක නොමැත. නැවත login කරන්න.');
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    setAuthError(null);
    try {
      await establishAuthorizedSession(firebaseUser.uid);
    } catch (error) {
      console.warn('Firebase employee authorization retry failed:', error);
      clearSession();
      setAuthError(formatAuthError(error));
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        clearSession();
        setAuthError(null);
        setAuthChecking(false);
        return;
      }

      setAuthChecking(true);
      setAuthError(null);
      try {
        await establishAuthorizedSession(firebaseUser.uid);
      } catch (error) {
        console.warn('Firebase employee authorization rejected:', error);
        clearSession();
        setAuthError(formatAuthError(error));
      } finally {
        setAuthChecking(false);
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
    setAuthError(null);
    setAuthChecking(true);
    try {
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
        clearSession();
        throw new Error(`මෙම account එක ${authorizedProfile.role} role එකට අයත්ය.`);
      }

      if (credentialEmail === OWNER_EMAIL && authorizedProfile.role !== 'owner') {
        await signOutFirebase();
        clearSession();
        throw new Error('Configured Owner Firebase account එක Owner role එකක් නොවේ.');
      }
    } catch (error) {
      console.warn('DD World login failed:', error);
      clearSession();
      setAuthError(formatAuthError(error));
      throw error;
    } finally {
      setAuthChecking(false);
    }
  };

  const loginAsUser = async (userOrId: User | string, password?: string) => login(userOrId, password);

  const logout = async () => {
    clearSession();
    try {
      await signOutFirebase();
    } catch (error) {
      console.warn('Firebase sign-out warning:', error);
    }
  };

  const authFailureView = authError && !currentUser ? (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 560, padding: 28, border: '1px solid #444', borderRadius: 16, background: '#111', boxSizing: 'border-box' }}>
        <h2 style={{ marginTop: 0 }}>DD WORLD — Login / Firebase Error</h2>
        <p style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{authError}</p>
        <button
          type="button"
          onClick={() => void retryAuth()}
          disabled={authChecking}
          style={{ marginTop: 12, padding: '12px 20px', borderRadius: 10, border: 0, cursor: authChecking ? 'wait' : 'pointer' }}
        >
          {authChecking ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    </div>
  ) : null;

  if (authFailureView) return authFailureView;

  return (
    <AuthContext.Provider value={{ currentUser, authError, retryAuth, login, loginAsUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
