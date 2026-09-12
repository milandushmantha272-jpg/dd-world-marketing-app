import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useData } from './DataContext';
import { safeStorage } from '../utils/safeStorage';
import { signInWithEmployeeCredentials, signOutFirebase } from '../services/firebase';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, updateUserAppStatus } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      const saved = safeStorage.getItem('ddworld_current_user_v2');
      if (saved) {
        const parsed = JSON.parse(saved) as User;
        // A local profile is only a UI cache. It is never sufficient to establish
        // an authenticated session, so stale cached identities are not restored.
        setCurrentUser(null);
        console.info('Cached DD World profile ignored until Firebase Auth session is verified:', parsed.id);
      }
    } catch (error) {
      console.warn('Unable to inspect cached DD World profile:', error);
    }
  }, []);

  useEffect(() => {
    if (!currentUser || !users.length) return;
    const updated = users.find((u) => u.id === currentUser.id);
    if (!updated) return;

    if (isBlockedUser(updated)) {
      void logout();
      window.dispatchEvent(
        new CustomEvent('ddworld_auth_alert', {
          detail: { message: 'ඔබගේ ගිණුම පරිපාලක (Owner) විසින් අත්හිටුවා ඇත (ACCOUNT SUSPENDED / BLOCKED).' },
        }),
      );
      return;
    }

    if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
      setCurrentUser(updated);
      safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(updated));
    }
  }, [users, currentUser]);

  useEffect(() => {
    const handleForceLogout = (event: Event) => {
      const customEvent = event as CustomEvent<{ userId: string; status: string }>;
      if (currentUser && customEvent.detail?.userId === currentUser.id) {
        void logout();
        window.dispatchEvent(
          new CustomEvent('ddworld_auth_alert', {
            detail: {
              message: `පරිපාලක (Owner) විසින් ඔබව පද්ධතියෙන් ඉවත් කරන ලදී (${customEvent.detail.status}).`,
            },
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
    if (isBlockedUser(targetUser)) throw new Error('මෙම ගිණුම Owner විසින් BLOCK / SUSPEND කර ඇත.');
    if (!targetUser.email?.trim()) throw new Error('මෙම employee account එකට verified email එකක් සකසා නැත.');
    if (!password) throw new Error('Password එක අවශ්‍යයි.');

    // Firebase Auth is authoritative for credential verification. The role shown
    // by the app comes only from the matched employee profile after auth succeeds.
    await signInWithEmployeeCredentials(targetUser.email, password);

    setCurrentUser(targetUser);
    safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(targetUser));

    if (targetUser.role !== 'owner') {
      updateUserAppStatus(targetUser.id, {
        isAppDownloaded: true,
        isLoggedIn: true,
        lastLoginAt:
          new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) +
          ' (' +
          new Date().toLocaleDateString('en-GB') +
          ')',
        appVersion: 'v5.3',
      });
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
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
