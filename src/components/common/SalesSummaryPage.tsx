import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CheckCircle2, Clock3, Users, UserRound, TrendingUp, ShieldCheck, Activity, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const ACTIVE = ['active', 'verified', 'confirmed', 'completed', 'sale_confirmed'];
const statusOf = (s: any) => String(s.verificationStatus || s.status || '').toLowerCase();
const isActiveSale = (s: any) => ACTIVE.includes(statusOf(s));
const saleDate = (s: any) => String(s.saleDate || s.date || s.createdAt || '').slice(0, 10);
const qty = (s: any) => Math.max(0, Number(s.quantity) || 1);
const monthOf = (d: string) => d.slice(0, 7);
const weekOfMonth = (d: string) => { const day = Number(d.slice(8, 10)); return day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4; };
const field = (s: any, keys: string[]) => { for (const k of keys) if (s?.[k] !== undefined && s?.[k] !== null && s?.[k] !== '') return s[k]; return null; };

export const SalesSummaryPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { sales, users, teams, updateProductSaleVerification } = useData();
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const role = currentUser?.role;

  const scoped = useMemo(() => {
    if (!currentUser) return [];
    if (role === 'owner') return sales;
    if (role === 'team_leader' || role === 'junior_team_leader') return sales.filter((s: any) => s.agentId === currentUser.id || s.teamId === currentUser.teamId);
    return sales.filter((s: any) => s.agentId === currentUser.id);
  }, [sales, currentUser, role]);

  const filtered = useMemo(() => scoped.filter((s: any) => (selectedTeam === 'all' || s.teamId === selectedTeam) && (selectedAgent === 'all' || s.agentId === selectedAgent)), [scoped, selectedTeam, selectedAgent]);
  const active = useMemo(() => filtered.filter(isActiveSale), [filtered]);
  const pending = useMemo(() => filtered.filter((s: any) => !isActiveSale(s)), [filtered]);
  const current = useMemo(() => active.filter((s: any) => monthOf(saleDate(s)) === month), [active, month]);

  const quality = useMemo(() => {
    const usageValues = active.map((s: any) => field(s, ['usageStatus','customerUsageStatus','usage_status','usage'])).filter(v => v !== null);
    const retentionValues = active.map((s: any) => field(s, ['retentionStatus','customerRetentionStatus','retention_status','retention'])).filter(v => v !== null);
    const revenueValues = active.map((s: any) => field(s, ['revenueQuality','revenueQualityStatus','revenue_quality','revenueStatus'])).filter(v => v !== null);
    const complaints = filtered.filter((s: any) => Boolean(field(s, ['complaint','complaintStatus','customerComplaint','hasComplaint']))).length;
    const duplicateNumbers = new Set<string>(); const duplicateIds = new Set<string>();
    filtered.forEach((s: any) => { const n = String(s.msisdn || s.customerMobile || '').trim(); if (n) { if (duplicateNumbers.has(n)) duplicateIds.add(n); else duplicateNumbers.add(n); } });
    const usageGood = usageValues.filter(v => ['active','used','yes','good','retained'].includes(String(v).toLowerCase())).length;
    const retentionGood = retentionValues.filter(v => ['active','retained','yes','good'].includes(String(v).toLowerCase())).length;
    const revenueGood = revenueValues.filter(v => ['good','quality','active','yes'].includes(String(v).toLowerCase())).length;
    return { usageValues, retentionValues, revenueValues, usageGood, retentionGood, revenueGood, complaints, duplicates: duplicateIds.size, hasDialogQualityData: usageValues.length > 0 || retentionValues.length > 0 || revenueValues.length > 0 };
  }, [active, filtered]);

  const stats = useMemo(() => ({
    today: active.filter(s => saleDate(s) === today).reduce((n,s) => n + qty(s), 0),
    weeks: [1,2,3,4].map(w => current.filter(s => weekOfMonth(saleDate(s)) === w).reduce((n,s) => n + qty(s), 0)),
    monthly: current.reduce((n,s) => n + qty(s), 0),
    total: active.reduce((n,s) => n + qty(s), 0),
    activations: filtered.reduce((n,s) => n + qty(s), 0),
  }), [active, filtered, current, today]);

  const agents = useMemo(() => users.filter((u: any) => u.role === 'agent' && (role !== 'team_leader' && role !== 'junior_team_leader' || u.teamId === currentUser?.teamId)), [users, role, currentUser?.teamId]);
  if (!currentUser) return null;

  return <div className="space-y-5 pb-10 text-slate-100">
    <section className="rounded-3xl border border-emerald-500/20 bg-slate-900 p-5 shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-emerald-400"><ShieldCheck className="h-4 w-4"/> Page 4 · Sales Quality & Performance Center</div><h2 className="mt-1 text-2xl font-black text-white">Sales → Activation → Usage → Retention → Quality</h2><p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">Sales quantity alone is not the company success measure. Official Dialog usage, retention and revenue-quality information is shown only when supplied by an official report/data source; the App never invents these values.</p></div><div className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-right"><div className="text-[10px] font-bold text-slate-500">TODAY</div><div className="font-mono text-sm font-black text-white">{today}</div></div></div>
    </section>

    {role === 'owner' && <div className="grid gap-3 sm:grid-cols-2"><select value={selectedTeam} onChange={e => {setSelectedTeam(e.target.value);setSelectedAgent('all');}} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-bold text-white"><option value="all">All Teams</option>{teams.map((t:any)=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select value={selectedAgent} onChange={e=>setSelectedAgent(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-xs font-bold text-white"><option value="all">All Agents</option>{agents.filter((a:any)=>selectedTeam==='all'||a.teamId===selectedTeam).map((a:any)=><option key={a.id} value={a.id}>{a.agentCode||'Agent'} — {a.name}</option>)}</select></div>}

    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4"><Kpi icon={<CalendarDays/>} label="Today Active" value={stats.today}/><Kpi icon={<Activity/>} label="Monthly Active" value={stats.monthly}/><Kpi icon={<TrendingUp/>} label="All-Time Active" value={stats.total}/><Kpi icon={<Clock3/>} label="Pending Activation" value={pending.reduce((n,s)=>n+qty(s),0)}/></div>

    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-black"><CalendarDays className="h-4 w-4 text-emerald-400"/> Current Month · 4 Weeks</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{stats.weeks.map((v,i)=><div key={i} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Week {i+1}</div><div className="mt-1 text-2xl font-black">{v}</div><div className="text-[10px] text-slate-500">Active units</div></div>)}</div></section>

    {role === 'owner' && <section className="rounded-3xl border border-amber-500/30 bg-slate-900 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="text-sm font-black text-white">Owner · Sales Verification Queue</h3><p className="mt-1 text-xs leading-5 text-slate-400">නිල Dialog report එක සමඟ සැසඳීමෙන් පසුව පමණක් Confirm කරන්න. Confirmation සඳහා report reference එකක් අවශ්‍යයි.</p></div>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-300">{sales.filter((s:any)=>!['SALE_CONFIRMED','COMPLETED','CONFIRMED','REJECTED'].includes(String(s.verificationStatus||s.status||'').toUpperCase())).length} To Review</span>
      </div>
      <div className="mt-4 space-y-3">
        {sales.filter((s:any)=>!['SALE_CONFIRMED','COMPLETED','CONFIRMED','REJECTED'].includes(String(s.verificationStatus||s.status||'').toUpperCase())).slice().reverse().map((sale:any)=> <div key={sale.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-xs font-black text-white">{sale.agentName||sale.agentId} · {sale.productType||sale.productName||'Sale'}</div><div className="mt-1 text-[11px] text-slate-400">{sale.saleDate||sale.date||'Date unavailable'} · {sale.channel||sale.activationMethod||'—'} · Qty {sale.quantity||1}</div><div className="mt-1 break-all text-[10px] text-slate-500">Customer: {sale.customerMobile||sale.msisdn||'—'} · Status: {sale.verificationStatus||sale.status||'PENDING'}</div></div>
          <div className="flex flex-wrap gap-2"><button type="button" onClick={async()=>{const note=window.prompt('Dialog official report reference / row ID (required):');if(!note?.trim())return;const ok=await updateProductSaleVerification(sale.id,'SALE_CONFIRMED',currentUser?.name,'Dialog official report reference: '+note.trim());if(!ok)window.alert('Could not confirm sale. Please check permissions/data.');}} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-black text-white">Confirm from Dialog Report</button><button type="button" onClick={async()=>{const note=window.prompt('Reason for review (required):');if(!note?.trim())return;const ok=await updateProductSaleVerification(sale.id,'REVIEW_REQUIRED',currentUser?.name,note.trim());if(!ok)window.alert('Could not mark for review.');}} className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] font-black text-amber-200">Review Required</button><button type="button" onClick={async()=>{const note=window.prompt('Reason for rejection (required):');if(!note?.trim())return;const ok=await updateProductSaleVerification(sale.id,'REJECTED',currentUser?.name,note.trim());if(!ok)window.alert('Could not reject sale.');}} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] font-black text-rose-200">Reject</button></div></div>
        </div>)}
        {sales.filter((s:any)=>!['SALE_CONFIRMED','COMPLETED','CONFIRMED','REJECTED'].includes(String(s.verificationStatus||s.status||'').toUpperCase())).length===0 && <p className="rounded-xl bg-slate-950 p-4 text-xs text-slate-400">No sales are awaiting review.</p>}
      </div>
    </section>}

    <section className="rounded-3xl border border-cyan-500/20 bg-slate-900 p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-black"><CheckCircle2 className="h-4 w-4 text-cyan-400"/> Quality Signals</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Quality label="Official Usage Data" value={quality.usageValues.length ? `${quality.usageGood}/${quality.usageValues.length}` : 'Not supplied'} /><Quality label="Retention Data" value={quality.retentionValues.length ? `${quality.retentionGood}/${quality.retentionValues.length}` : 'Not supplied'} /><Quality label="Revenue Quality" value={quality.revenueValues.length ? `${quality.revenueGood}/${quality.revenueValues.length}` : 'Not supplied'} /><Quality label="Complaints / Duplicate" value={`${quality.complaints} / ${quality.duplicates}`} /></div><div className={`mt-4 rounded-2xl border p-4 text-xs ${quality.hasDialogQualityData ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200' : 'border-amber-500/20 bg-amber-500/5 text-amber-200'}`}>{quality.hasDialogQualityData ? 'Official quality fields are available in the loaded sales/report data.' : 'Dialog official Usage / Retention / Revenue Quality data has not been supplied to this dataset yet. No artificial score is calculated.'}</div></section>

    {(role === 'owner' || role === 'team_leader' || role === 'junior_team_leader') && <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h3 className="mb-4 flex items-center gap-2 text-sm font-black"><UserRound className="h-4 w-4 text-emerald-400"/>{role === 'owner' ? 'Owner · Agent Quality/Performance' : 'Team Leader · Agent Quality/Performance'}</h3><div className="space-y-2">{agents.filter((a:any)=>selectedTeam==='all'||a.teamId===selectedTeam).map((agent:any)=>{const rows=active.filter((s:any)=>s.agentId===agent.id);const m=rows.filter((s:any)=>monthOf(saleDate(s))===month).reduce((n,s)=>n+qty(s),0);const p=filtered.filter((s:any)=>s.agentId===agent.id&&!isActiveSale(s)).reduce((n,s)=>n+qty(s),0);const usage=rows.map((s:any)=>field(s,['usageStatus','customerUsageStatus','usage_status','usage'])).filter(v=>v!==null).length;const retention=rows.map((s:any)=>field(s,['retentionStatus','customerRetentionStatus','retention_status','retention'])).filter(v=>v!==null).length;return <div key={agent.id} className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs md:grid-cols-5"><div className="col-span-2 font-bold text-white">{agent.agentCode||'—'} · {agent.name}</div><div>Month <b className="text-emerald-400">{m}</b></div><div>Pending <b className="text-amber-300">{p}</b></div><div>Usage/Retention <b>{usage}/{retention}</b></div></div>})}</div></section>}

    <section className="rounded-3xl border border-amber-500/20 bg-slate-900 p-5"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-amber-400"/><div><h3 className="text-sm font-black">Quality / Compliance Rules</h3><p className="mt-1 text-xs leading-5 text-slate-400">Correct customer information, customer consent, correct activation, GPS/attendance compliance and follow-up are part of the Sales Rep standard. Suspicious duplicate numbers and unresolved quality issues remain visible for Owner/Team Leader review.</p></div></div></section>
  </div>;
};

const Kpi=({icon,label,value}:{icon:React.ReactNode;label:string;value:number})=><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg"><div className="mb-2 flex items-center justify-between text-emerald-400">{React.cloneElement(icon as React.ReactElement<any>,{className:'h-5 w-5'})}<span className="text-[10px] font-black uppercase text-slate-500">Live</span></div><div className="text-[11px] font-bold text-slate-400">{label}</div><div className="mt-1 text-3xl font-black text-white">{value}</div></div>;
const Quality=({label,value}:{label:string;value:string})=><div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">{label}</div><div className="mt-2 text-lg font-black text-white">{value}</div></div>;
