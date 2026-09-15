import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  IdCard, CalendarCheck, BarChart3, FileText, MessageSquare, ClipboardList,
  Wallet, Shirt, UserPlus, Home as HomeIcon, ChevronRight, ShieldCheck,
} from 'lucide-react';

type HomeItem = {
  label: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
};

const goToPage = (item: HomeItem) => {
  const buttons = Array.from(document.querySelectorAll('button')) as HTMLButtonElement[];
  const match = buttons.find((button) => {
    const text = (button.innerText || button.getAttribute('aria-label') || button.title || '').toLowerCase();
    return item.keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  });
  if (match) match.click();
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: item.label, keywords: item.keywords } }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const items = useMemo<HomeItem[]>(() => [
    { label: 'Page 1 — ID', description: role === 'owner' ? 'Employee IDs, approval and Owner control' : 'Official employee identity and approval status', icon: IdCard, keywords: ['Digital ID', 'ID Card', 'Employee ID', 'My ID', 'Owner ID'] },
    { label: 'Page 2 — Attendance', description: role === 'owner' ? 'All attendance, field work and GPS' : role === 'team_leader' ? 'Team attendance, field work and GPS' : 'Start/end field work, time and GPS', icon: CalendarCheck, keywords: ['Attendance', 'Work & Attendance', 'Start Field Work', 'Start Work'] },
    { label: 'Page 3 — Sales Activation', description: role === 'owner' ? 'Full activation control for all teams' : role === 'team_leader' ? 'Own activation and team workflow view' : 'Sayuru / Govi Mithuru activation', icon: BarChart3, keywords: ['IVR Keypad', '#828#', '#616#', 'App Activation', 'Sales Activation'] },
    { label: 'Page 4 — Sales Summary / Reports', description: 'Sales performance, quality, usage and reports', icon: FileText, keywords: ['Sales Summary', 'Daily / Weekly / Monthly Summaries', 'Executive Summaries', 'Reports'] },
    { label: 'Page 5 — Message Room', description: 'Official company messages and meetings', icon: MessageSquare, keywords: ['Company Messages', 'Messages', 'Inbox', 'Chat', 'Message Room'] },
    { label: 'Page 6 — Details Submit / ID Requirements', description: 'Required details, documents and Owner review', icon: ClipboardList, keywords: ['Details Submit', 'ID Requirements', 'Employee Verification', 'Verification'] },
    { label: 'Page 7 — Commission / Payment', description: role === 'owner' ? 'Reports, commission control and payment approvals' : role === 'team_leader' ? 'Team payment grouping and status' : 'Your monthly payment and issue reporting', icon: Wallet, keywords: ['Commission / Payment', 'Commission', 'Payment', 'Payments'] },
    { label: 'Page 8 — Promotion Items', description: 'Promotion-item requests and team consolidation', icon: Shirt, keywords: ['Promotion Items', 'Promotion', 'Dialog Liaison'] },
    { label: 'Page 9 — New Agent Join (Requirements)', description: 'New-agent requirements, review and approval', icon: UserPlus, keywords: ['New Agent Join', 'Requirements', 'Join'] },
  ], [role]);

  if (!currentUser) return null;
  const roleName = role === 'owner' ? 'OWNER' : role === 'team_leader' ? 'TEAM LEADER' : 'AGENT';

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5 md:px-6 md:py-8">
      <div className="relative overflow-hidden rounded-[28px] border border-slate-700/70 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl md:p-7">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20">
              <HomeIcon className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black tracking-widest text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> DD WORLD OFFICIAL
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-300">{roleName}</span>
              </div>
              <h1 className="mt-2 truncate text-2xl font-black tracking-tight text-white md:text-3xl">Welcome, {currentUser.name}</h1>
              <p className="mt-1 text-xs leading-5 text-slate-400">Select a page below. Touch a card to open it instantly.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-3">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => goToPage(item)}
              className="group relative min-h-[142px] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/95 p-4 text-left shadow-lg transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-slate-800 active:scale-[0.98] md:min-h-[158px] md:p-5"
              aria-label={item.label}
            >
              <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-emerald-400/5 blur-2xl transition group-hover:bg-emerald-400/10" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-400/15 bg-emerald-400/10 text-emerald-300 transition group-hover:bg-emerald-400/15">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-black tracking-wider text-slate-500">0{index + 1}</span>
                </div>
                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-extrabold leading-5 text-white md:text-[15px]">{item.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-0.5 group-hover:text-emerald-300" />
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-400 md:text-[11px]">{item.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
