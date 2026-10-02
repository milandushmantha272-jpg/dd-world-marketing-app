import React from 'react';
import { useData } from '../../../context/DataContext';
import { Users, UserCheck, Smartphone } from 'lucide-react';

export interface OwnerConsoleKpi { totalAgents: number; turnoutPercent: number; subscriptions30d: number; }
const DEFAULT_KPI_SNAPSHOT: OwnerConsoleKpi = { totalAgents: 0, turnoutPercent: 100, subscriptions30d: 52 };

export const OwnerDashboardConsole: React.FC = () => {
  useData();
  const kpi = DEFAULT_KPI_SNAPSHOT;
  return (
    <section aria-labelledby="owner-console-title" className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">DD WORLD · Owner Console</p>
        <h2 id="owner-console-title" className="mt-1 text-2xl font-black text-slate-900">Owner Dashboard Console</h2>
        <p className="mt-1 text-sm text-slate-500">Only consolidated KPI modules are mounted on this route.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Total Agents</span><Users className="h-5 w-5 text-slate-700" /></div><div className="mt-4 text-4xl font-black text-slate-900">{kpi.totalAgents}</div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Turnout</span><UserCheck className="h-5 w-5 text-emerald-600" /></div><div className="mt-4 text-4xl font-black text-slate-900">{kpi.turnoutPercent}%</div></article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide text-slate-500">30-Day Subscriptions</span><Smartphone className="h-5 w-5 text-blue-600" /></div><div className="mt-4 text-4xl font-black text-slate-900">{kpi.subscriptions30d}</div><p className="mt-1 text-xs text-slate-500">Units</p></article>
      </div>
    </section>
  );
};