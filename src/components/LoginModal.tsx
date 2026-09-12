import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';
import { safeStorage } from '../utils/safeStorage';

const blockedStatuses = new Set(['BLOCKED', 'SUSPENDED', 'EXITED', 'TEMPORARY_SUSPENDED', 'RESIGNED', 'TERMINATED', 'blocked']);

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const { users } = useData();
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    const value = identifier.trim().toLowerCase();
    if (!value || !password.trim()) {
      setError('Agent Code / Employee ID / Email සහ Firebase Password දෙකම ඇතුළත් කරන්න.');
      return;
    }

    const target = users.find((user) =>
      user.id.toLowerCase() === value ||
      user.agentCode?.trim().toLowerCase() === value ||
      user.employeeId?.trim().toLowerCase() === value ||
      user.email?.trim().toLowerCase() === value,
    );

    if (!target) {
      setError('Employee account එක හමු නොවීය.');
      return;
    }

    if (target.role !== selectedRole) {
      setError('තෝරා ඇති Role එකට මෙම employee account එක අයත් නොවේ.');
      return;
    }

    if (blockedStatuses.has(String(target.employmentStatus || '')) || target.status === 'blocked') {
      setError('මෙම account එක Owner විසින් BLOCK / SUSPEND / EXIT කර ඇත. Login denied.');
      return;
    }

    if (!target.email?.trim()) {
      setError('මෙම account එකට verified Firebase email එකක් සකසා නැත.');
      return;
    }

    setBusy(true);
    try {
      // Never compare, store, or authenticate against profile.password/tempPassword/pinCode.
      // AuthContext delegates credential verification to Firebase Authentication.
      await login(target.id, password.trim());
      safeStorage.setItem('ddworld_last_login_id', target.id);
    } catch (err: any) {
      setError(err?.message || 'Firebase authentication අසාර්ථකයි.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-red-950/30">
        <div className="flex justify-center mb-3"><DdWorldLogo size="lg" showText={false} /></div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-white">DD WORLD MARKETING</h1>
          <p className="mt-1 text-xs text-slate-400">Secure Firebase Authentication</p>
        </div>

        <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Firebase Auth Required
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-950 p-1 mb-5">
          {(['owner', 'team_leader', 'agent'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => { setSelectedRole(role); setError(''); }}
              className={`rounded-lg py-2 text-xs font-bold transition ${selectedRole === role ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {role === 'owner' ? 'Owner' : role === 'team_leader' ? 'Team Leader' : 'Agent'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-300">Agent Code / Employee ID / Email</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-red-500"
              placeholder="Enter employee identifier"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-300">Firebase Password</span>
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-red-500"
                placeholder="Enter Firebase password"
              />
            </div>
          </label>

          {error && <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs font-semibold text-red-200">{error}</div>}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5 text-sm font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Authenticating…' : 'Secure Login'}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>

        <p className="mt-5 text-center text-[10px] leading-relaxed text-slate-500">
          Local profile passwords, temporary passwords and PINs are not used for authentication. Blocked or exited accounts are denied before Firebase sign-in.
        </p>
      </div>
    </div>
  );
};
