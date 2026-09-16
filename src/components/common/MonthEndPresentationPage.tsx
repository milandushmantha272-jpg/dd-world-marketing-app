import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Crown, Presentation, RefreshCw, ShieldCheck, Trophy, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { LiveMeetingRoom, PresentationSlideData } from './LiveMeetingRoom';

const ACTIVE = new Set(['active', 'verified', 'confirmed', 'completed']);
const qty = (s: any) => Math.max(0, Number(s.quantity) || 1);
const statusOf = (s: any) => String(s.verificationStatus || s.status || '').toLowerCase();
const dateOf = (s: any) => String(s.saleDate || s.date || s.createdAt || '').slice(0, 10);
const monthOf = (s: any) => dateOf(s).slice(0, 7);
const productLabel = (s: any) => {
  const value = String(s.productType || s.productName || '').toLowerCase();
  if (value.includes('sayuru') || value.includes('සයුරු')) return 'Sayuru';
  if (value.includes('gov') || value.includes('mith') || value.includes('ගොවි')) return 'Govi Mithuru';
  return 'Other';
};
const monthName = (value: string) => new Date(`${value}-01T00:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

export const MonthEndPresentationPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { currentUser } = useAuth();
  const { sales, users, teams } = useData();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generatedAt, setGeneratedAt] = useState(new Date().toISOString());
  const isOwner = currentUser?.role === 'owner';

  const monthSales = useMemo(() => sales.filter((s: any) => monthOf(s) === selectedMonth && ACTIVE.has(statusOf(s))), [sales, selectedMonth]);
  const agentRows = useMemo(() => users.filter((u: any) => u.role === 'agent'), [users]);
  const teamRows = useMemo(() => teams || [], [teams]);

  const agentStats = useMemo(() => agentRows.map((agent: any) => {
    const rows = monthSales.filter((s: any) => s.agentId === agent.id);
    const sayuru = rows.filter((s: any) => productLabel(s) === 'Sayuru').reduce((n, s) => n + qty(s), 0);
    const govi = rows.filter((s: any) => productLabel(s) === 'Govi Mithuru').reduce((n, s) => n + qty(s), 0);
    return { agent, total: sayuru + govi, sayuru, govi };
  }).sort((a, b) => b.total - a.total || String(a.agent.name).localeCompare(String(b.agent.name))), [agentRows, monthSales]);

  const teamStats = useMemo(() => teamRows.map((team: any) => {
    const members = agentStats.filter((r: any) => r.agent.teamId === team.id);
    const total = members.reduce((n, r) => n + r.total, 0);
    const sayuru = members.reduce((n, r) => n + r.sayuru, 0);
    const govi = members.reduce((n, r) => n + r.govi, 0);
    const best = members[0] || null;
    return { team, members, total, sayuru, govi, best };
  }).sort((a, b) => b.total - a.total || String(a.team.name).localeCompare(String(b.team.name))), [teamRows, agentStats]);

  const company = useMemo(() => ({
    total: monthSales.reduce((n, s) => n + qty(s), 0),
    sayuru: monthSales.filter((s: any) => productLabel(s) === 'Sayuru').reduce((n, s) => n + qty(s), 0),
    govi: monthSales.filter((s: any) => productLabel(s) === 'Govi Mithuru').reduce((n, s) => n + qty(s), 0),
    teams: teamStats.filter(t => t.total > 0).length,
    agents: agentStats.filter(a => a.total > 0).length,
  }), [monthSales, teamStats, agentStats]);

  const bestAgent = agentStats[0];
  const bestTeam = teamStats[0];
  const activeTeams = teamStats.filter(t => t.total > 0);

  const slides = useMemo<PresentationSlideData[]>(() => {
    const result: PresentationSlideData[] = [
      {
        id: 'cover', eyebrow: 'DD WORLD MARKETING • MONTH END', title: `Monthly Performance Presentation`, subtitle: `${monthName(selectedMonth)} • Auto-generated from verified active sales`,
        metrics: [{ label: 'Month', value: selectedMonth }, { label: 'Active Sales', value: company.total }, { label: 'Teams', value: company.teams }, { label: 'Agents', value: company.agents }],
        bullets: ['Owner review is the final control before the presentation starts.', 'Only verified/active sales are included in the performance totals.']
      },
      {
        id: 'company-total', eyebrow: 'COMPANY TOTAL', title: `DD WORLD MARKETING • ${monthName(selectedMonth)}`,
        metrics: [{ label: 'Total', value: company.total }, { label: 'Sayuru', value: company.sayuru }, { label: 'Govi Mithuru', value: company.govi }, { label: 'Active Agents', value: company.agents }],
        bullets: [`${company.teams} teams recorded active sales this month.`, 'Product totals remain separated for Sayuru and Govi Mithuru.']
      },
      {
        id: 'best-performance', eyebrow: 'BEST PERFORMANCE', title: bestAgent ? `${bestAgent.agent.name} • Best Performance` : 'Best Performance', subtitle: bestAgent ? `${bestAgent.agent.agentCode || 'Agent'} • ${bestAgent.agent.teamName || 'Team performance leader'}` : 'No verified active sales in the selected month.',
        metrics: [{ label: 'Total Sales', value: bestAgent?.total || 0 }, { label: 'Sayuru', value: bestAgent?.sayuru || 0 }, { label: 'Govi Mithuru', value: bestAgent?.govi || 0 }, { label: 'Month', value: selectedMonth }],
        bullets: bestAgent ? ['Best Performance is calculated from verified active sales for the selected month.', 'Official quality/retention fields can be reviewed separately when supplied by Dialog.'] : []
      },
      {
        id: 'team-best', eyebrow: 'TEAM-WISE BEST PERFORMANCE', title: bestTeam ? `${bestTeam.team.name} • Best Team Performance` : 'Team-wise Best Performance', subtitle: bestTeam ? `Team total ${bestTeam.total} verified active sales` : 'No verified active team sales in the selected month.',
        metrics: [{ label: 'Best Team', value: bestTeam?.team.name || '—' }, { label: 'Team Sales', value: bestTeam?.total || 0 }, { label: 'Best Agent', value: bestTeam?.best?.agent?.name || '—' }, { label: 'Teams', value: teamStats.length }],
        bullets: activeTeams.slice(0, 8).map((t: any, i: number) => `${i + 1}. ${t.team.name} — ${t.total} sales • Best: ${t.best?.agent?.name || '—'}`)
      },
    ];
    teamStats.forEach((team: any) => result.push({
      id: `team-${team.team.id}`, eyebrow: 'TEAM SLIDE', title: team.team.name, subtitle: `Team Leader: ${users.find((u: any) => u.id === team.team.leaderId)?.name || 'Not assigned'}`,
      metrics: [{ label: 'Team Sales', value: team.total }, { label: 'Sayuru', value: team.sayuru }, { label: 'Govi Mithuru', value: team.govi }, { label: 'Agents', value: team.members.length }],
      bullets: team.members.slice(0, 12).map((m: any) => `${m.agent.agentCode || 'Agent'} • ${m.agent.name} — ${m.total} sales (S ${m.sayuru} / G ${m.govi})`)
    }));
    agentStats.forEach((row: any) => result.push({
      id: `agent-${row.agent.id}`, eyebrow: 'AGENT SLIDE', title: row.agent.name, subtitle: `${row.agent.agentCode || 'Agent'} • ${row.agent.teamName || 'Team not assigned'}`,
      metrics: [{ label: 'Total', value: row.total }, { label: 'Sayuru', value: row.sayuru }, { label: 'Govi Mithuru', value: row.govi }, { label: 'Rank', value: agentStats.findIndex((x: any) => x.agent.id === row.agent.id) + 1 }],
      bullets: [row.total > 0 ? 'Included in the verified monthly performance presentation.' : 'No verified active sales in the selected month.']
    }));
    result.push({
      id: 'final-summary', eyebrow: 'FINAL OWNER SUMMARY', title: 'Month-End Final Summary', subtitle: `Owner-reviewed presentation • ${monthName(selectedMonth)}`,
      metrics: [{ label: 'Company Total', value: company.total }, { label: 'Best Agent', value: bestAgent?.agent.name || '—' }, { label: 'Best Team', value: bestTeam?.team.name || '—' }, { label: 'Slides', value: result.length + 1 }],
      bullets: ['Review completed → live presentation can start.', 'Team and Agent slides are shown in the same live order for all meeting participants.', 'The Owner controls the live slide movement during the meeting.']
    });
    return result;
  }, [selectedMonth, company, bestAgent, bestTeam, teamStats, agentStats, users]);

  const regenerate = () => setGeneratedAt(new Date().toISOString());
  if (!currentUser) return null;

  if (embedded) return <div className="space-y-4"><LiveMeetingRoom monthlyPresentation presentationSlides={isOwner ? slides : []} /></div>;

  return <div className="space-y-5 p-3 pb-12 md:p-5">
    <section className="rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-900 p-5 shadow-xl md:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-cyan-300"><Presentation className="h-4 w-4" />PAGE 10 · MONTH-END PRESENTATION</div><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Month End → Auto Generate → Owner Review → Start Presentation</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">The presentation is generated from the live Supabase sales/team data. During the meeting, the Owner controls the live slide and every participant sees the same presentation slide.</p></div>
        {isOwner && <div className="flex flex-wrap gap-2"><input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-xs font-bold text-white" /><button onClick={regenerate} className="rounded-xl bg-cyan-600 px-4 py-2.5 text-xs font-black text-white"><RefreshCw className="mr-1 inline h-4 w-4" />Auto Generate</button></div>}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500"><span className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-emerald-300">Generated {new Date(generatedAt).toLocaleString()}</span><span className="rounded-full border border-slate-700 px-3 py-1">{slides.length} live slides</span><span className="rounded-full border border-slate-700 px-3 py-1">Verified/Active sales only</span></div>
    </section>

    {isOwner ? <>
      <section className="rounded-3xl border border-amber-500/20 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-5 w-5 text-amber-400" />OWNER REVIEW</div><p className="mt-2 text-xs leading-5 text-slate-400">Check the generated company total, Best Performance and Team-wise Best Performance before starting the live presentation.</p><div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Review label="Company Total" value={company.total} /><Review label="Best Agent" value={bestAgent?.agent.name || '—'} /><Review label="Best Team" value={bestTeam?.team.name || '—'} /><Review label="Teams / Agents" value={`${company.teams} / ${company.agents}`} /></div></section>

      <section className="grid gap-4 md:grid-cols-2"><div className="rounded-3xl border border-amber-400/20 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><Trophy className="h-5 w-5 text-amber-400" />BEST PERFORMANCE</div><div className="mt-4 text-xl font-black text-white">{bestAgent?.agent.name || 'No data'}</div><div className="mt-1 text-xs text-slate-400">{bestAgent?.agent.agentCode || '—'} • {bestAgent?.total || 0} verified active sales</div></div><div className="rounded-3xl border border-emerald-400/20 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><Crown className="h-5 w-5 text-emerald-400" />TEAM-WISE BEST PERFORMANCE</div><div className="mt-4 space-y-2">{activeTeams.slice(0, 10).map((t: any) => <div key={t.team.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"><span className="font-bold text-white">{t.team.name}</span><span className="text-emerald-300">{t.best?.agent.name || '—'} • {t.total}</span></div>)}</div></div></section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><Users className="h-5 w-5 text-cyan-400" />TEAM SUMMARY</div><div className="mt-4 space-y-2">{teamStats.map((t: any, i: number) => <div key={t.team.id} className="grid grid-cols-2 gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs md:grid-cols-5"><div className="font-bold text-white">#{i + 1} {t.team.name}</div><div>Sales <b className="text-cyan-300">{t.total}</b></div><div>Sayuru <b>{t.sayuru}</b></div><div>Govi <b>{t.govi}</b></div><div>Best <b className="text-emerald-300">{t.best?.agent.name || '—'}</b></div></div>)}</div></section>
    </> : <section className="rounded-3xl border border-indigo-500/20 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><CalendarDays className="h-5 w-5 text-indigo-400" />LIVE PRESENTATION</div><p className="mt-2 text-xs leading-5 text-slate-400">The Owner starts the Month-End Presentation from this page. Join the live meeting below using the meeting code shared in Page 5 Message Room.</p></section>}

    <LiveMeetingRoom monthlyPresentation presentationSlides={isOwner ? slides : []} />
  </div>;
};

const Review = ({ label, value }: { label: string; value: React.ReactNode }) => <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-2 truncate text-lg font-black text-white">{value}</div></div>;
