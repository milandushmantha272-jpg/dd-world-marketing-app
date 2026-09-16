import React, { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Database, ShieldCheck, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const periods = [
  { key: '1m', label: '1 Month', months: 1 },
  { key: '2m', label: '2 Months', months: 2 },
  { key: '3m', label: '3 Months', months: 3 },
  { key: '6m', label: '6 Months', months: 6 },
  { key: '1y', label: '1 Year', months: 12 },
] as const;

const dateOf = (row: any) => String(row?.date || row?.saleDate || row?.createdAt || '').slice(0, 10);
const monthKey = (date: Date) => date.toISOString().slice(0, 7);

export const DataRetentionCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales, users, teams } = useData();
  const [period, setPeriod] = useState<(typeof periods)[number]['key']>('1m');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const onVisible = () => setLastRefresh(new Date());
    window.addEventListener('focus', onVisible);
    return () => window.removeEventListener('focus', onVisible);
  }, []);

  const months = periods.find(p => p.key === period)?.months ?? 1;
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - months + 1);
    return monthKey(d);
  }, [months, lastRefresh]);

  const scopedSales = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'owner') return sales;
    if (currentUser.role === 'team_leader') return sales.filter((s: any) => s.agentId === currentUser.id || s.teamId === currentUser.teamId);
    return sales.filter((s: any) => s.agentId === currentUser.id);
  }, [sales, currentUser]);

  const history = useMemo(() => scopedSales.filter((s: any) => dateOf(s).slice(0, 7) >= cutoff), [scopedSales, cutoff]);
  const active = history.filter((s: any) => ['active', 'verified', 'confirmed', 'completed'].includes(String(s.verificationStatus || s.status || '').toLowerCase()));
  const totalQty = active.reduce((n: number, s: any) => n + Math.max(0, Number(s.quantity) || 1), 0);
  const currentEmployees = users.filter((u: any) => String(u.status || '').toLowerCase() === 'active' || String(u.employmentStatus || '').toUpperCase() === 'ACTIVE').length;

  if (!currentUser || currentUser.role !== 'owner') return null;

  return <section className="dd-page-shell min-h-screen px-4 py-5 md:px-6 md:py-8">
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="dd-card rounded-[26px] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300"><Database className="h-4 w-4"/> Owner Only · Data & History</div><h1 className="mt-2 text-2xl font-black text-white">Data Retention & History Center</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Detailed operational data is retained for the configured period, then converted to protected summaries. This screen only reads live Supabase data and never invents historical figures.</p></div>
          <button onClick={() => setLastRefresh(new Date())} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-bold text-white"><RefreshCw className="h-4 w-4"/> Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{periods.map(p => <button key={p.key} onClick={() => setPeriod(p.key)} className={`rounded-2xl border p-4 text-left transition ${period === p.key ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}><CalendarRange className="h-5 w-5 text-emerald-400"/><div className="mt-3 text-sm font-black text-white">{p.label}</div><div className="mt-1 text-[10px] text-slate-500">History view</div></button>)}</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Stat label="Selected period" value={periods.find(p => p.key === period)?.label || ''}/><Stat label="Sales records in period" value={String(history.length)}/><Stat label="Active sales units" value={String(totalQty)}/><Stat label="Current employees" value={String(currentEmployees)}/></div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-4 w-4 text-emerald-400"/> Retention Policy</h2><div className="mt-4 space-y-3 text-xs text-slate-300"><Rule title="0–3 Months" text="Detailed Attendance, Sales and operational field records remain available for operational/history views."/><Rule title="After 3 Months" text="Detailed operational records are summarized before removal; monthly summary remains."/><Rule title="Up to 12 Months" text="Monthly Attendance and Sales summaries remain available for reports and Month-End history."/><Rule title="After 12 Months" text="Annual summary is retained for currently active employees; unnecessary old detail is not retained."/></div></section>
        <section className="rounded-3xl border border-amber-500/20 bg-slate-900 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><Trash2 className="h-4 w-4 text-amber-400"/> Automatic Cleanup</h2><p className="mt-3 text-xs leading-5 text-slate-400">The database retention job runs automatically. Cleanup is performed by the database, not by an Agent or Team Leader. Existing application permissions remain separate from the retention process.</p><div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-300">Last screen refresh: <span className="font-mono text-white">{lastRefresh.toLocaleString()}</span></div></section>
      </div>

      <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-xs leading-6 text-cyan-100"><b>Owner control:</b> This page is Owner-only. Team Leaders and Agents do not receive access to retention administration. Historical summaries continue to follow their normal role/team visibility rules.</div>
    </div>
  </section>;
};

const Stat = ({ label, value }: { label: string; value: string }) => <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-2 text-2xl font-black text-white">{value}</div></div>;
const Rule = ({ title, text }: { title: string; text: string }) => <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="font-black text-white">{title}</div><div className="mt-1 leading-5 text-slate-400">{text}</div></div>;
