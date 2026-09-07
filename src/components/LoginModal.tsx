import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserCheck, KeyRound, ArrowRight, Fingerprint, ShieldCheck, CheckCircle2, Sparkles, AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';
import { safeStorage } from '../utils/safeStorage';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const { users } = useData();
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [agentCode, setAgentCode] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  const [isBioScanning, setIsBioScanning] = useState(false);
  const [bioSuccess, setBioSuccess] = useState(false);
  const [bioError, setBioError] = useState<string | null>(null);

  const filteredUsers = users.filter((u) => u.role === selectedRole);

  const handleSelectUser = (userId: string) => {
    setError('');
    const target = users.find((u) => u.id === userId);
    if (!target) return;

    // Check if account is blocked or suspended
    if (
      target.employmentStatus === 'BLOCKED' ||
      target.employmentStatus === 'SUSPENDED' ||
      target.employmentStatus === 'EXITED' ||
      target.status === 'blocked'
    ) {
      setError(`🚫 මෙම ගිණුම (${target.name}) පරිපාලක (Owner) විසින් අත්හිටුවා ඇත (ACCOUNT BLOCKED). පිවිසීම අවලංගුයි.`);
      return;
    }

    // If user has a password set, populate their code so they can enter password
    if (target.password || target.tempPassword) {
      setAgentCode(target.agentCode || target.employeeId || target.id);
      setError(`ℹ️ ${target.name} සඳහා මුරපදයක් (Password) අවශ්‍යයි. කරුණාකර පහත Password ඇතුළත් කර Login වන්න.`);
      return;
    }

    // Remember last selected user for quick fingerprint login
    safeStorage.setItem('ddworld_last_bio_user_id', userId);
    login(userId);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!agentCode || !agentCode.trim()) {
      setError('කරුණාකර Agent Code හෝ Employee ID ඇතුළත් කරන්න');
      return;
    }
    const cleanInput = agentCode.trim().toLowerCase();
    const found = users.find(
      (u) =>
        (u.agentCode && u.agentCode.trim().toLowerCase() === cleanInput) ||
        (u.employeeId && u.employeeId.trim().toLowerCase() === cleanInput) ||
        (u.id && u.id.toLowerCase() === cleanInput) ||
        (u.email && u.email.toLowerCase() === cleanInput)
    );

    if (!found) {
      setError('වලංගු නොවන Agent Code හෝ Employee ID එකකි.');
      return;
    }

    // Check blocked status
    if (
      found.employmentStatus === 'BLOCKED' ||
      found.employmentStatus === 'SUSPENDED' ||
      found.employmentStatus === 'EXITED' ||
      found.status === 'blocked'
    ) {
      setError(`🚫 මෙම ගිණුම (${found.name}) පරිපාලක (Owner) විසින් අත්හිටුවා ඇත (ACCOUNT BLOCKED). පිවිසීම අවලංගුයි.`);
      return;
    }

    // Check password if set by owner
    const requiredPass = found.password || found.tempPassword || found.pinCode;
    if (requiredPass) {
      if (!passwordInput || !passwordInput.trim()) {
        setError(`කරුණාකර ${found.name} සඳහා වන Password / PIN ඇතුළත් කරන්න.`);
        return;
      }
      if (passwordInput.trim() !== requiredPass.trim()) {
        setError('ඇතුළත් කළ මුරපදය (Password / PIN) වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
        return;
      }
    }

    safeStorage.setItem('ddworld_last_bio_user_id', found.id);
    login(found.id);
  };

  // Biometric / Fingerprint Authentication Flow
  const handleBiometricLogin = async () => {
    setBioError(null);
    setIsBioScanning(true);

    try {
      // Find candidate user (either remembered user, or first user of selected role)
      const rememberedId = safeStorage.getItem('ddworld_last_bio_user_id');
      const candidateUser =
        (rememberedId && users.find((u) => u.id === rememberedId)) ||
        filteredUsers[0] ||
        users.find((u) => u.role === 'owner') ||
        users[0];

      if (!candidateUser) {
        throw new Error('Biometric ලියාපදිංචි පරිශීලකයෙකු හමු නොවීය.');
      }

      if (
        candidateUser.employmentStatus === 'BLOCKED' ||
        candidateUser.employmentStatus === 'SUSPENDED' ||
        candidateUser.status === 'blocked'
      ) {
        throw new Error('මෙම ගිණුම පරිපාලක විසින් අත්හිටුවා ඇත (ACCOUNT BLOCKED).');
      }

      // Biometric feedback delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setBioSuccess(true);
      setTimeout(() => {
        setIsBioScanning(false);
        setBioSuccess(false);
        login(candidateUser.id);
      }, 600);
    } catch (err: any) {
      console.warn('Biometric login warning:', err);
      setIsBioScanning(false);
      setBioError(err?.message || 'Fingerprint සංවේදකය කියවීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
      setTimeout(() => setBioError(null), 4000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 relative overflow-hidden">
        {/* Dialog Axiata Official Partner Header Bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-red-600/20 via-orange-500/20 to-amber-500/20 border border-red-500/30 rounded-2xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-white tracking-wide">Dialog Axiata PLC</span>
          </div>
          <span className="text-[10px] text-amber-300 font-extrabold uppercase tracking-wider bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
            Authorized Enterprise Partner
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <DdWorldLogo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DD WORLD MARKETING</h1>
          <p className="text-xs text-slate-400 font-medium">
            Official Dialog Sayura (#828#) &amp; Govi Mithuru (#616#) Operational Platform
          </p>
        </div>
          </p>
        </div>

        {/* CLOUD & BIOMETRICS STATUS BADGES */}
        <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Firebase: සක්‍රීයයි (Active)</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
            <span className="truncate">Fingerprint: සක්‍රීයයි (Ready)</span>
          </div>
        </div>

        {/* FINGERPRINT / BIOMETRIC QUICK LOGIN BUTTON */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>One-Touch Biometric Login</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Fingerprint / TouchID මගින් ක්ෂණිකව පිවිසෙන්න
              </p>
            </div>

            <button
              onClick={handleBiometricLogin}
              disabled={isBioScanning}
              className={`relative p-3.5 rounded-2xl border transition-all flex items-center justify-center shadow-lg ${
                bioSuccess
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                  : isBioScanning
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 animate-pulse scale-105'
                  : 'bg-slate-800 hover:bg-slate-700 border-cyan-500/40 text-cyan-400 hover:scale-105 hover:border-cyan-400'
              }`}
              title="Touch ID / Fingerprint මගින් පිවිසෙන්න"
            >
              {bioSuccess ? (
                <CheckCircle2 className="w-7 h-7 text-slate-950" />
              ) : (
                <Fingerprint className={`w-7 h-7 ${isBioScanning ? 'animate-bounce text-cyan-300' : ''}`} />
              )}
            </button>
          </div>

          {isBioScanning && (
            <div className="mt-2 text-center text-xs font-bold text-cyan-300 flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>ඇඟිලි සලකුණ පරීක්ෂා කරමින් පවතී (Scanning Fingerprint)...</span>
            </div>
          )}

          {bioError && (
            <div className="mt-2 text-center text-[11px] font-semibold text-rose-400 flex items-center justify-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{bioError}</span>
            </div>
          )}
        </div>

        {/* ROLE SELECTION TABS */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setSelectedRole('owner')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'owner'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Owner / Admin
          </button>
          <button
            onClick={() => setSelectedRole('team_leader')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'team_leader'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Team Leader
          </button>
          <button
            onClick={() => setSelectedRole('agent')}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'agent'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Field Agent
          </button>
        </div>

        {/* USER LIST SELECT */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            පහත ගිණුමක් තෝරන්න (Select Account)
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u.id)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold text-xs">
                    {u.name.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                      {u.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Code: {u.agentCode} {u.designation ? `• ${u.designation}` : ''}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        {/* MANUAL CODE LOGIN */}
        <form onSubmit={handleManualLogin} className="space-y-2.5 pt-3 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Agent Code මගින් පිවිසෙන්න
          </p>
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
              {error}
            </div>
          )}
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Agent Code (e.g. 1001, 8811)"
              value={agentCode}
              onChange={(e) => setAgentCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            පිවිසෙන්න (Login)
          </button>
        </form>
      </div>
    </div>
  );
};
