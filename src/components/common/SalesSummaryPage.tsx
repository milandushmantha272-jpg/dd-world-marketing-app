import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Users, UserRound, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const isActiveSale = (sale: any) => {
  const status = String(sale.verificationStatus || sale.status || '').toLowerCase();
  return ['active', 'verified', 'confirmed', 'completed'].includes(status);
};

const saleDate = (sale: any) => String(sale.saleDate || sale.date || sale.createdAt || '').slice(0, 10);
const qty = (sale: any) => Math.max(0, Number(sale.quantity) || 1);

const inCurrentMonth = (date: string, month: string) => date.startsWith(month);
const weekOfMonth = (date: string) => {
  const day = Number(date.slice(8, 10));
  if (!day) return 0;
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
};

export const SalesSummaryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales, users, teams } = useData();
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const role = currentUser?.role;

  const scopedSales = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'owner') return sales;
    if (role === 'team_leader') {
      return sales.filter((s: any) => s.teamId === currentUser.teamId || s.agentId === currentUser.id);
    }
    return sales.filter((s: any) => s.agentId === currentUser.id);
  }, [sales, currentUser, role]);

  const filteredSales = useMemo(() => scopedSales.filter((s: any) => {
    if (selectedTeam !== 'all' && s.teamId !== selectedTeam) return false;
    if (selectedAgent !== 'all' && s.agentId !== selectedAgent) return false;
    return true;
  }), [scopedSales, selectedTeam, selectedAgent]);

  const activeSales = useMemo(() => filteredSales.filter(isActiveSale), [filteredSales]);
  const pendingActivations = useMemo(() => filteredSales.filter((s: any) => !isActiveSale(s)), [filteredSales]);

  const stats = useMemo(() => {
    const day = activeSales.filter((s: any) => saleDate(s) === today).reduce((n, s: any) => n + qty(s), 0);
    const weeks = [1, 2, 3, 4].map((w) => activeSales.filter((s: any) => inCurrentMonth(saleDate(s), month) && weekOfMonth(saleDate(s)) === w).reduce((n, s: any) => n + qty(s), 0));
    const monthly = activeSales.filter((s: any) => inCurrentMonth(saleDate(s), month)).reduce((n, s: any) => n + qty(s), 0);
    const total = activeSales.reduce((n, s: any) => n + qty(s), 0);
    const dayActivations = filteredSales.filter((s: any) => saleDate(s) === today).reduce((n, s: any) => n + qty(s), 0);
    const weeklyActivations = filteredSales.filter((s: any) => {
      const d = saleDate(s);
      return inCurrentMonth(d, month) && weekOfMonth(d) >= 1;
    }).reduce((n, s: any) => n + qty(s), 0);
    const monthlyActivations = filteredSales.filter((s: any) => inCurrentMonth(saleDate(s), month)).reduce((n, s: any) => n + qty(s), 0);
    return { day, weeks, monthly, total, dayActivations, weeklyActivations, monthlyActivations };
  }, [activeSales, filteredSales, today, month]);

  const agents = useMemo(() => users.filter((u: any) => u.role === 'agent' && (role !== 'team_leader' || u.teamId === currentUser?.teamId)), [users, role, currentUser?.teamId]);
  const teamRows = useMemo(() => teams.map((team: any) => {
    const teamSales = activeSales.filter((s: any) => s.teamId === team.id);
    return {
      ...team,
      total: teamSales.reduce((n: number, s: any) => n + qty(s), 0),
      today: teamSales.filter((s: any) => saleDate(s) === today).reduce((n: number, s: any) => n + qty(s), 0),
      weekly: teamSales.filter((s: any) => inCurrentMonth(saleDate(s), month)).reduce((n: number, s: any) => n + qty(s), 0),
      monthly: teamSales.filter((s: any) => inCurrentMonth(saleDate(s), month)).reduce((n: number, s: any) => n + qty(s), 0),
    };
  }).filter((r: any) => role === 'owner' || r.id === currentUser?.teamId), [teams, activeSales, role, currentUser?.teamId, today, month]);

  if (!currentUser) return null;

  return (
    <div className="space-y-5 pb-10 text-slate-100">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400"><BarChart3 className="h-4 w-4" /> Sales Summary & Activation</div>
            <h2 className="mt-1 text-2xl font-black text-white">Day • 4 Weeks • Monthly • Total</h2>
            <p className="mt-1 text-xs text-slate-400">Only Active / Verified sales are counted in the sales total. Pending activations remain separate.</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-right"><div className="text-[10px] font-bold text-slate-500">TODAY</div><div className="font-mono text-sm font-black text-white">{today}</div></div>
        </div>
      </div>

      {role === 'owner' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={selectedTeam} onChange={(e) => { setSelectedTeam(e.target.value); setSelectedAgent('all'); }} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-bold text-white"><option value="all">All Teams</option>{teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-bold text-white"><option value="all">All Agents</option>{agents.filter((a: any) => selectedTeam === 'all' || a.teamId === selectedTeam).map((a: any) => <option key={a.id} value={a.id}>{a.agentCode || 'Agent'} — {a.name}</option>)}</select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<CalendarDays className="h-5 w-5" />} label="Today Active Sales" value={stats.day} />
        <Kpi icon={<BarChart3 className="h-5 w-5" />} label="Week 1–4 Active" value={stats.weeks.reduce((a, b) => a + b, 0)} />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Monthly Active Total" value={stats.monthly} />
        <Kpi icon={<CheckCircle2 className="h-5 w-5" />} label="All-Time Active Total" value={stats.total} />
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-4 w-4 text-emerald-400" /> Current Month — 4 Week Sales</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.weeks.map((value, i) => <div key={i} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Week {i + 1}</div><div className="mt-1 text-2xl font-black text-white">{value}</div><div className="text-[10px] text-slate-500">Active units</div></div>)}</div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ActivationCard label="Today Activations" value={stats.dayActivations} />
        <ActivationCard label="Weekly Activations" value={stats.weeklyActivations} />
        <ActivationCard label="Monthly Activations" value={stats.monthlyActivations} />
      </div>

      <div className="rounded-3xl border border-amber-500/20 bg-slate-900 p-5 shadow-xl"><div className="flex items-center justify-between"><div><h3 className="flex items-center gap-2 text-sm font-black text-white"><Clock3 className="h-4 w-4 text-amber-400" /> Pending Activations</h3><p className="text-[11px] text-slate-500">Pending records do not increase Active Sales totals until confirmed.</p></div><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300">{pendingActivations.reduce((n, s: any) => n + qty(s), 0)}</span></div></div>

      {role === 'owner' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl"><h3 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><Users className="h-4 w-4 text-cyan-400" /> Owner — Team-wise Sales Summary</h3><div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-800 text-slate-500"><tr><th className="p-2">Team</th><th className="p-2">Today</th><th className="p-2">Monthly</th><th className="p-2">Total</th></tr></thead><tbody>{teamRows.map((r: any) => <tr key={r.id} className="border-b border-slate-800/60"><td className="p-2 font-bold text-white">{r.name}</td><td className="p-2">{r.today}</td><td className="p-2">{r.monthly}</td><td className="p-2 font-black text-emerald-400">{r.total}</td></tr>)}</tbody></table></div></div>
      )}

      {(role === 'owner' || role === 'team_leader') && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl"><h3 className="mb-4 flex items-center gap-2 text-sm font-black text-white"><UserRound className="h-4 w-4 text-emerald-400" /> {role === 'owner' ? 'Agent-wise Sales Summary' : 'My Team — Agent-wise Sales Summary'}</h3><div className="space-y-2">{agents.filter((a: any) => selectedTeam === 'all' || a.teamId === selectedTeam).map((agent: any) => { const rows = activeSales.filter((s: any) => s.agentId === agent.id); const d = rows.filter((s: any) => saleDate(s) === today).reduce((n: number, s: any) => n + qty(s), 0); const m = rows.filter((s: any) => inCurrentMonth(saleDate(s), month)).reduce((n: number, s: any) => n + qty(s), 0); const total = rows.reduce((n: number, s: any) => n + qty(s), 0); return <div key={agent.id} className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs"><div className="col-span-2 font-bold text-white">{agent.agentCode || '—'} • {agent.name}</div><div>Day <b>{d}</b></div><div>Month <b className="text-emerald-400">{m}</b> / Total <b>{total}</b></div></div>; })}</div></div>
      )}

      {role === 'agent' && <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 text-xs text-slate-400">මෙය ඔබගේම Sales Summary එකයි. Day / Week 1–4 / Monthly / Total සියල්ල ඔබගේ Active / Verified sales පමණක් මත ගණනය වේ.</div>}
    </div>
  );
};

const Kpi = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg"><div className="mb-2 flex items-center justify-between text-emerald-400">{icon}<span className="text-[10px] font-black uppercase text-slate-500">Live</span></div><div className="text-[11px] font-bold text-slate-400">{label}</div><div className="mt-1 text-3xl font-black text-white">{value}</div></div>;
const ActivationCard = ({ label, value }: { label: string; value: number }) => <div className="rounded-2xl border border-amber-500/20 bg-slate-900 p-4"><div className="text-[10px] font-black uppercase text-amber-300">{label}</div><div className="mt-1 text-3xl font-black text-white">{value}</div><div className="text-[10px] text-slate-500">Activation records</div></div>;
