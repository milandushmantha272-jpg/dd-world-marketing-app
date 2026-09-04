import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { UserCheck, KeyRound, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';

export const LoginModal: React.FC = () => {
  const { login } = useAuth();
  const { users } = useData();
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [agentCode, setAgentCode] = useState('');
  const [error, setError] = useState('');

  const filteredUsers = users.filter((u) => u.role === selectedRole);

  const handleSelectUser = (userId: string) => {
    login(userId);
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentCode || !agentCode.trim()) {
      setError('කරුණාකර Agent Code ඇතුළත් කරන්න');
      return;
    }
    const cleanInput = agentCode.trim().toLowerCase();
    const found = users.find(
      (u) =>
        (u.agentCode && u.agentCode.trim().toLowerCase() === cleanInput) ||
        (u.employeeId && u.employeeId.trim().toLowerCase() === cleanInput) ||
        (u.id && u.id.toLowerCase() === cleanInput)
    );
    if (found) {
      login(found.id);
    } else {
      setError('වලංගු නොවන Agent Code හෝ Employee ID එකකි.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <DdWorldLogo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">DD WORLD MARKETING</h1>
          <p className="text-xs text-slate-400 font-medium">
            ශ්‍රී ලංකාවේ අංක 1 කෘෂි, කාලගුණ හා සේවා උපදේශන සහ GPS Live Tracking පද්ධතිය
          </p>
        </div>

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

        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            පහත ගිණුමක් තෝරන්න (Select Account)
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => handleSelectUser(u.id)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-amber-500/50 text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {u.name.substring(0, 1)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                      {u.name}
                    </h3>
                    <p className="text-xs text-slate-400">Code: {u.agentCode} {u.designation ? `• ${u.designation}` : ''}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleManualLogin} className="space-y-3 pt-4 border-t border-slate-800">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Agent Code මගින් පිවිසෙන්න
          </p>
          {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">{error}</div>}
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Agent Code (e.g. 1001, 8811)"
              value={agentCode}
              onChange={(e) => setAgentCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <UserCheck className="w-4 h-4" />
            පිවිසෙන්න (Login)
          </button>
        </form>
      </div>
    </div>
  );
};
