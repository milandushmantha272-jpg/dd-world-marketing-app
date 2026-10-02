import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { Users, UserCheck, Smartphone } from 'lucide-react';

export interface OwnerConsoleKpi { totalAgents: number; turnoutPercent: number; subscriptions30d: number; }

export const OwnerDashboardConsole: React.FC = () => {
  const { users, attendance, sales, dataError, retryData } = useData();

  const kpi = useMemo<OwnerConsoleKpi>(() => {
    const agents = users.filter((u: any) => String(u.role || '').toLowerCase() === 'agent');
    const today = new Date().toISOString().slice(0, 10);
    const expected = agents.length;
    const presentIds = new Set(
      attendance
        .filter((a: any) => String(a.date || '').slice(0, 10) === today && ['present', 'half_day', 'checked_in'].includes(String(a.status || '').toLowerCase()))
        .map((a: any) => a.userId || a.user_id)
        .filter(Boolean)
    );
    const turnoutPercent = expected ? Math.round((presentIds.size / expected) * 100) : 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const subscriptions30d = sales
      .filter((s: any) => {
        const d = new Date(String(s.saleDate || s.sale_date || ''));
        return Number.isFinite(d.getTime()) && d >= cutoff;
      })
      .reduce((sum: number, s: any) => sum + Number(s.quantity || 1), 0);

    return { totalAgents: expected, turnoutPercent, subscriptions30d };
  }, [users, attendance, sales]);

  return (
    <section aria-labelledby="owner-console-title" className="space-y-5">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">DD WORLD · Owner Console</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="owner-console-title" className="text-2xl font-black text-slate-900">Owner Dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">Live operational KPIs from the authenticated management data scope.</p>
          </div>
          <button type="button" onClick={retryData} className="min-h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">
            Refresh data
          </button>
        </div>
        {dataError && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            {dataError}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Total Agents</span><Users className="h-5 w-5 text-slate-700" /></div>
          <div className="mt-4 text-4xl font-black text-slate-900">{kpi.totalAgents}</div>
          <p className="mt-1 text-xs text-slate-500">Active management data scope</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Today Turnout</span><UserCheck className="h-5 w-5 text-emerald-600" /></div>
          <div className="mt-4 text-4xl font-black text-slate-900">{kpi.turnoutPercent}%</div>
          <p className="mt-1 text-xs text-slate-500">Based on today's attendance records</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-wide text-slate-500">30-Day Subscriptions</span><Smartphone className="h-5 w-5 text-blue-600" /></div>
          <div className="mt-4 text-4xl font-black text-slate-900">{kpi.subscriptions30d}</div>
          <p className="mt-1 text-xs text-slate-500">Recorded sales units in the last 30 days</p>
        </article>
      </div>
    </section>
  );
};
