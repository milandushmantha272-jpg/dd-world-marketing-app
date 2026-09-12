import React, { useMemo, useState } from 'react';
import { Home, Menu, X, Briefcase, BarChart3, MapPin, Target, Wallet, Inbox, UserRound, ShieldCheck, Users, CalendarCheck, FileText, Building2, Radio, Trophy, MessageCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type NavItem = { label: string; keywords: string[]; icon: React.ElementType };

const activatePage = (item: NavItem) => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  const match = buttons.find((button) => {
    const text = (button.innerText || button.getAttribute('aria-label') || button.title || '').toLowerCase();
    return item.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });
  if (match) match.click();
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: item.label, keywords: item.keywords } }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const MainNavigation: React.FC = () => {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState('Dashboard');

  const items = useMemo<NavItem[]>(() => {
    if (currentUser?.role === 'owner') return [
      { label: 'Dashboard', keywords: ['Dashboard', 'Overview'], icon: Home },
      { label: 'Employees', keywords: ['Employees', 'Employee Status'], icon: Users },
      { label: 'Teams', keywords: ['Teams', 'Team'], icon: Users },
      { label: 'Sales', keywords: ['All Sales', 'Sales'], icon: BarChart3 },
      { label: 'Attendance', keywords: ['Attendance'], icon: CalendarCheck },
      { label: 'GPS / Live Control', keywords: ['GPS', 'Live Control'], icon: MapPin },
      { label: 'Fraud & Security', keywords: ['Fraud', 'Security'], icon: ShieldCheck },
      { label: 'Payments', keywords: ['Payment', 'Payments'], icon: Wallet },
      { label: 'Reports', keywords: ['Reports', 'Report'], icon: FileText },
      { label: 'Daily Top 3', keywords: ['Daily Achievement', 'Top 3', 'Achievement'], icon: Trophy },
      { label: 'Company Settings', keywords: ['Company Settings', 'Company Brand'], icon: Building2 },
      { label: 'Messages', keywords: ['Company Messages', 'Messages', 'Chat'], icon: Inbox },
      { label: 'Dialog Officer', keywords: ['Dialog Officer', 'Dialog Liaison'], icon: MessageCircle },
    ];
    if (currentUser?.role === 'team_leader') return [
      { label: 'Home / Dashboard', keywords: ['Dashboard', 'Attendance'], icon: Home },
      { label: 'My Team', keywords: ['Team Agents', 'My Team', 'Team'], icon: Users },
      { label: 'Sales', keywords: ['Sales'], icon: BarChart3 },
      { label: 'Attendance', keywords: ['Attendance'], icon: CalendarCheck },
      { label: 'GPS', keywords: ['GPS'], icon: MapPin },
      { label: 'Performance', keywords: ['Performance', 'Target'], icon: Target },
      { label: 'Payments', keywords: ['Payment'], icon: Wallet },
      { label: 'Reports', keywords: ['Reports', 'Report'], icon: FileText },
      { label: 'Messages', keywords: ['Company Messages', 'Messages', 'Chat'], icon: Inbox },
    ];
    if (currentUser?.role === 'dialog_officer') return [
      { label: 'Dialog Officer Home', keywords: ['Dialog Officer Portal'], icon: Home },
      { label: 'Owner Communication', keywords: ['Owner Communication'], icon: MessageCircle },
      { label: 'Reports / Notices', keywords: ['Reports, notices', 'report', 'notice'], icon: FileText },
      { label: 'Requests / Clarifications', keywords: ['request', 'clarification'], icon: Inbox },
      { label: 'Security', keywords: ['Security'], icon: ShieldCheck },
    ];
    return [
      { label: 'Home / Dashboard', keywords: ['Dashboard', 'Attendance'], icon: Home },
      { label: 'Work & Attendance', keywords: ['Attendance', 'Work Area', 'Start Work'], icon: Briefcase },
      { label: 'Sales', keywords: ['Sales'], icon: BarChart3 },
      { label: 'GPS', keywords: ['GPS'], icon: MapPin },
      { label: 'Performance', keywords: ['Performance', 'Target'], icon: Target },
      { label: 'Payments', keywords: ['Payment'], icon: Wallet },
      { label: 'Inbox & Messages', keywords: ['Company Messages', 'Messages', 'Inbox', 'Chat'], icon: Inbox },
      { label: 'My ID', keywords: ['Digital ID', 'ID Card'], icon: UserRound },
      { label: 'Meetings', keywords: ['Meetings', 'Meeting'], icon: Radio },
      { label: 'Security', keywords: ['Security'], icon: ShieldCheck },
    ];
  }, [currentUser?.role]);

  if (!currentUser) return null;

  const choose = (item: NavItem) => {
    setActive(item.label);
    setOpen(false);
    activatePage(item);
  };

  const goHome = () => {
    setActive(items[0]?.label || 'Dashboard');
    setOpen(false);
    window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'home' } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <>
    <div className="fixed bottom-3 left-1/2 z-[60] w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <button onClick={goHome} className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-black text-white hover:bg-emerald-500" aria-label="Home"><Home className="mr-1 inline h-4 w-4" />Home</button>
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {items.map((item) => { const Icon = item.icon; const selected = active === item.label; return <button key={item.label} onClick={() => choose(item)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold transition active:scale-95 ${selected ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`} title={`Open ${item.label}`} aria-label={item.label}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}
        </div>
        <button onClick={() => setOpen((value) => !value)} className="shrink-0 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-black text-white hover:bg-slate-700" aria-label="Open full page menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button>
      </div>
    </div>

    {open && <div className="fixed inset-0 z-[55] bg-slate-950/75 p-4 pb-24 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="mx-auto mt-auto max-h-[80vh] max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl sm:mt-[10vh]" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">DD WORLD OFFICIAL PORTAL</p><h2 className="text-xl font-extrabold text-white">{currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'team_leader' ? 'Team Leader' : currentUser.role === 'dialog_officer' ? 'Dialog Officer' : 'Agent'} Pages</h2><p className="mt-1 text-xs text-slate-400">Touch any page name to activate it.</p></div><button onClick={() => setOpen(false)} className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item) => { const Icon = item.icon; const selected = active === item.label; return <button key={item.label} onClick={() => choose(item)} className={`min-h-24 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${selected ? 'border-blue-400 bg-blue-600/20' : 'border-slate-700 bg-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-700'}`}><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-emerald-400"><Icon className="h-5 w-5" /></div><span className="block text-sm font-bold text-white">{item.label}</span><span className="text-[10px] text-slate-400">{selected ? 'ON / ACTIVE' : 'Touch to open →'}</span></button>; })}</div>
      </div>
    </div>}
  </>;
};
