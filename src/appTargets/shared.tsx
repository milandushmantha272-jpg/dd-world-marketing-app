import React, { useEffect, useRef } from 'react';
import { DataProvider } from '../context/DataContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/LoginModal';

export type AppTarget = 'agent' | 'management' | 'audit';

export const allowedRoles: Record<AppTarget, string[]> = {
  agent: ['agent'],
  management: ['owner', 'team_leader', 'junior_team_leader'],
  audit: ['dialog_officer'],
};

export const FatalDenied: React.FC<{ target: AppTarget }> = ({ target }) => (
  <div
    style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: '#f5f8fc',
      color: '#14213d',
    }}
  >
    <div
      style={{
        width: '100%',
        maxWidth: 420,
        border: '1px solid #e2e8f0',
        borderRadius: 20,
        padding: 24,
        background: '#fff',
        textAlign: 'center',
      }}
    >
      <div style={{ fontWeight: 900, fontSize: 18 }}>DD WORLD Access Denied</div>
      <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
        This installed application is not authorized for your account role.
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: '#94a3b8' }}>
        Target: {target}
      </div>
    </div>
  </div>
);

export const TargetShell: React.FC<{
  target: AppTarget;
  children: React.ReactNode;
}> = ({ target, children }) => {
  const { currentUser, logout } = useAuth();
  const handledRef = useRef<string | null>(null);
  const authorized = !!currentUser && allowedRoles[target].includes(currentUser.role);

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
