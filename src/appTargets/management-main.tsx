import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Providers, TargetShell } from './shared';
import { useAuth } from '../context/AuthContext';
import { OwnerDashboardConsole } from '../components/owner/pages/OwnerDashboardConsole';
import { DailySummaryAnalyticsLedger } from '../components/owner/pages/DailySummaryAnalyticsLedger';
import { PerformanceOverviewPage } from '../components/owner/pages/PerformanceOverviewPage';
import { TeamLeaderDashboard } from '../components/leader/TeamLeaderDashboard';
import { MonthlyTargetPlanPage } from '../components/owner/pages/MonthlyTargetPlanPage';
import { AttendancePage } from '../components/common/AttendancePage';
import { IvrAndAppActivationsHub } from '../components/owner/IvrAndAppActivationsHub';
import { SalesSummaryPage } from '../components/common/SalesSummaryPage';
import { MessageRoomPage } from '../components/common/MessageRoomPage';
import { MonthEndPresentationPage } from '../components/common/MonthEndPresentationPage';
import { DataRetentionCenter } from '../components/owner/DataRetentionCenter';
import { AnnualArchivePage } from '../components/common/AnnualArchivePage';
import { OwnerCareerManagementPage } from '../components/owner/OwnerCareerManagementPage';
import { OwnerUserAccessManagementPage } from '../components/owner/OwnerUserAccessManagementPage';
import { AppDownloadStatusMonitor } from '../components/owner/AppDownloadStatusMonitor';
import { OwnerCommissionControl } from '../components/owner/OwnerCommissionControl';
import { Home, Target, CalendarCheck, BarChart3, Users, FileText, ShieldCheck, Smartphone, MessageSquare, Presentation, Database, Settings, LogOut, Wallet } from 'lucide-react';

type ManagementRoute =
  | 'dashboard' | 'performance' | 'daily-summary' | 'targets' | 'attendance' | 'sales'
  | 'teams' | 'reports' | 'employees' | 'devices' | 'messages' | 'presentation'
  | 'payments' | 'history' | 'settings';

type NavItem = { id: ManagementRoute; path: string; label: string; icon: React.ComponentType<{ className?: string }> };

const ownerNav: NavItem[] = [
  { id: 'dashboard', path: '/management/dashboard', label: 'Dashboard', icon: Home },
  { id: 'performance', path: '/management/performance', label: 'Performance View', icon: BarChart3 },
  { id: 'daily-summary', path: '/management/daily-summary', label: 'Daily Summary', icon: FileText },
  { id: 'targets', path: '/management/targets', label: 'Target Plan', icon: Target },
  { id: 'attendance', path: '/management/attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'sales', path: '/management/sales', label: 'Sales / Activation', icon: BarChart3 },
  { id: 'teams', path: '/management/teams', label: 'Teams', icon: Users },
  { id: 'reports', path: '/management/reports', label: 'Reports', icon: FileText },
  { id: 'employees', path: '/management/employees', label: 'Employee Access', icon: ShieldCheck },
  { id: 'devices', path: '/management/devices', label: 'App / Device', icon: Smartphone },
  { id: 'messages', path: '/management/messages', label: 'Messages / Meetings', icon: MessageSquare },
  { id: 'presentation', path: '/management/presentation', label: 'Presentation', icon: Presentation },
  { id: 'payments', path: '/management/payments', label: 'Payments', icon: Wallet },
  { id: 'history', path: '/management/history', label: 'History / Archive', icon: Database },
  { id: 'settings', path: '/management/settings', label: 'Settings', icon: Settings },
];

const leaderNav: NavItem[] = [
  { id: 'dashboard', path: '/management/dashboard', label: 'Dashboard', icon: Home },
  { id: 'targets', path: '/management/targets', label: 'Target / Performance', icon: Target },
  { id: 'attendance', path: '/management/attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'sales', path: '/management/sales', label: 'Team Sales', icon: BarChart3 },
  { id: 'reports', path: '/management/reports', label: 'Reports', icon: FileText },
  { id: 'messages', path: '/management/messages', label: 'Messages / Meetings', icon: MessageSquare },
  { id: 'settings', path: '/management/settings', label: 'Settings', icon: Settings },
];

const normalizePath = (path: string) => path.replace(/\/+$/, '') || '/management/dashboard';

const routeForPath = (path: string, isOwner: boolean): ManagementRoute => {
  const normalized = normalizePath(path);
  if (normalized === '/management/performance' && isOwner) return 'performance';
  if (normalized === '/management/daily-summary' && isOwner) return 'daily-summary';
  const found = [...ownerNav, ...leaderNav].find((item) => item.path === normalized);
  return (found?.id || 'dashboard') as ManagementRoute;
};

const pathForRoute = (route: ManagementRoute, nav: NavItem[]) => nav.find((item) => item.id === route)?.path || '/management/dashboard';

const SettingsPage: React.FC = () => {
  const { currentUser, logout } = useAuth();
  return (
    <section className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">DD WORLD CONTROL</div>
        <h2 className="mt-1 text-2xl font-black">Settings & Security</h2>
        <p className="mt-2 text-sm text-slate-500">Signed in as {currentUser?.name || currentUser?.email || 'User'} • Role: {currentUser?.role}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4"><b>Authorization</b><p className="mt-1 text-xs text-slate-500">Access is controlled by the installed-app target and Supabase role/status checks.</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <b>Account session</b><p className="mt-1 text-xs text-slate-500">Use logout to end this authenticated session on this device.</p>
          <button onClick={() => void logout()} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"><LogOut className="mr-1 inline h-4 w-4" />Log out</button>
        </div>
      </div>
    </section>
  );
};

export const ManagementAppShell: React.FC = () => {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const nav = useMemo(() => (isOwner ? ownerNav : leaderNav), [isOwner]);
  const [route, setRoute] = useState<ManagementRoute>('dashboard');

  useEffect(() => {
    const onPopState = () => setRoute(routeForPath(window.location.pathname, isOwner));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isOwner]);

  useEffect(() => {
    if (!currentUser) return;
    const requested = routeForPath(window.location.pathname, isOwner);
    const requestedPath = pathForRoute(requested, nav);
    if (window.location.pathname !== requestedPath) {
      window.history.replaceState({}, '', requestedPath);
    }
    setRoute(requested);
  }, [currentUser, isOwner, nav]);

  if (!currentUser) return null;

  const navigate = (nextPath: string) => {
    const nextRoute = routeForPath(nextPath, isOwner);
    window.history.pushState({}, '', nextPath);
    setRoute(nextRoute);
  };

  const renderScreen = () => {
    switch (route) {
      case 'dashboard': return isOwner ? <OwnerDashboardConsole /> : <TeamLeaderDashboard />;
      case 'performance': return isOwner ? <PerformanceOverviewPage /> : <TeamLeaderDashboard />;
      case 'daily-summary': return isOwner ? <DailySummaryAnalyticsLedger /> : <TeamLeaderDashboard />;
      case 'targets': return isOwner ? <MonthlyTargetPlanPage /> : <TeamLeaderDashboard />;
      case 'attendance': return <AttendancePage />;
      case 'sales': return isOwner ? <IvrAndAppActivationsHub currentUser={currentUser} /> : <SalesSummaryPage />;
      case 'teams': return isOwner ? <OwnerCareerManagementPage /> : <TeamLeaderDashboard />;
      case 'reports': return <SalesSummaryPage />;
      case 'employees': return isOwner ? <OwnerUserAccessManagementPage /> : <TeamLeaderDashboard />;
      case 'devices': return isOwner ? <AppDownloadStatusMonitor /> : <TeamLeaderDashboard />;
      case 'messages': return <MessageRoomPage />;
      case 'presentation': return isOwner ? <MonthEndPresentationPage /> : <TeamLeaderDashboard />;
      case 'payments': return isOwner ? <OwnerCommissionControl /> : <TeamLeaderDashboard />;
      case 'history': return isOwner ? <><DataRetentionCenter /><AnnualArchivePage role="owner" /></> : <TeamLeaderDashboard />;
      case 'settings': return <SettingsPage />;
      default: return isOwner ? <OwnerDashboardConsole /> : <TeamLeaderDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#14213d] pb-24">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.24em] text-slate-400">DD WORLD MARKETING</div>
              <h1 className="mt-1 text-lg font-black text-white">Corporate Operations Portal</h1>
              <p className="text-[11px] text-slate-300">{isOwner ? 'Owner Control • Workforce • Sales • Finance' : `Team Operations • ${currentUser.teamName || 'Assigned Team'}`}</p>
            </div>
            <span className="rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase text-white">{currentUser.role.replace(/_/g, ' ')}</span>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">System</div><div className="text-xs font-black text-white">Operational</div></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Access</div><div className="text-xs font-black text-white">Role Controlled</div></div>
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"><div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Workspace</div><div className="text-xs font-black text-white">{isOwner ? 'All Operations' : 'Team Scope'}</div></div>
          </div>
        </div>
      </header>

      <nav aria-label="Management navigation" className="mx-auto max-w-7xl px-3 pt-3">
        <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
          {nav.map(({ id, path, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => navigate(path)}
              aria-current={route === id ? 'page' : undefined}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-[11px] font-black flex items-center gap-1.5 ${route === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />{label}
            </button>
          ))}
        </div>
        <div className="md:hidden">
          <label htmlFor="management-route" className="sr-only">Open management section</label>
          <select
            id="management-route"
            value={route}
            onChange={(e) => navigate(pathForRoute(e.target.value as ManagementRoute, nav))}
            className="w-full min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 shadow-sm"
          >
            {nav.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-7xl px-3 py-4">
        <div key={route}>{renderScreen()}</div>
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <Providers>
    <TargetShell target="management">
      <ManagementAppShell />
    </TargetShell>
  </Providers>
);
