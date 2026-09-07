/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
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

const GlobalCallContainer: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeCall, acceptCall, rejectCall, endCall } = useData();

  if (!activeCall || !currentUser) return null;

  if (activeCall.status === 'ringing') {
    const isReceiver = activeCall.receiverId === currentUser.id;
    const isCaller = activeCall.callerId === currentUser.id;

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
    const isParticipant = activeCall.callerId === currentUser.id || activeCall.receiverId === currentUser.id;
    if (isParticipant) {
      return <ActiveCallOverlay />;
    }
  }

  return null;
};

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [updateNotice, setUpdateNotice] = React.useState<string | null>(null);

  // Automatic Legacy Link Sync & Direct Web/Chat Landing Cleanup
  React.useEffect(() => {
    try {
      const APP_VERSION = '2026.8.07-v5.3';
      const storedVersion = safeStorage.getItem('ddworld_platform_app_version');

      // Strip query parameters to prevent direct chat/web landing via shared URLs
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

  // Automatic Device Permission Check (GPS Location & Notifications) on Login
  React.useEffect(() => {
    if (currentUser) {
      // 1. Request GPS Permission if available
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

      // 2. Request Notification Permission if supported
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [currentUser]);

  // If not logged in, strictly show login modal (No public registration allowed)
  if (!currentUser) {
    return <LoginModal />;
  }

  // Strictly render only the dashboard corresponding to the user's role
  // Even if URL or state changes, unauthorized views are blocked
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar />

      {/* Legacy Link Auto-Update Sync Banner */}
      {updateNotice && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-pulse border-b border-white/20 z-50">
          <span>{updateNotice}</span>
          <button
            onClick={() => setUpdateNotice(null)}
            className="ml-2 text-white/80 hover:text-white text-sm font-extrabold"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 pb-16">
        {currentUser.role === 'owner' && <OwnerDashboard />}
        {currentUser.role === 'team_leader' && <TeamLeaderDashboard />}
        {currentUser.role === 'agent' && <AgentDashboard />}
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

