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
import { IvrAndAppActivationsHub } from './components/owner/IvrAndAppActivationsHub';
import { AttendancePage } from './components/common/AttendancePage';
import { MessageRoomPage } from './components/common/MessageRoomPage';
import CommissionPaymentPage from './components/common/CommissionPaymentPage';
import { SalesSummaryPage } from './components/common/SalesSummaryPage';
import { DigitalEmployeeIdCard } from './components/common/DigitalEmployeeIdCard';
import { PersonalProfileKycPage } from './components/common/PersonalProfileKycPage';
import { NewAgentJoinRequirementsPage } from './components/common/NewAgentJoinRequirementsPage';
import { MonthEndPresentationPage } from './components/common/MonthEndPresentationPage';
import { NotificationCenter } from './components/common/NotificationCenter';
import { OwnerCommissionControl } from './components/owner/OwnerCommissionControl';
import { CallNotificationModal } from './components/common/CallNotificationModal';
import { ActiveCallOverlay } from './components/common/ActiveCallOverlay';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DialogLiaisonHub } from './components/common/DialogLiaisonHub';
import { OwnerDialogOfficerMessenger } from './components/common/OwnerDialogOfficerMessenger';
import { WeeklySalesSheetWorkflow } from './components/common/WeeklySalesSheetWorkflow';
import { MainNavigation } from './components/common/MainNavigation';
import { HomePage } from './components/common/HomePage';
import { DataRetentionCenter } from './components/owner/DataRetentionCenter';
import { OwnerCareerManagementPage } from './components/owner/OwnerCareerManagementPage';
import { OwnerUserAccessManagementPage } from './components/owner/OwnerUserAccessManagementPage';
import { RealDialPadPage } from './components/common/RealDialPadPage';
import { safeStorage } from './utils/safeStorage';
import { ResetPasswordPage } from './components/ResetPasswordPage';

const PromotionItemsPage: React.FC = () => (
  <section className="dd-page-shell min-h-screen px-4 py-5 md:px-6 md:py-8">
    <div className="mx-auto w-full max-w-7xl">
      <div className="dd-card rounded-[26px] p-5 md:p-7">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">DD WORLD OFFICIAL</div>
        <h1 className="mt-2 text-2xl font-black text-white">Page 8 — Promotion Items</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">Promotion requests are handled through the existing controlled workflow: Agent → Team Leader → Owner → Dialog.</p>
      </div>
      <div className="mt-5"><DialogLiaisonHub /></div>
    </div>
  </section>
);

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
      if (page === 'Home') { setStandalonePage(null); setShowHome(true); window.scrollTo({ top: 0, behavior: 'auto' }); return; }
      setShowHome(false);
      if (page === 'Page 1 — ID') setStandalonePage('ID');
      else if (page === 'Page 2 — Attendance' || page === 'Attendance' || page === 'Work & Attendance') setStandalonePage('Attendance');
      else if (page === 'Page 3 — Sales Activation') setStandalonePage('Sales Activation');
      else if (page === 'Page 4 — Sales Summary / Reports') setStandalonePage('Sales Summary / Reports');
      else if (page === 'Page 5 — Message Room') setStandalonePage('Message Room');
      else if (page === 'Page 6 — Details Submit / ID Requirements') setStandalonePage('Details Submit / ID Requirements');
      else if (page === 'Page 7 — Commission / Payment') setStandalonePage('Commission / Payment');
      else if (page === 'Page 8 — Promotion Items') setStandalonePage('Promotion Items');
      else if (page === 'Page 9 — New Agent Join (Requirements)') setStandalonePage('New Agent Join (Requirements)');
      else if (page === 'Page 10 — Month-End Presentation') setStandalonePage('Month-End Presentation');
      else if (page === 'Page 11 — Real Dial Pad') setStandalonePage('Real Dial Pad');
      else if (page === 'Owner — Data Retention & History') setStandalonePage('Data Retention & History');
      else if (page === 'Owner — Career & Team Management') setStandalonePage('Career & Team Management');
      else if (page === 'Owner — User & Access Control') setStandalonePage('User & Access Control');
      else setStandalonePage(null);
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('ddworld:navigate', onNavigate);
    return () => window.removeEventListener('ddworld:navigate', onNavigate);
  }, []);

  React.useEffect(() => {
    try {
      const APP_VERSION = '2026.9.24-v6.0-ussd-native-ui';
      const storedVersion = safeStorage.getItem('ddworld_platform_app_version');
      if (storedVersion !== APP_VERSION) { safeStorage.setItem('ddworld_platform_app_version', APP_VERSION); setUpdateNotice('DD WORLD Official App updated.'); setTimeout(() => setUpdateNotice(null), 3500); }
    } catch (e) { console.warn('App version check sync error:', e); }
  }, []);

  React.useEffect(() => {
    if (currentUser && 'geolocation' in navigator) navigator.geolocation.getCurrentPosition((pos) => console.log('GPS location available:', pos.coords.latitude, pos.coords.longitude), (err) => console.warn('GPS permission pending or denied:', err.message), { enableHighAccuracy: true });
  }, [currentUser]);

  // This hook must run on every render. Previously it was below the
  // !currentUser early return, so TEST MODE changed the hook count and React
  // threw minified error #310 ("Rendered more hooks than during the previous render").
  React.useEffect(() => {
    if (!currentUser || !standalonePage) return;
    const allowedStandalone = currentUser.role === 'owner'
      ? ['ID','Attendance','Sales Activation','Sales Summary / Reports','Message Room','Details Submit / ID Requirements','Commission / Payment','Promotion Items','New Agent Join (Requirements)','Month-End Presentation','Real Dial Pad','Data Retention & History','Career & Team Management','User & Access Control']
      : ['ID','Attendance','Sales Activation','Sales Summary / Reports','Message Room','Details Submit / ID Requirements','Commission / Payment','Promotion Items','New Agent Join (Requirements)','Month-End Presentation','Real Dial Pad'];
    if (!allowedStandalone.includes(standalonePage)) { setStandalonePage(null); setShowHome(true); }
  }, [currentUser, standalonePage]);

  if (!currentUser) return <LoginModal />;
  if (dataError) return <div className="dd-page-shell min-h-screen text-white flex items-center justify-center p-6"><div className="dd-card w-full max-w-lg p-6"><div className="text-2xl font-extrabold mb-2">DD WORLD data connection</div><p className="text-sm text-slate-300 leading-6">{dataError}</p><button type="button" onClick={retryData} className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 font-bold hover:bg-blue-500">Retry</button></div></div>;

  const isOwner = currentUser.role === 'owner';
  const isPromotionPage = standalonePage === 'Promotion Items';

  return <div className="dd-compact-ui min-h-screen bg-transparent flex flex-col font-sans relative">
    <Navbar />
    <NotificationCenter />
    {updateNotice && <div className="dd-header text-white text-xs font-bold py-2 px-4 text-center shadow-lg z-50">{updateNotice}</div>}
    <main className="flex-1 pb-20">
      {!standalonePage && showHome ? <HomePage />
        : standalonePage === 'ID' ? <div className="mx-auto w-full max-w-6xl px-4 py-6"><DigitalEmployeeIdCard /></div>
        : standalonePage === 'Attendance' ? <AttendancePage />
        : standalonePage === 'Sales Activation' ? <IvrAndAppActivationsHub currentUser={currentUser} />
        : standalonePage === 'Sales Summary / Reports' ? <SalesSummaryPage />
        : standalonePage === 'Message Room' ? <MessageRoomPage />
        : standalonePage === 'Details Submit / ID Requirements' ? <div className="mx-auto w-full max-w-7xl px-4 py-6"><PersonalProfileKycPage /></div>
        : standalonePage === 'Commission / Payment' ? <CommissionPaymentPage />
        : standalonePage === 'Promotion Items' ? <PromotionItemsPage />
        : standalonePage === 'New Agent Join (Requirements)' ? <NewAgentJoinRequirementsPage />
        : standalonePage === 'Month-End Presentation' ? <MonthEndPresentationPage />
        : standalonePage === 'Real Dial Pad' ? <RealDialPadPage />
        : standalonePage === 'Data Retention & History' ? <DataRetentionCenter />
        : standalonePage === 'Career & Team Management' ? <OwnerCareerManagementPage />
        : standalonePage === 'User & Access Control' ? <OwnerUserAccessManagementPage />
        : <>{currentUser.role === 'owner' && <OwnerDashboard />}{(currentUser.role === 'team_leader' || currentUser.role === 'junior_team_leader') && <TeamLeaderDashboard />}{currentUser.role === 'agent' && <AgentDashboard />}</>}
      {currentUser.role === 'owner' && <div className="mx-auto max-w-7xl px-4 md:px-6 pb-6"><OwnerCommissionControl /></div>}
      <WeeklySalesSheetWorkflow />
    </main>
    {!isPromotionPage && <DialogLiaisonHub />}
    <OwnerDialogOfficerMessenger />
    <GlobalCallContainer />
    <MainNavigation />
    <OfflineIndicator />
  </div>;
};

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname === '/reset-password') return <ResetPasswordPage />;
  return <DataProvider><AuthProvider><AppContent /></AuthProvider></DataProvider>;
}
