import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getApp } from 'firebase/app';
import { UserCheck, KeyRound, LogIn, Lock } from 'lucide-react';
import { UserRole } from '../types';
import { DdWorldLogo } from './common/DdWorldLogo';

export const LoginModal: React.FC = () => {
  const { login } = useAuth(); 
  const { users } = useData();  
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
  const [agentCode, setAgentCode] = useState('');
  const [secretPin, setSecretPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // GOOGLE SIGN-IN FOR OWNER (FIREBASE AI RECOMMENDED CODES)
  const handleGoogleOwnerLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      const app = getApp();
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      
      // Google Popup එක විවෘත කිරීම
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user.email?.toLowerCase() === 'milandushmantha272@gmail.com') {
        // Owner Email එක හරියටම ගැලපේ නම් ප්‍රධාන පද්ධතියට ලොග් කරවීම
        await login(user.email, "GOOGLE_AUTH_VERIFIED");
      } else {
        setError('අවසර නැත: මෙය පද්ධතියේ හිමිකරුගේ (Owner) Google ගිණුම නොවේ!');
      }
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setError('Google ගිණුම හරහා ලොග් වීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setIsLoading(false);
    }
  };

  // EMPLOYEES (AGENTS / LEADERS) LOGIN LOGIC VIA SECURE PIN
  const handleEmployeeLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (!agentCode.trim() || !secretPin.trim()) {
        setError('කරුණාකර ඔබගේ Code එක සහ රහස් PIN අංකය ඇතුළත් කරන්න.');
        setIsLoading(false);
        return;
      }

      const cleanInputCode = agentCode.trim().toLowerCase();
      const foundUser = users.find(
        (u) =>
          u.role === selectedRole &&
          ((u.agentCode && u.agentCode.trim().toLowerCase() === cleanInputCode) ||
           (u.employeeId && u.employeeId.trim().toLowerCase() === cleanInputCode))
      );

      if (!foundUser) {
        setError('ඇතුළත් කළ Code එකට අදාළ සේවකයෙකු හමු නොවීය.');
        setIsLoading(false);
        return;
      }

      const userSavedPin = foundUser.secretPin || foundUser.password;
      
      if (userSavedPin && userSavedPin.trim() === secretPin.trim()) {
        await login(foundUser.email, secretPin.trim());
      } else {
        setError('ඇතුළත් කළ රහස් PIN අංකය (Secret PIN) වැරදියි!');
      }
    } catch (err: any) {
      setError(err.message || 'ලොග් වීමට නොහැකි විය.');
    } finally {
      setIsLoading(false);
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

        {/* TABS SELECTION */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => { setSelectedRole('owner'); setError(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'owner' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Owner / Admin
          </button>
          <button
            onClick={() => { setSelectedRole('team_leader'); setError(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'team_leader' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Team Leader
          </button>
          <button
            onClick={() => { setSelectedRole('agent'); setError(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              selectedRole === 'agent' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Field Agent
          </button>
        </div>

        <div className="space-y-4 pt-2">
          {error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
              {error}
            </div>
          )}

          {selectedRole === 'owner' ? (
            /* OWNER GOOGLE SIGN IN SECURE BUTTON */
            <div className="space-y-4 py-4 text-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Owner ආරක්ෂිත ගූගල් ප්‍රවේශය
              </p>
              <button
                onClick={handleGoogleOwnerLogin}
                disabled={isLoading}
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 border border-slate-200"
              >
                <LogIn className="w-5 h-5 text-red-500" />
                {isLoading ? 'සම්බන්ධ වෙමින්...' : 'Sign in with Google (Owner)'}
              </button>
              <p className="text-[11px] text-slate-500">
                * ඔබගේ නිල milandushmantha272@gmail.com ගිණුම තෝරා ඇතුල් වන්න.
              </p>
            </div>
          ) : (
            /* EMPLOYEES SECURE FORM */
            <form onSubmit={handleEmployeeLoginSubmit} className="space-y-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                සේවක ආරක්ෂිත පිවිසුම
              </p>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder={selectedRole === 'team_leader' ? "Team Leader Code" : "Agent Code"}
                  value={agentCode}
                  onChange={(e) => setAgentCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="password"
                  placeholder="රහස් PIN අංකය (Secret PIN)"
                  value={secretPin}
                  onChange={(e) => setSecretPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm py-2.5 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                {isLoading ? 'පරීක්ෂා කරමින්...' : 'පිවිසෙන්න (Secure Login)'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
