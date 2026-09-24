import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserRole } from '../types';
import { useData } from './DataContext';
import { safeStorage } from '../utils/safeStorage';
import { supabase } from '../services/supabase';
import {
  getAuthenticatedEmployeeProfile,
  bootstrapOwnerProfileIfMissing,
  signInWithEmployeeCredentials,
  signOutSupabase,
} from '../services/supabaseAuth';
import { OWNER_EMAIL } from '../config/owner';

interface AuthContextType {
  currentUser: User | null;
  authError: string | null;
  retryAuth: () => Promise<void>;
  login: (userOrId: User | string, password?: string, expectedRole?: UserRole) => Promise<void>;
  loginAsUser: (userOrId: User | string, password?: string) => Promise<void>;
  loginWithoutCredentials: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isApprovedActiveEmployee = (user: User) => {
  const status = String(user.status || '').toLowerCase();
  const employment = String(user.employmentStatus || '').toUpperCase();
  const approval = String(user.idApprovalStatus || '').toUpperCase();
  if (user.role === 'owner') return status === 'active' && employment === 'ACTIVE';
  return status === 'active' && employment === 'ACTIVE' && approval === 'APPROVED';
};

type SupabaseLikeError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
  status?: unknown;
};

const formatAuthError = (error: unknown): string => {
  const isRecord = typeof error === 'object' && error !== null;
  const structured = isRecord ? error as SupabaseLikeError : null;
  const code = structured?.code ? String(structured.code) : '';
  const message = structured?.message ? String(structured.message) : '';
  const details = structured?.details ? String(structured.details) : '';
  const hint = structured?.hint ? String(structured.hint) : '';
  const status = structured?.status ? String(structured.status) : '';
  const raw = error instanceof Error
    ? error.message
    : message || (isRecord ? JSON.stringify(error) : String(error || 'Unknown error'));

  if (code === 'invalid_credentials' || /invalid login credentials|invalid credentials/i.test(raw)) {
    return 'Email හෝ password වැරදියි.';
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(raw)) {
    return 'Email verification සම්පූර්ණ කළ පසු පමණක් login විය හැක.';
  }
  if (/network|fetch|failed to fetch|timeout/i.test(raw)) {
    return 'Supabase connection එක ලබාගත නොහැක. Internet connection එක පරීක්ෂා කර Retry කරන්න.';
  }

  const extra = [details, hint, status ? `HTTP ${status}` : ''].filter(Boolean).join(' | ');
  return extra ? `Login authorization failed: ${raw} — ${extra}` : `Login authorization failed: ${raw}`;
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

  const establishAuthorizedSession = async (authUser: { id: string; email?: string | null }) => {
    if (!authUser.email) throw new Error('Supabase account එකට email address එකක් නොමැත.');
    if (authUser.email.trim().toLowerCase() === OWNER_EMAIL) {
      await bootstrapOwnerProfileIfMissing(authUser);
    }
    const profile = await getAuthenticatedEmployeeProfile(authUser.id);
    if (!isApprovedActiveEmployee(profile)) {
      await signOutSupabase();
      clearSession();
      throw new Error('Owner approval සහ ACTIVE employee status නොමැති account එකකට access ලබා නොදේ.');
    }

    const localProfile = users.find(
      (u) => u.email?.trim().toLowerCase() === profile.email?.trim().toLowerCase() || u.id === profile.id,
    );
    const authorizedProfile: User = { ...(localProfile || {}), ...profile, id: profile.id };
    setCurrentUser(authorizedProfile);
    setAuthError(null);
    safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(authorizedProfile));

    if (profile.role !== 'owner') {
      void updateUserAppStatus(profile.id, {
        isAppDownloaded: true,
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString(),
        appVersion: 'v5.8',
      });
    }
    return authorizedProfile;
  };

  const retryAuth = async () => {
    setAuthChecking(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.user) {
        // No session is the normal logged-out state, not an authorization error.
        clearSession();
        return;
      }
      await establishAuthorizedSession(data.session.user);
    } catch (error) {
      clearSession();
      setAuthError(formatAuthError(error));
    } finally {
      setAuthChecking(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Supabase may legitimately have no session on a fresh/logged-out app.
    // Do not call getUser() in that state because it returns HTTP 400
    // AuthSessionMissingError and would incorrectly replace the login screen
    // with an authorization-error screen.
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (data.session?.user) {
          await establishAuthorizedSession(data.session.user);
        } else {
          clearSession();
          setAuthError(null);
        }
      } catch (error) {
        if (mounted) {
          clearSession();
          setAuthError(formatAuthError(error));
        }
      } finally {
        if (mounted) setAuthChecking(false);
      }
    })();

    // Keep this callback synchronous. Supabase warns against making async
    // Supabase calls directly inside onAuthStateChange because it can deadlock
    // the auth client. Login/profile loading is handled by login() and the
    // initial getSession() check above; this listener only clears local state
    // when the session actually disappears.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        clearSession();
        setAuthError(null);
        setAuthChecking(false);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [users]);

  useEffect(() => {
    if (!currentUser || !users.length) return;
    const updated = users.find((u) => u.email?.trim().toLowerCase() === currentUser.email?.trim().toLowerCase() || u.id === currentUser.id);
    if (updated && !isApprovedActiveEmployee(updated)) {
      void logout();
      window.dispatchEvent(new CustomEvent('ddworld_auth_alert', { detail: { message: 'ඔබගේ employee account එක ACTIVE සහ OWNER-APPROVED තත්ත්වයේ නොමැති නිසා access අවහිර කරන ලදී.' } }));
    }
  }, [users, currentUser]);

  const login = async (userOrId: User | string, password?: string, expectedRole?: UserRole) => {
    setAuthError(null);
    setAuthChecking(true);
    try {
      let email = '';
      if (typeof userOrId === 'string') {
        const input = userOrId.trim().toLowerCase();
        const target = users.find((u) => u.id.toLowerCase() === input || u.agentCode?.trim().toLowerCase() === input || u.employeeId?.trim().toLowerCase() === input || u.email?.trim().toLowerCase() === input);
        email = target?.email?.trim().toLowerCase() || (input.includes('@') ? input : '');
      } else {
        email = userOrId.email?.trim().toLowerCase() || '';
      }
      if (!email) throw new Error('Employee email එක හමු නොවීය.');
      if (!password) throw new Error('Password එක අවශ්‍යයි.');

      const authUser = await signInWithEmployeeCredentials(email, password);
      const profile = await establishAuthorizedSession(authUser);
      if (expectedRole && profile.role !== expectedRole) {
        await signOutSupabase();
        clearSession();
        throw new Error(`මෙම account එක ${profile.role} role එකට අයත්ය.`);
      }
      if (email === OWNER_EMAIL && profile.role !== 'owner') {
        await signOutSupabase();
        clearSession();
        throw new Error('Configured Owner account එක Owner role එකක් නොවේ.');
      }
    } catch (error) {
      clearSession();
      const formatted = formatAuthError(error);
      // Credential failures are shown by LoginModal; keep the login form visible
      // instead of replacing it with the global authorization error screen.
      if (!/Email හෝ password වැරදියි\./i.test(formatted)) setAuthError(formatted);
      throw error;
    } finally {
      setAuthChecking(false);
    }
  };

  const loginAsUser = async (userOrId: User | string, password?: string) => login(userOrId, password);
  // Temporary UI-testing mode: creates a local in-app session without Supabase credentials.
  // Disable this before any production release.
  const loginWithoutCredentials = async (role: UserRole) => {
    setAuthError(null);
    setAuthChecking(true);
    try {
      const target = users.find((u) => u.role === role && isApprovedActiveEmployee(u));
      const demoUser: User = target ? { ...target } : ({
        id: 'test-' + role,
        name: role === 'team_leader' ? 'Test Team Leader' : role === 'junior_team_leader' ? 'Test Junior Team Leader' : role === 'agent' ? 'Test Agent' : 'Test Owner',
        email: 'test.' + role + '@ddworld.local',
        role,
        status: 'active',
        employmentStatus: 'ACTIVE',
        idApprovalStatus: 'APPROVED',
      } as User);
      setCurrentUser(demoUser);
      setAuthError(null);
      safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(demoUser));
    } finally {
      setAuthChecking(false);
    }
  };


  const logout = async () => {
    const trackedUser = currentUser;
    if (trackedUser && trackedUser.role !== 'owner') {
      try { await updateUserAppStatus(trackedUser.id, { isLoggedIn: false }); } catch (error) { console.warn('Login presence update warning:', error); }
    }
    clearSession();
    setAuthError(null);
    try { await signOutSupabase(); } catch (error) { console.warn('Supabase sign-out warning:', error); }
  };

  return <AuthContext.Provider value={{ currentUser, authError, retryAuth, login, loginAsUser, loginWithoutCredentials, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
