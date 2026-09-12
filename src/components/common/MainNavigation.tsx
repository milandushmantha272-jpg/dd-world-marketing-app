import React, { useMemo, useState } from 'react';
import { Home, Menu, X, Briefcase, BarChart3, MapPin, Target, Wallet, Inbox, UserRound, ShieldCheck, Users, CalendarCheck, FileText, Building2, Radio, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type NavItem = { label: string; keywords: string[]; icon: React.ReactNode };

const findAndClickTab = (keywords: string[]) => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  const match = buttons.find((button) => {
    const text = (button.innerText || button.getAttribute('aria-label') || button.title || '').toLowerCase();
    return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });
  if (match) {
    match.click();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return true;
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
  return false;
};

export const MainNavigation: React.FC = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);

  const items = useMemo<NavItem[]>(() => {
    if (currentUser?.role === 'owner') {
      return [
        { label: 'Dashboard', keywords: ['Dashboard', 'Overview'], icon: <Home /> },
        { label: 'Employees', keywords: ['Employees', 'Employee Status', 'Employee'], icon: <Users /> },
        { label: 'Teams', keywords: ['Teams', 'Team'], icon: <Users /> },
        { label: 'Sales', keywords: ['All Sales', 'Sales'], icon: <BarChart3 /> },
        { label: 'Attendance', keywords: ['Attendance'], icon: <CalendarCheck /> },
        { label: 'GPS / Live Control', keywords: ['GPS', 'Live Control'], icon: <MapPin /> },
        { label: 'Fraud & Security', keywords: ['Fraud', 'Security'], icon: <ShieldCheck /> },
        { label: 'Payments', keywords: ['Payment', 'Payments'], icon: <Wallet /> },
        { label: 'Reports', keywords: ['Reports', 'Report'], icon: <FileText /> },
        { label: 'Daily Top 3', keywords: ['Daily Achievement', 'Top 3', 'Achievement'], icon: <Trophy /> },
        { label: 'Company Settings', keywords: ['Company Settings', 'Company Brand'], icon: <Building2 /> },
        { label: 'Messages', keywords: ['Company Messages', 'Messages', 'Chat'], icon: <Inbox /> },
      ];
    }
    if (currentUser?.role === 'team_leader') {
      return [
        { label: 'Home / Dashboard', keywords: ['Dashboard', 'Attendance'], icon: <Home /> },
        { label: 'My Team', keywords: ['Team Agents', 'My Team', 'Team'], icon: <Users /> },
        { label: 'Sales', keywords: ['Sales'], icon: <BarChart3 /> },
        { label: 'Attendance', keywords: ['Attendance'], icon: <CalendarCheck /> },
        { label: 'GPS', keywords: ['GPS'], icon: <MapPin /> },
        { label: 'Performance', keywords: ['Performance', 'Target'], icon: <Target /> },
        { label: 'Payments', keywords: ['Payment'], icon: <Wallet /> },
        { label: 'Reports', keywords: ['Reports', 'Report'], icon: <FileText /> },
        { label: 'Messages', keywords: ['Company Messages', 'Messages', 'Chat'], icon: <Inbox /> },
      ];
    }
    return [
      { label: 'Home / Dashboard', keywords: ['Dashboard', 'Attendance'], icon: <Home /> },
      { label: 'Work & Attendance', keywords: ['Attendance', 'Work Area', 'Start Work'], icon: <Briefcase /> },
      { label: 'Sales', keywords: ['Sales'], icon: <BarChart3 /> },
      { label: 'GPS', keywords: ['GPS'], icon: <MapPin /> },
      { label: 'Performance', keywords: ['Performance', 'Target'], icon: <Target /> },
      { label: 'Payments', keywords: ['Payment'], icon: <Wallet /> },
      { label: 'Inbox & Messages', keywords: ['Company Messages', 'Messages', 'Inbox', 'Chat'], icon: <Inbox /> },
      { label: 'My ID', keywords: ['Digital ID', 'ID Card'], icon: <UserRound /> },
      { label: 'Meetings', keywords: ['Meetings', 'Meeting'], icon: <Radio /> },
      { label: 'Security', keywords: ['Security'], icon: <ShieldCheck /> },
    ];
  }, [currentUser?.role]);

  if (!currentUser) return null;

  const goHome = () => {
    setOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'home' } }));
  };

  const goTo = (item: NavItem) => {
    setOpen(false);
    findAndClickTab(item.keywords);
  };

  return (
    <>
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 p-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700 shadow-2xl shadow-black/40">
        <button onClick={goHome} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition" aria-label="Home">
          <Home className="w-4 h-4" /> <span>Home</span>
        </button>
        <button onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition" aria-label="Open menu">
          {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />} <span>Menu</span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[55] bg-slate-950/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-3xl max-h-[78vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-400 font-black">DD WORLD OFFICIAL PORTAL</p>
                <h2 className="text-xl font-extrabold text-white">{currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'team_leader' ? 'Team Leader' : 'Agent'} Menu</h2>
                <p className="text-xs text-slate-400 mt-1">Touch a box to open the relevant page.</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700" aria-label="Close menu"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => (
                <button key={item.label} onClick={() => goTo(item)} className="group min-h-24 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 hover:border-emerald-500/50 p-4 text-left transition active:scale-[0.98]">
                  <div className="w-10 h-10 rounded-xl bg-slate-950/70 border border-slate-700 flex items-center justify-center text-emerald-400 mb-3 group-hover:text-emerald-300">{React.cloneElement(item.icon as React.ReactElement, { className: 'w-5 h-5' })}</div>
                  <span className="block text-sm font-bold text-white">{item.label}</span>
                  <span className="text-[10px] text-slate-400">Open page →</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
