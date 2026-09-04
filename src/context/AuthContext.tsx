import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { useData } from './DataContext';
import { safeStorage } from '../utils/safeStorage';

interface AuthContextType {
  currentUser: User | null;
  login: (userOrId: User | string) => void;
  loginAsUser: (userOrId: User | string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { users, updateUserAppStatus } = useData();
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = safeStorage.getItem('ddworld_current_user_v2');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading current user from safeStorage:', e);
    }
    return null;
  });

  useEffect(() => {
    if (currentUser && users && users.length > 0) {
      const updated = users.find((u) => u.id === currentUser.id);
      if (updated) {
        if (
          updated.employmentStatus === 'BLOCKED' ||
          updated.employmentStatus === 'SUSPENDED' ||
          updated.employmentStatus === 'EXITED' ||
          updated.status === 'blocked'
        ) {
          logout();
          window.dispatchEvent(
            new CustomEvent('ddworld_auth_alert', {
              detail: { message: 'ඔබගේ ගිණුම පරිපාලක (Owner) විසින් අත්හිටුවා ඇත (ACCOUNT SUSPENDED / BLOCKED).' },
            })
          );
          return;
        }
        if (JSON.stringify(updated) !== JSON.stringify(currentUser)) {
          setCurrentUser(updated);
          safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(updated));
        }
      }
    }
  }, [users, currentUser]);

  useEffect(() => {
    const handleForceLogout = (e: Event) => {
      const customEv = e as CustomEvent<{ userId: string; status: string; reason?: string }>;
      if (currentUser && customEv.detail && customEv.detail.userId === currentUser.id) {
        console.warn('Administrative force-logout triggered for current user:', currentUser.id);
        logout();
        window.dispatchEvent(
          new CustomEvent('ddworld_auth_alert', {
            detail: {
              message: `පරිපාලක (Owner) විසින් ඔබව පද්ධතියෙන් ඉවත් කරන ලදී (${customEv.detail.status}).`,
            },
          })
        );
      }
    };
    window.addEventListener('ddworld_force_logout', handleForceLogout);
    return () => window.removeEventListener('ddworld_force_logout', handleForceLogout);
  }, [currentUser]);

  const login = (userOrId: User | string) => {
    let targetUser: User | undefined;
    if (typeof userOrId === 'string') {
      targetUser = users.find((u) => u.id === userOrId || u.agentCode === userOrId || u.email === userOrId);
    } else {
      targetUser = userOrId;
    }

    if (targetUser) {
      if (
        targetUser.employmentStatus === 'BLOCKED' ||
        targetUser.employmentStatus === 'SUSPENDED' ||
        targetUser.employmentStatus === 'EXITED' ||
        targetUser.status === 'blocked'
      ) {
        window.dispatchEvent(
          new CustomEvent('ddworld_auth_alert', {
            detail: { message: 'මෙම ගිණුම පරිපාලක විසින් අත්හිටුවා ඇත (ACCOUNT BLOCKED / SUSPENDED).' },
          })
        );
        return;
      }

      setCurrentUser(targetUser);
      safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(targetUser));

      if (targetUser.role !== 'owner') {
        updateUserAppStatus(targetUser.id, {
          isAppDownloaded: true,
          isLoggedIn: true,
          lastLoginAt: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' (' + new Date().toLocaleDateString('en-GB') + ')',
          appVersion: 'v5.3',
        });
      }
    }
  };

  const loginAsUser = (userOrId: User | string) => {
    login(userOrId);
  };

  const logout = () => {
    setCurrentUser(null);
    safeStorage.removeItem('ddworld_current_user_v2');
  };

  return (
    <AuthContext.Provider value={{ currentUser, login, loginAsUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
