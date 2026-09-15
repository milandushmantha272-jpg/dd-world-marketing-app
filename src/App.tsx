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
import { SalesSummaryPage } from './components/common/SalesSummaryPage';
import { OwnerCommissionControl } from './components/owner/OwnerCommissionControl';
import { CallNotificationModal } from './components/common/CallNotificationModal';
import { ActiveCallOverlay } from './components/common/ActiveCallOverlay';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DialogLiaisonHub } from './components/common/DialogLiaisonHub';
import { OwnerDialogOfficerMessenger } from './components/common/OwnerDialogOfficerMessenger';
import { WeeklySalesSheetWorkflow } from './components/common/WeeklySalesSheetWorkflow';
import { MainNavigation } from './components/common/MainNavigation';
import { HomePage } from './components/common/HomePage';
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
  const [showHome, setShowHome] = React.useState(true);

  React.useEffect(() => {
    const onNavigate = (event: Event) => {
      const page = (event as CustomEvent<{ page?: string }>).detail?.page || '';
      if (page === 'Home') { setStandalonePage(null); setShowHome(true); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      setShowHome(false);
      if (page === 'Page 2 — Attendance' || page === 'Attendance' || page === 'Work & Attendance') setStandalonePage('Attendance');
      else if (page === 'Page 4 — Sales Summary / Reports') setStandalonePage('Sales Summary / Reports');
      else if (page === 'Page 5 — Message Room') setStandalonePage('Message Room');
      else if (page === 'Page 7 — Commission / Payment') setStandalonePage('Commission / Payment');
      else setStandalonePage(null);
    };
    window.addEventListener('ddworld:navigate', onNavigate);
    return () => window.removeEventListener('ddworld:navigate', onNavigate);
  }, []);

  React.useEffect(() => {
    try {
      const APP_VERSION = '2026.8.07-v5.5';
      const storedVersion = safeStorage.getItem('ddworld_platform_app_version');
      if (storedVersion !== APP_VERSION) { safeStorage.setItem('ddworld_platform_app_version', APP_VERSION); setUpdateNotice('DD WORLD Official App updated.'); setTimeout(() => setUpdateNotice(null), 3500); }
    } catch (e) { console.warn('App version check sync error:', e); }
  }, []);

  React.useEffect(() => {
    if (currentUser && 'geolocation' in navigator) navigator.geolocation.getCurrentPosition((pos) => console.log('GPS location available:', pos.coords.latitude, pos.coords.longitude), (err) => console.warn('GPS permission pending or denied:', err.message), { enableHighAccuracy: true });
  }, [currentUser]);

  if (!currentUser) return <LoginModal />;
  if (dataError) return <div className="dd-page-shell min-h-screen text-white flex items-center justify-center p-6"><div className="dd-card w-full max-w-lg p-6"><div className="text-2xl font-extrabold mb-2">DD WORLD data connection</div><p className="text-sm text-slate-300 leading-6">{dataError}</p><button type="button" onClick={retryData} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500">Retry</button></div></div>;

  return <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans relative">
    <Navbar />
    {updateNotice && <div className="dd-header text-white text-xs font-bold py-2 px-4 text-center shadow-lg z-50">{updateNotice}</div>}
    <main className="flex-1 pb-20">
      {!standalonePage && showHome ? <HomePage /> : standalonePage === 'Attendance' ? <AttendancePage /> : standalonePage === 'Message Room' ? <MessageRoomPage /> : standalonePage === 'Commission / Payment' ? <CommissionPaymentPage /> : standalonePage === 'Sales Summary / Reports' ? <SalesSummaryPage /> : <>
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
  </div>;
};

export default function App() { return <DataProvider><AuthProvider><AppContent /></AuthProvider></DataProvider>; }
