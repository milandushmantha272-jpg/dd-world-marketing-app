import React, { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck, UserRound, Users, BriefcaseBusiness, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';
import { safeStorage } from '../utils/safeStorage';
import { sendOwnerPasswordReset } from '../services/supabaseAuth';

const blockedStatuses = new Set(['BLOCKED', 'SUSPENDED', 'EXITED', 'TEMPORARY_SUSPENDED', 'RESIGNED', 'TERMINATED', 'blocked']);
const roleMeta: Record<Exclude<UserRole, 'dialog_officer'>, { label: string; icon: React.ElementType }> = {
  owner: { label: 'Owner', icon: UserRound },
  team_leader: { label: 'Team Leader', icon: Users },
  agent: { label: 'Agent', icon: BriefcaseBusiness },
};

type LoginRole = Exclude<UserRole, 'dialog_officer'>;

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const { users } = useData();
  const [selectedRole, setSelectedRole] = useState<LoginRole>('owner');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setResetSent(false);
    const value = identifier.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!value || !cleanPassword) {
      setError('Employee ID / Agent Code / Email සහ Password දෙකම ඇතුළත් කරන්න.');
      return;
    }

    const target = users.find((user) =>
      user.id.toLowerCase() === value ||
      user.agentCode?.trim().toLowerCase() === value ||
      user.employeeId?.trim().toLowerCase() === value ||
      user.email?.trim().toLowerCase() === value,
    );
    if (!target && !value.includes('@')) {
      setError('Employee account එක හමු නොවීය. Registered email එකෙන් login කරන්න.');
      return;
    }
    if (target && target.role !== selectedRole) {
      setError(`මෙම account එක ${roleMeta[target.role as LoginRole]?.label || target.role} role එකට අයත්ය.`);
      return;
    }
    if (target && (blockedStatuses.has(String(target.employmentStatus || '')) || target.status === 'blocked')) {
      setError('මෙම account එක Owner විසින් BLOCK / SUSPEND / EXIT කර ඇත. Login denied.');
      return;
    }
    if (target && !target.email?.trim()) {
      setError('මෙම employee account එකට registered email එකක් නැත.');
      return;
    }

    setBusy(true);
    try {
      await login(target?.email?.trim().toLowerCase() || value, cleanPassword, selectedRole);
      safeStorage.setItem('ddworld_last_login_id', target?.id || value);
    } catch (err: any) {
      setError(err?.message || 'Secure authentication අසාර්ථකයි.');
    } finally {
      setBusy(false);
    }
  };

  const resetOwnerPassword = async () => {
    setError('');
    setResetSent(false);
    setResetBusy(true);
    try {
      await sendOwnerPasswordReset();
      setResetSent(true);
    } catch (err: any) {
      setError(err?.message || 'Owner password reset email එක යැවීමට නොහැකි විය.');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-[#06111f]/45 px-4 py-6 backdrop-blur-[2px]">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/15 bg-slate-950/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex justify-center"><DdWorldLogo size="lg" showText={false} /></div>
          <div className="mt-4 text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">Official Employee Portal</div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-white">DD WORLD MARKETING</h1>
            <p className="mt-1 text-xs text-slate-400">Secure Company Access</p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2.5 text-xs font-bold text-emerald-200">
            <ShieldCheck className="h-4 w-4" /> Owner-controlled secure authentication
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl border border-white/10 bg-black/20 p-1.5">
            {(Object.keys(roleMeta) as LoginRole[]).map((role) => {
              const Icon = roleMeta[role].icon;
              const selected = selectedRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => { setSelectedRole(role); setError(''); setResetSent(false); }}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-extrabold transition ${selected ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4" />
                  {roleMeta[role].label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">Employee ID / Agent Code / Email</span>
              <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10" placeholder="Enter registered ID or email" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-300">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-2xl border border-white/10 bg-black/25 py-3.5 pl-10 pr-12 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/10" placeholder="Enter password" />
                <button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-lg px-2 text-slate-500 hover:text-white">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>

            {selectedRole === 'owner' && (
              <button type="button" onClick={resetOwnerPassword} disabled={resetBusy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-400/10 px-4 py-3 text-xs font-bold text-blue-200 transition hover:bg-blue-400/15 disabled:opacity-60">
                <Mail className="h-4 w-4" />{resetBusy ? 'Sending secure email…' : 'Forgot Owner Password'}
              </button>
            )}
            {resetSent && <div className="rounded-2xl border border-emerald-400/25 bg-emerald-950/30 p-3 text-xs font-semibold leading-5 text-emerald-200">Password reset email එක registered Owner email එකට යවා ඇත.</div>}
            {error && <div className="rounded-2xl border border-red-400/25 bg-red-950/35 p-3 text-xs font-semibold leading-5 text-red-200">{error}</div>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-blue-600 to-cyan-500 px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Authenticating…' : `Secure ${roleMeta[selectedRole].label} Login`}
              {!busy && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-5 text-center text-[10px] leading-5 text-slate-500">DD WORLD official employee access • Supabase Auth • database security policies</div>
        </div>
      </div>
    </div>
  );
};
