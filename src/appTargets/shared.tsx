import React, { useEffect, useRef, useState } from 'react';
import { DataProvider } from '../context/DataContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';
import { supabase } from '../services/supabase';

export type AppTarget = 'agent' | 'management' | 'audit';

export const allowedRoles: Record<AppTarget, string[]> = {
  agent: ['agent'],
  management: ['owner', 'team_leader', 'junior_team_leader'],
  audit: ['dialog_officer'],
};

export const FatalDenied: React.FC<{ target: AppTarget }> = ({ target }) => (
  <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#f5f8fc', color: '#14213d' }}>
    <div style={{ width: '100%', maxWidth: 420, border: '1px solid #e2e8f0', borderRadius: 20, padding: 24, background: '#fff', textAlign: 'center' }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>DD WORLD Access Denied</div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>This installed application is not authorized for your account role.</div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>Target: {target}</div>
    </div>
  </div>
);

const ResetPasswordPage: React.FC = () => {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Opening secure password recovery…');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        setMessage('Set a new Owner password.');
        return;
      }
      setMessage('Waiting for the secure recovery session…');
    };
    void prepare();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
        setMessage('Set a new Owner password.');
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password.length < 12) {
      setError('Use at least 12 characters for the new password.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setReady(false);
      setMessage('Password changed successfully. Please return to the DD WORLD app and sign in with the new password.');
    } catch (err: any) {
      setError(err?.message || 'Password update failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f8fc', display: 'grid', placeItems: 'center', padding: 18, color: '#14213d' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #d8e3ef', borderRadius: 22, padding: 22, boxShadow: '0 12px 35px rgba(20,45,80,.12)' }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>DD WORLD Owner Password Reset</h1>
        <p style={{ fontSize: 12, color: '#64748b' }}>{message}</p>
        {ready && <form onSubmit={updatePassword}>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="New password (12+ characters)" style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 14, padding: 13, borderRadius: 12, border: '1px solid #d6e1ed' }} />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" placeholder="Confirm new password" style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 10, padding: 13, borderRadius: 12, border: '1px solid #d6e1ed' }} />
          {error && <div style={{ marginTop: 10, color: '#b42336', fontSize: 12 }}>{error}</div>}
          <button disabled={busy} type="submit" style={{ width: '100%', marginTop: 14, padding: 13, border: 0, borderRadius: 12, background: '#14213d', color: '#fff', fontWeight: 900 }}>{busy ? 'Updating…' : 'Set New Password'}</button>
        </form>}
        {!ready && error && <div style={{ marginTop: 10, color: '#b42336', fontSize: 12 }}>{error}</div>}
      </div>
    </div>
  );
};

export const TargetShell: React.FC<{ target: AppTarget; children: React.ReactNode }> = ({ target, children }) => {
  const { currentUser, logout } = useAuth();
  const handledRef = useRef<string | null>(null);
  const authorized = !!currentUser && allowedRoles[target].includes(currentUser.role);

  if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') {
    return <ResetPasswordPage />;
  }

  useEffect(() => {
    if (!currentUser || authorized) return;
    const key = `${target}:${currentUser.id}`;
    if (handledRef.current === key) return;
    handledRef.current = key;
    void logout();
  }, [authorized, currentUser, logout, target]);

  if (!currentUser) return <LoginModal />;
  if (!authorized) return <FatalDenied target={target} />;
  return <>{children}</>;
};

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DataProvider>
    <AuthProvider>{children}</AuthProvider>
  </DataProvider>
);
