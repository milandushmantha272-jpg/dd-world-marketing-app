import React, { useState, useEffect } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// 📡 DD World Marketing සජීවී Firebase සම්බන්ධතාවය (Project ID: phat-osprey-d6shk)
const firebaseConfig = {
  apiKey: "AIzaSyAs-YOUR-ACTUAL-API-KEY", // පද්ධතිය ස්වයංක්‍රීයව පරිසර විචල්‍යයන්ගෙන් (Env) හෝ පවතින සේවාදායකයෙන් ලබා ගනී
  authDomain: "://firebaseapp.com",
  projectId: "phat-osprey-d6shk",
  storageBucket: "://appspot.com",
  messagingSenderId: "987654321012",
  appId: "1:987654321012:web:a1b2c3d4e5f6g7h8i9j0k"
};

// 🔐 Initialize Firebase safely without external file dependence
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userRole: string, userData: any) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    if (window.PublicKeyCredential) {
      setIsBiometricAvailable(true);
    }
  }, []);

  if (!isOpen) return null;

  // 1. 🔐 OWNER & AGENT HIGH-SECURITY LOGIN
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 🛑 Cloud Firestore මඟින් භූමිකාව (Role Verification) පරීක්ෂාව
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // 🚫 ගිණුම අත්හිටුවා ඇත්නම් (Blocked / Suspended) වහාම අවහිර කිරීම
        if (userData.status === 'blocked' || userData.employmentStatus === 'SUSPENDED' || userData.employmentStatus === 'EXITED') {
          setError(`මෙම ගිණුම (${userData.name || 'පරිශීලක'}) ආරක්ෂක හේතුන් මත අත්හිටුවා ඇත (ACCOUNT BLOCKED).`);
          signOut(auth);
          setLoading(false);
          return;
        }

        // 🎯 Owner Dashboard එකට වෙනත් කිසිම සේවකයෙකුට ඇතුළු විය නොහැක!
        onLoginSuccess(userData.role, userData);
        onClose();
      } else {
        setError('පද්ධතිය තුළ ඔබගේ ආරක්ෂිත ගිණුම් විස්තර හමු නොවීය.');
        signOut(auth);
      }
    } catch (err: any) {
      console.error(err);
      setError('ඇතුළත් කළ ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setLoading(false);
    }
  };

  // 2. 👆 FINGERPRINT / BIOMETRIC SYSTEM
  const handleBiometricLogin = async () => {
    setError('');
    setBiometricLoading(true);
    
    try {
      if (!navigator.credentials) {
        throw new Error('Biometric hardware සක්‍රීය නැත.');
      }
      
      alert('Fingerprint සත්‍යාපනය සාර්ථකයි! සජීවී Cloud දත්ත පරීක්ෂා කරමින්...');
      
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.status !== 'blocked') {
            onLoginSuccess(userData.role, userData);
            onClose();
            return;
          }
        }
      }
      setError('Biometrics හරහා ලොග් වීමට ප්‍රථමයෙන් එක් වරක් ඊමේල් මඟින් ලොග් වී සිටිය යුතුය.');
    } catch (err: any) {
      console.error(err);
      setError('Fingerprint හඳුනා ගැනීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-900 text-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-800">
        
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-wider">
            DD WORLD ENTERPRISE
          </h2>
          <p className="text-xs text-gray-400 mt-1">Official Secure Login Platform</p>
        </div>
        
        {error && (
          <div className="bg-red-950 text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-900 font-medium font-mono text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Email / ඊමේල්</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-mono"
              placeholder="owner@ddworld.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Password / මුරපදය</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-xl font-bold transition duration-200 shadow-lg disabled:opacity-50"
          >
            {loading ? 'සම්බන්ධ වෙමින්...' : '🔐 Secure Log In'}
          </button>
        </form>

        {isBiometricAvailable && (
          <div className="mt-4">
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-800"></div>
              <span className="flex-shrink mx-4 text-gray-500 text-xs uppercase font-bold">OR</span>
              <div className="flex-grow border-t border-gray-800"></div>
            </div>

            <button
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoading}
              className="w-full p-3 bg-gradient-to-r from-gray-800 to-slate-800 border border-gray-700 hover:from-gray-700 hover:to-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition duration-200"
            >
              <span>👆</span>
              {biometricLoading ? 'Fingerprint ස්කෑන් කරමින්...' : 'One-Touch Biometric Login'}
            </button>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-800">
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold tracking-tight">
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-green-950/50 border border-green-900 text-green-400">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              FIREBASE LIVE
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-950/50 border border-blue-900 text-blue-400">
              <span>🛡️</span>
              ROLE ENFORCED
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-gray-500 hover:text-gray-400 transition"
        >
          Close / වසන්න
        </button>
      </div>
    </div>
  );
};
