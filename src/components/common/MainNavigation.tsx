import React, { useMemo, useState } from 'react';
import { Menu, X, Briefcase, BarChart3, MapPin, Wallet, Inbox, UserRound, ShieldCheck, Users, CalendarCheck, FileText, Building2, MessageCircle, IdCard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type NavItem = { label: string; keywords: string[]; icon: React.ElementType; description: string };

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
  const [active, setActive] = useState('Page 1 — ID');

  const items = useMemo<NavItem[]>(() => {
    const common = [
      { label: 'Page 1 — ID', keywords: ['Digital ID', 'ID Card', 'Employee ID', 'My ID', 'Owner ID'], icon: IdCard, description: 'Official employee/company identity and approval status.' },
      { label: 'Page 2 — Attendance', keywords: ['Attendance', 'Work & Attendance', 'Start Field Work', 'Start Work'], icon: CalendarCheck, description: 'Field work start/end, attendance status, time and GPS.' },
      { label: 'Page 3 — Sales Activation', keywords: ['IVR Keypad', '#828#', '#616#', 'App Activation', 'Sales Activation'], icon: BarChart3, description: 'Sayuru/Govi Mithuru IVR and App activation workflow.' },
      { label: 'Page 4 — Sales Summary / Reports', keywords: ['Sales Summary', 'Daily / Weekly / Monthly Summaries', 'Executive Summaries', 'Reports'], icon: FileText, description: 'Daily, weekly, monthly, agent/team/product sales reports.' },
      { label: 'Page 5 — Message Room', keywords: ['Company Messages', 'Messages', 'Inbox', 'Chat', 'Message Room'], icon: Inbox, description: 'Official internal messages, notices and meeting communication.' },
      { label: 'Page 6 — Details Submit / ID Requirements', keywords: ['Details Submit', 'ID Requirements', 'Employee Verification', 'Verification'], icon: UserRound, description: 'Employee documents/details submission and Owner approval.' },
      { label: 'Page 7 — Commission / Payment', keywords: ['Commission / Payment', 'Commission', 'Payment', 'Payments'], icon: Wallet, description: 'Dialog final report, monthly commission and payment status.' },
      { label: 'Page 8 — Promotion Items', keywords: ['Promotion Items', 'Promotion', 'Dialog Liaison'], icon: Building2, description: 'Sayuru/Govi Mithuru promotion-item requests and consolidation.' },
      { label: 'Page 9 — New Agent Join (Requirements)', keywords: ['New Agent Join', 'Requirements', 'Join'], icon: Users, description: 'New-agent application, TL review, Owner approval and Dialog submission.' },
    ];

    if (currentUser?.role === 'dialog_officer') return [
      { label: 'Page 1 — Officer Home', keywords: ['Dialog Officer Portal', 'Dialog Officer Home'], icon: Building2, description: 'Dialog Officer role-specific work dashboard.' },
      { label: 'Page 2 — Dialog Reports / Notices', keywords: ['Reports / Notices', 'Report', 'Notice'], icon: FileText, description: 'Send official Dialog reports and notices to Owner.' },
      { label: 'Page 3 — Owner Communication', keywords: ['Owner Communication'], icon: MessageCircle, description: 'Private Officer ↔ Owner communication only.' },
      { label: 'Page 4 — Commission / Payment', keywords: ['Commission / Payment', 'Commission', 'Payment'], icon: Wallet, description: 'Payment/accounts and final report communication.' },
      { label: 'Page 5 — Requests / Clarifications', keywords: ['Requests / Clarifications', 'Request', 'Clarification'], icon: Inbox, description: 'Owner requests, clarifications and escalations.' },
      { label: 'Page 6 — Security / Access', keywords: ['Security', 'Access'], icon: ShieldCheck, description: 'Authorized Dialog Officer access and security controls.' },
    ];

    if (currentUser?.role === 'owner') return [
      { ...common[0], description: 'Owner identity plus complete employee ID approval/signature management.' },
      { ...common[1], description: 'All employee attendance, field-work time and GPS visibility.' },
      { ...common[2], description: 'Full Sales Activation control for all teams/agents.' },
      { ...common[3], description: 'Complete company sales summaries and executive reports.' },
      { ...common[4], description: 'Company-wide official messages, meetings and communication.' },
      { ...common[5], description: 'Review documents, approve/reject IDs and apply Owner signature.' },
      { ...common[6], description: 'Dialog final report review, Owner additions, approvals and payment control.' },
      { ...common[7], description: 'Promotion requests, consolidation and Dialog Officer communication.' },
      { ...common[8], description: 'New Agent requirements, approval and Dialog submission.' },
    ];

    if (currentUser?.role === 'team_leader') return [
      { ...common[0], description: 'Own official ID and team-member ID status visibility.' },
      { ...common[1], description: 'Own + assigned team attendance and field-work monitoring.' },
      { ...common[2], description: 'Own activation; view/manage team workflow without activating for another Agent.' },
      { ...common[3], description: 'Own and assigned team sales summaries/reports.' },
      { ...common[4], description: 'Owner/team communication and meeting notices.' },
      { ...common[5], description: 'Own details and verified new-agent/document workflow to Owner.' },
      { ...common[6], description: 'Team-wise Agent payment grouping, eZ Cash submission and status.' },
      { ...common[7], description: 'Agent promotion requests, consolidation and Owner submission.' },
      { ...common[8], description: 'Review new-agent requirements and send verified details to Owner.' },
    ];

    return [
      { ...common[0], description: 'Official approved DD WORLD MARKETING employee ID.' },
      { ...common[1], description: 'Start/end field work, attendance status, timer and GPS.' },
      { ...common[2], description: 'Own Sayuru/Govi Mithuru IVR or App activation.' },
      { ...common[3], description: 'Own daily/weekly/monthly sales summary.' },
      { ...common[4], description: 'Owner/Team Leader/company messages and meetings.' },
      { ...common[5], description: 'Submit photo, reports, ID details and requirements to Owner.' },
      { ...common[6], description: 'Own monthly App/IVR payment, confirmation and issue reporting.' },
      { ...common[7], description: 'Submit Sayuru/Govi Mithuru promotion-item requirements to Team Leader.' },
      { ...common[8], description: 'Submit new-agent requirements through Team Leader to Owner.' },
    ];
  }, [currentUser?.role]);

  if (!currentUser) return null;
  const choose = (item: NavItem) => { setActive(item.label); setOpen(false); activatePage(item); };

  return <>
    <div className="fixed bottom-3 left-1/2 z-[60] w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2"><div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5 [scrollbar-width:none]">
        {items.map((item) => { const Icon = item.icon; const selected = active === item.label; return <button key={item.label} onClick={() => choose(item)} className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold transition active:scale-95 ${selected ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'}`} title={item.description} aria-label={item.label}><Icon className="h-3.5 w-3.5" />{item.label}</button>; })}
      </div><button onClick={() => setOpen((value) => !value)} className="shrink-0 rounded-xl bg-slate-800 px-3 py-2.5 text-xs font-black text-white hover:bg-slate-700" aria-label="Open full page menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button></div>
    </div>
    {open && <div className="fixed inset-0 z-[55] bg-slate-950/75 p-4 pb-24 backdrop-blur-sm" onClick={() => setOpen(false)}><div className="mx-auto mt-[10vh] max-h-[80vh] max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">DD WORLD OFFICIAL PORTAL</p><h2 className="text-xl font-extrabold text-white">{currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'team_leader' ? 'Team Leader' : currentUser.role === 'dialog_officer' ? 'Dialog Officer' : 'Agent'} Pages</h2><p className="mt-1 text-xs text-slate-400">Touch any page name to activate it.</p></div><button onClick={() => setOpen(false)} className="rounded-xl bg-slate-800 p-2 text-slate-300 hover:bg-slate-700" aria-label="Close menu"><X className="h-5 w-5" /></button></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{items.map((item) => { const Icon = item.icon; const selected = active === item.label; return <button key={item.label} onClick={() => choose(item)} className={`min-h-24 rounded-2xl border p-4 text-left transition active:scale-[0.98] ${selected ? 'border-emerald-400 bg-emerald-600/20' : 'border-slate-700 bg-slate-800/80 hover:border-emerald-500/50 hover:bg-slate-700'}`}><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-emerald-400"><Icon className="h-5 w-5" /></div><span className="block text-sm font-bold text-white">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-slate-400">{item.description}</span></button>; })}</div></div></div>}
  </>;
};