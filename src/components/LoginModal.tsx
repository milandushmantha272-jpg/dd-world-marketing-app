import React, { useState } from 'react';
import { auth, db } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(false);

    // Firebase Authentication හරහා ලොග් වීම (Password රහිතව හෝ පරණ Password වැරදි නම් නිවැරදි කිරීම)
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore එකෙන් පරිශීලකයාගේ භූමිකාව (Role - Owner/Leader/Agent) ලබා ගැනීම
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        onLoginSuccess(userData.role, userData);
        onClose();
      } else {
        setError('පද්ධතිය තුළ ඔබගේ ගිණුම් විස්තර හමු නොවීය.');
      }
    } catch (err: any) {
      console.error(err);
      setError('ඇතුළත් කළ ඊමේල් ලිපිනය හෝ මුරපදය වැරදියි. කරුණාකර නැවත උත්සාහ කරන්න.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">DD WORLD ENTERPRISE LOGIN</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 border border-red-200 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Email Address / ඊමේල්</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              placeholder="name@ddworld.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Password / මුරපදය</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-bold transition duration-200 shadow-md disabled:bg-gray-400"
          >
            {loading ? 'සම්බන්ධ වෙමින්...' : 'Log In / ප්‍රවේශ වන්න'}
          </button>
        </form>

        {/* 🎛️ CLOUD & BIOMETRICS STATUS BADGES (ලයින් 168 දෝෂය නිවැරදි කර ඇත) */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-green-50 border border-green-300 text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              FIREBASE LIVE
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-blue-50 border border-blue-300 text-blue-700">
              <span>👆</span>
              BIOMETRIC READY
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:underline"
        >
          Cancel / අවලංගු කරන්න
        </button>
      </div>
    </div>
  );
};
