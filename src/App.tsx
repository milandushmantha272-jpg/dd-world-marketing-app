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
import { AttendancePage } from './components/common/AttendancePage';
import { MessageRoomPage } from './components/common/MessageRoomPage';
import CommissionPaymentPage from './components/common/CommissionPaymentPage';
import { OwnerCommissionControl } from './components/owner/OwnerCommissionControl';
import { CallNotificationModal } from './components/common/CallNotificationModal';
import { ActiveCallOverlay } from './components/common/ActiveCallOverlay';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DialogLiaisonHub } from './components/common/DialogLiaisonHub';
import { DialogOfficerPortal } from './components/common/DialogOfficerPortal';
import { OwnerDialogOfficerMessenger } from './components/common/OwnerDialogOfficerMessenger';
import { WeeklySalesSheetWorkflow } from './components/common/WeeklySalesSheetWorkflow';
import { MainNavigation } from './components/common/MainNavigation';
import { safeStorage } from './utils/safeStorage';

const GlobalCallContainer: React.FC = () => {
  const { currentUser } = useAuth();
  const { activeCall, acceptCall, rejectCall, endCall } = useData();
  if (!activeCall || !currentUser) return null;
  if (activeCall.status === 'ringing') {
    const isReceiver = activeCall.receiverId === currentUser.id;
    const isCaller = activeCall.callerId === currentUser.id;
    if (isReceiver) return <CallNotificationModal isCaller={false} callerName={activeCall.callerName} callerRole={activeCall.callerRole} receiverName={activeCall.receiverName} callType={activeCall.type} onAccept={acceptCall} onReject={rejectCall} />;
    if (isCaller) return <CallNotificationModal isCaller={true} callerName={activeCall.callerName} callerRole={activeCall.callerRole} receiverName={activeCall.receiverName} callType={activeCall.type} onAccept={acceptCall} onReject={endCall} />;
  }
  if (activeCall.status === 'connected') {
    const isParticipant = activeCall.callerId === currentUser.id || activeCall.receiverId === currentUser.id;
    if (isParticipant) return <ActiveCallOverlay />;
  }
  return null;
};

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const { dataError, retryData } = useData();
  const [updateNotice, setUpdateNotice] = React.useState<string | null>(null);
  const [standalonePage, setStandalonePage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onNavigate = (event: Event) => {
      const page = (event as CustomEvent<{ page?: string }>).detail?.page || '';
      if (page === 'Attendance' || page === 'Work & Attendance') setStandalonePage('Attendance');
      else if (page === 'Message Room') setStandalonePage('Message Room');
      else if (page === 'Commission / Payment') setStandalonePage('Commission / Payment');
      else if (page === 'Home') setStandalonePage(null);
    };
    window.addEventListener('ddworld:navigate', onNavigate);
    return () => window.removeEventListener('ddworld:navigate', onNavigate);
  }, []);

  React.useEffect(() => {
    try {
      const APP_VERSION = '2026.8.07-v5.4';
      const storedVersion = safeStorage.getItem('ddworld_platform_app_version');
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('ref') || urlParams.has('v') || urlParams.has('chat') || urlParams.has('open') || urlParams.has('old_link')) {
        window.history.replaceState({}, document.title, window.location.pathname);
        setUpdateNotice('Direct Web/Chat Landing අත්හිටුවා ඇත: DD WORLD Official Mobile App Portal එක වෙත යොමු කෙරිණි!');
        setTimeout(() => setUpdateNotice(null), 6000);
      } else if (storedVersion !== APP_VERSION) {
        safeStorage.setItem('ddworld_platform_app_version', APP_VERSION);
        setUpdateNotice('DD WORLD පද්ධතිය නවතම Mobile App (v5.4) එක සමඟ Synchronize විය!');
        setTimeout(() => setUpdateNotice(null), 5000);
      }
    } catch (e) { console.warn('App version check sync error:', e); }
  }, []);

  React.useEffect(() => {
    if (currentUser) {
      if ('geolocation' in navigator) navigator.geolocation.getCurrentPosition((pos) => console.log('GPS Location permission auto-acquired:', pos.coords.latitude, pos.coords.longitude), (err) => console.warn('GPS Permission pending or denied:', err.message), { enableHighAccuracy: true });
      if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    }
  }, [currentUser]);

  if (!currentUser) return <LoginModal />;

  if (dataError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl">
          <div className="text-2xl font-extrabold mb-2">DD WORLD data connection</div>
          <p className="text-sm text-slate-300 leading-6">{dataError}</p>
          <button type="button" onClick={retryData} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500 active:scale-[0.99]">Retry</button>
        </div>
      </div>
    );
  }

  if (currentUser.role === 'dialog_officer' && standalonePage !== 'Commission / Payment') return <><DialogOfficerPortal /><WeeklySalesSheetWorkflow /><OfflineIndicator /></>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans relative">
      <Navbar />
      {updateNotice && <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 text-white text-xs font-bold py-2 px-4 text-center shadow-lg flex items-center justify-center gap-2 animate-pulse border-b border-white/20 z-50"><span>{updateNotice}</span><button onClick={() => setUpdateNotice(null)} className="ml-2 text-white/80 hover:text-white text-sm font-extrabold">✕</button></div>}
      <main className="flex-1 pb-24">
        {standalonePage === 'Attendance' ? <AttendancePage /> : standalonePage === 'Message Room' ? <MessageRoomPage /> : standalonePage === 'Commission / Payment' ? <CommissionPaymentPage /> : <>
          {currentUser.role === 'owner' && <OwnerDashboard />}
          {currentUser.role === 'team_leader' && <TeamLeaderDashboard />}
          {currentUser.role === 'agent' && <AgentDashboard />}
        </>}
        {currentUser.role === 'owner' && <div className="mx-auto max-w-7xl px-4 md:px-6 pb-6"><OwnerCommissionControl /></div>}
        <WeeklySalesSheetWorkflow />
      </main>
      <DialogLiaisonHub />
      <OwnerDialogOfficerMessenger />
      <GlobalCallContainer />
      <MainNavigation />
      <OfflineIndicator />
    </div>
  );
};

export default function App() {
  return <DataProvider><AuthProvider><AppContent /></AuthProvider></DataProvider>;
}