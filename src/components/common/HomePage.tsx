import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { IdCard, CalendarCheck, BarChart3, FileText, MessageSquare, ClipboardList, Wallet, Shirt, UserPlus, ChevronRight, ShieldCheck, Presentation, Database, Award } from 'lucide-react';
import { DdWorldMarketingLogo } from './DdWorldMarketingLogo';

type HomeItem = { label: string; description: string; icon: React.ElementType; ownerOnly?: boolean };

const openPage = (label: string) => {
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: label } }));
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const items = useMemo<HomeItem[]>(() => [
    { label: 'Page 1 — ID', description: role === 'owner' ? 'Employee identity, approval and control' : 'Official employee identity and status', icon: IdCard },
    { label: 'Page 2 — Attendance', description: role === 'owner' ? 'Attendance, field work and GPS' : role === 'team_leader' ? 'Team attendance and field work' : 'Field work, time and GPS', icon: CalendarCheck },
    { label: 'Page 3 — Sales Activation', description: role === 'owner' ? 'Full activation control' : role === 'team_leader' ? 'Own activation and team workflow' : 'Sayuru / Govi Mithuru activation', icon: BarChart3 },
    { label: 'Page 4 — Sales Summary / Reports', description: 'Performance, quality, usage and reports', icon: FileText },
    { label: 'Page 5 — Message Room', description: 'Official company messages and meetings', icon: MessageSquare },
    { label: 'Page 6 — Details Submit / ID Requirements', description: 'Required details, documents and review', icon: ClipboardList },
    { label: 'Page 7 — Commission / Payment', description: role === 'owner' ? 'Reports, commission and payment control' : role === 'team_leader' ? 'Team payment grouping and status' : 'Your monthly payment and issues', icon: Wallet },
    { label: 'Page 8 — Promotion Items', description: 'Promotion requests and team consolidation', icon: Shirt },
    { label: 'Page 9 — New Agent Join (Requirements)', description: 'New-agent requirements and approval', icon: UserPlus },
    { label: 'Page 10 — Month-End Presentation', description: 'Auto Generate → Owner Review → Live Meeting → Team/Agent slides → Final Summary', icon: Presentation },
    ...(role === 'owner' ? [
      { label: 'Owner — Data Retention & History', description: '3-month detail → 12-month monthly summary → annual summary', icon: Database, ownerOnly: true },
      { label: 'Owner — Career & Team Management', description: '1–6 month → 6 month → 1 year reviews → 2 year Team Leader path', icon: Award, ownerOnly: true },
    ] : []),
  ], [role]);
  if (!currentUser) return null;
  const roleName = role === 'owner' ? 'OWNER' : role === 'team_leader' ? 'TEAM LEADER' : 'AGENT';

  return (
    <section className="dd-page-shell min-h-[calc(100vh-72px)] px-4 py-5 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="dd-card relative overflow-hidden rounded-[26px] p-5 md:p-7">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <DdWorldMarketingLogo size="lg" showDetails={false} />
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black tracking-[.16em] text-emerald-300"><ShieldCheck className="h-3 w-3" /> DD WORLD OFFICIAL</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-300">{roleName}</span>
              </div>
            </div>
            <h1 className="mt-5 truncate text-2xl font-black tracking-tight text-white md:text-3xl">Welcome, {currentUser.name}</h1>
            <p className="mt-1 text-xs leading-5 text-slate-400">DD WORLD MARKETING • Official company portal • Select a page to continue.</p>
          </div>
        </header>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
          {items.map((item, index) => {
            const Icon = item.icon;
            return <button key={item.label} type="button" onClick={() => openPage(item.label)} className="group relative min-h-[142px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-left shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-slate-900/85 active:scale-[.98]" aria-label={item.label}>
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/10 text-cyan-300"><Icon className="h-5 w-5" /></div><span className="text-[10px] font-black tracking-widest text-slate-500">{String(index + 1).padStart(2, '0')}</span></div>
                <div className="mt-auto pt-4"><div className="flex items-center justify-between gap-2"><span className="text-sm font-extrabold leading-5 text-white md:text-[15px]">{item.label}</span><ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-300" /></div><p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-slate-400 md:text-[11px]">{item.description}</p></div>
              </div>
            </button>;
          })}
        </div>
      </div>
    </section>
  );
};
