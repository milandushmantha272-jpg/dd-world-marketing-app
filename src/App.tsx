/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginModal } from './components/LoginModal';
import { OwnerDashboard } from './components/owner/OwnerDashboard';
import { TeamLeaderDashboard } from './components/leader/TeamLeaderDashboard';
import { AgentDashboard } from './components/agent/AgentDashboard';
import { CallNotificationModal } from './components/common/CallNotificationModal';
import { ActiveCallOverlay } from './components/common/ActiveCallOverlay';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { safeStorage } from './utils/safeStorage';
import { RoleLevel } from './types';

// ============================================================================
// FIREBASE CONFIGURATION INTEGRATION (CRITICAL FOR BLACK SCREEN FIX)
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAs7...", // <-- ඔබේ සැබෑ Firebase API Key එක මෙතැන තිබිය යුතුය
  authDomain: "://firebaseapp.com",
  projectId: "phat-osprey-d6shk",
  storageBucket: "://appspot.com",
  messagingSenderId: "777...",
  appId: "1:777..."
};

// ඇප් එක ඇතුළත Firebase ප්‍රධාන සම්බන්ධතාවය Initialize කිරීම
if (!getApps().length) {
  initializeApp(firebaseConfig);
}

// Global Call Container එක DataProvider එක ඇතුළත ක්‍රියාත්මක වන පරිදි සකසා ඇත
const GlobalCallContainer: React.FC = () => {
  const { currentUser } = useAuth();
  const dataContext = useData();

  // useData එකේ activeCall නොමැති නම් Crash වීම වැළැක්වීමට Safe Check එකක් දමා ඇත
  const activeCall = dataContext ? (dataContext as any).activeCall : null;
  const acceptCall = dataContext ? (dataContext as any).acceptCall : () => {};
  const rejectCall = dataContext ? (dataContext as any).rejectCall : () => {};
  const endCall = dataContext ? (dataContext as any).endCall : () => {};

  if (!activeCall || !currentUser) return null;

  if (activeCall.status === 'ringing') {
    const isReceiver = activeCall.receiverId === currentUser.uid;
    const isCaller = activeCall.callerId === currentUser.uid;

    if (isReceiver) {
      return (
        <CallNotificationModal
          isCaller={false}
          callerName={activeCall.callerName}
          callerRole={activeCall.callerRole}
          receiverName={activeCall.receiverName}
          callType={activeCall.type}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      );
    }

    if (isCaller) {
      return (
        <CallNotificationModal
          isCaller={true}
          callerName={activeCall.callerName}
          callerRole={activeCall.callerRole}
          receiverName={activeCall.receiverName}
          callType={activeCall.type}
          onAccept={acceptCall}
          onReject={endCall}
        />
      );
    }
  }

  if (activeCall.status === 'connected') {
    const isParticipant = activeCall.callerId === currentUser.uid || activeCall.receiverId === currentUser.uid;
    if (isParticipant) {
      return <ActiveCallOverlay />;
    }
  }

  return null;
};

const AppContent: React.FC = () => {
  const { currentUser, currentUserProfile } = useAuth();
  const [updateNotice, setUpdateNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const APP_VERSION = '2026.8.07-v5.3';
      const storedVersion = safeStorage.getItem('ddworld_platform_app_version');

      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('ref') || urlParams.has('v') || urlParams.has('chat') || urlParams.has('open') || urlParams.has('old_link')) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setUpdateNotice('🛑 Direct Web/Chat Landing අත්හිටුවා ඇත: DD WORLD Official Mobile App Portal එක වෙත යොමු කෙරිණි!');
        setTimeout(() => setUpdateNotice(null), 6000);
      } else if (storedVersion !== APP_VERSION) {
        safeStorage.setItem('ddworld_platform_app_version', APP_VERSION);
        setUpdateNotice('📱 DD WORLD පද්ධතිය නවතම Mobile App (v5.3) එක සමඟ Synchronize විය!');
        setTimeout(() => setUpdateNotice(null), 5000);
      }
    } catch (e) {
      console.warn('App version check sync error:', e);
    }
  }, []);

  React.useEffect(() => {
    if (currentUser) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            console.log('GPS Location permission auto-acquired:', pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            console.warn('GPS Permission pending or denied:', err.message);
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [currentUser]);

  // පරිශීලකයා ලොග් වී නොමැති නම් Secure Login එක පෙන්වීම
  if (!currentUser) {
    return <LoginModal />;
  }

  // Firestore එකෙන් ලැබෙන සැබෑ Role එක (OWNER / TEAM_SUPERVISOR / TRAINEE_AGENT) අනුව වෙන් කිරීම
  const userRole = currentUserProfile?.role;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar />

      {updateNotice && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-pulse border-b border-white/20 z-50">
          <span>{updateNotice}</span>
          <button onClick={() => setUpdateNotice(null)} className="ml-2 text-white/80 hover:text-white text-sm font-extrabold">✕</button>
        </div>
      )}

      <main className="flex-1 pb-16">
        {userRole === RoleLevel.OWNER && <OwnerDashboard />}
        {userRole === RoleLevel.TEAM_SUPERVISOR && <TeamLeaderDashboard />}
        {userRole === RoleLevel.TRAINEE_AGENT && <AgentDashboard />}
        
        {/* පැරණි string (කුඩා අකුරු) පරීක්ෂාවන්ද ආරක්ෂාව සඳහා ඉතිරි කර ඇත */}
        {!userRole && (currentUser as any).role === 'owner' && <OwnerDashboard />}
        {!userRole && (currentUser as any).role === 'team_leader' && <TeamLeaderDashboard />}
        {!userRole && (currentUser as any).role === 'agent' && <AgentDashboard />}
      </main>
      
      <GlobalCallContainer />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return (
    <DataProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </DataProvider>
  );
}
