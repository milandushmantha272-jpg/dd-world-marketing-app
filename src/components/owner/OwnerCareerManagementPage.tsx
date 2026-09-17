import React, { useEffect, useMemo, useState } from 'react';
import { Award, CheckCircle2, ClipboardCheck, Crown, DollarSign, Link2, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

type Employee = any;
type ReviewPeriod = 'ONE_TO_SIX_MONTHS' | 'SIX_MONTHS' | 'ONE_YEAR' | 'TWO_YEARS';

const PERIODS: { key: ReviewPeriod; label: string; note: string }[] = [
  { key: 'ONE_TO_SIX_MONTHS', label: '1–6 Months', note: 'Initial performance + discipline review' },
  { key: 'SIX_MONTHS', label: '6 Months', note: 'Salary review point' },
  { key: 'ONE_YEAR', label: '1 Year', note: 'Annual salary + performance review' },
  { key: 'TWO_YEARS', label: '2 Years', note: 'Team Leader eligibility review' },
];

const SCORE_FIELDS = [
  ['field_sales_score', 'Field Sales / Active Sales'],
  ['dialog_usage_score', 'Dialog Usage / Revenue'],
  ['revenue_score', 'Revenue / Verified Business'],
  ['customer_handling_score', 'Customer Handling'],
  ['company_discipline_score', 'Company Discipline'],
] as const;

const clean = (v: unknown) => String(v ?? '').trim();

const addMonths = (isoDate: string | undefined, months: number) => {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

export const OwnerCareerManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [period, setPeriod] = useState<ReviewPeriod>('SIX_MONTHS');
  const [scores, setScores] = useState<Record<string, number>>({ field_sales_score: 0, dialog_usage_score: 0, revenue_score: 0, customer_handling_score: 0, company_discipline_score: 0 });
  const [salaryAmount, setSalaryAmount] = useState('');
  const [salaryPercent, setSalaryPercent] = useState('');
  const [salaryAction, setSalaryAction] = useState<'NO_CHANGE' | 'INCREASE' | 'HOLD' | 'DEFERRED'>('NO_CHANGE');
  const [promotionEligible, setPromotionEligible] = useState(false);
  const [designation, setDesignation] = useState('');
  const [notes, setNotes] = useState('');
  const [managerId, setManagerId] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [commissionManagerId, setCommissionManagerId] = useState('');
  const [commissionSuccessorId, setCommissionSuccessorId] = useState('');
  const [commissionAmount, setCommissionAmount] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [commissionNotes, setCommissionNotes] = useState('');
  const [commissionStatus, setCommissionStatus] = useState<'DRAFT' | 'DISCUSSION' | 'APPROVED' | 'ACTIVE'>('DISCUSSION');

  const isOwner = currentUser?.role === 'owner';
  const teamLeaders = useMemo(() => employees.filter((e) => e.role === 'team_leader'), [employees]);
  const selected = employees.find((e) => e.id === selectedEmployeeId);
  const scoreAverage = useMemo(() => SCORE_FIELDS.reduce((n, [key]) => n + Number(scores[key] || 0), 0) / SCORE_FIELDS.length, [scores]);

  const load = async () => {
    if (!isOwner) return;
    setBusy(true); setError('');
    try {
      const [u, r, a] = await Promise.all([
        supabase.from('users').select('*').order('name'),
        supabase.from('employee_career_reviews').select('*').order('review_date', { ascending: false }),
        supabase.from('team_leader_commission_agreements').select('*').order('created_at', { ascending: false }),
      ]);
      for (const result of [u, r, a]) if (result.error) throw result.error;
      setEmployees(u.data || []); setReviews(r.data || []); setAgreements(a.data || []);
    } catch (e: any) { setError(e?.message || 'Unable to load career data.'); }
    finally { setBusy(false); }
  };

  useEffect(() => { void load(); }, [isOwner]);

  useEffect(() => {
    if (!selected) return;
    setDesignation(clean(selected.designation || selected.job_position));
    setManagerId(clean(selected.reports_to_user_id));
    const existing = reviews.find((r) => r.employee_id === selected.id && r.review_period === period);
    if (existing) {
      setScores({
        field_sales_score: Number(existing.field_sales_score || 0),
        dialog_usage_score: Number(existing.dialog_usage_score || 0),
        revenue_score: Number(existing.revenue_score || 0),
        customer_handling_score: Number(existing.customer_handling_score || 0),
        company_discipline_score: Number(existing.company_discipline_score || 0),
      });
      setSalaryAmount(String(existing.salary_increase_amount || ''));
      setSalaryPercent(String(existing.salary_increase_percent || ''));
      setSalaryAction(existing.salary_action || 'NO_CHANGE');
      setPromotionEligible(Boolean(existing.promotion_eligible));
      setDesignation(clean(existing.recommended_designation));
      setNotes(clean(existing.notes));
    } else {
      setScores({ field_sales_score: 0, dialog_usage_score: 0, revenue_score: 0, customer_handling_score: 0, company_discipline_score: 0 });
      setSalaryAmount('');
      setSalaryPercent('');
      setSalaryAction('NO_CHANGE');
      setPromotionEligible(false);
      setNotes('');
    }
  }, [selectedEmployeeId, period, reviews, selected]);

  const saveReview = async () => {
    if (!isOwner || !selected) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const reviewDate = new Date().toISOString().slice(0, 10);
      const increaseAmount = Math.max(0, Number(salaryAmount) || 0);
      const payload = {
        employee_id: selected.id,
        review_period: period,
        review_date: reviewDate,
        ...scores,
        salary_increase_amount: increaseAmount,
        salary_increase_percent: Math.max(0, Number(salaryPercent) || 0),
        salary_action: salaryAction,
        promotion_eligible: promotionEligible,
        recommended_designation: designation || null,
        approved_by_owner: currentUser?.id || null,
        owner_decision_at: new Date().toISOString(),
        notes: notes || null,
      };
      const { error: upsertError } = await supabase.from('employee_career_reviews').upsert(payload, { onConflict: 'employee_id,review_period,review_date' });
      if (upsertError) throw upsertError;
      const userPatch: any = { designation: designation || null };
      if (period === 'ONE_TO_SIX_MONTHS') userPatch.next_salary_review_at = addMonths(selected.created_at, 6);
      if (period === 'SIX_MONTHS') userPatch.next_salary_review_at = addMonths(selected.created_at, 12);
      if (period === 'ONE_YEAR') userPatch.next_salary_review_at = addMonths(selected.created_at, 24);
      if (salaryAction === 'INCREASE' && increaseAmount > 0) userPatch.base_salary = Math.max(0, Number(selected.base_salary || 0) + increaseAmount);
      if (salaryAction === 'INCREASE') userPatch.salary_effective_from = reviewDate;
      if (period === 'TWO_YEARS' && promotionEligible && selected.role === 'agent') userPatch.career_stage = 'TL_ELIGIBILITY_REVIEWED';
      const { error: updateError } = await supabase.from('users').update(userPatch).eq('id', selected.id);
      if (updateError) throw updateError;
      setSuccess(`${selected.name} – ${PERIODS.find((p) => p.key === period)?.label} review saved. Score ${scoreAverage.toFixed(1)}%.`);
      await load();
    } catch (e: any) { setError(e?.message || 'Unable to save review.'); }
    finally { setBusy(false); }
  };

  const assignUnderManager = async () => {
    if (!isOwner || !selected || !managerId) return;
    if (selected.role !== 'team_leader') { setError('Only a Team Leader can be placed under a Team Manager.'); return; }
    if (selected.id === managerId) { setError('A Team Leader cannot report to themselves.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const manager = teamLeaders.find((t) => t.id === managerId);
      const patch = { reports_to_user_id: managerId, management_role: 'TEAM_LEADER', designation: 'Team Leader' };
      const { error: e1 } = await supabase.from('users').update(patch).eq('id', selected.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('users').update({ management_role: 'TEAM_MANAGER', designation: 'Team Manager' }).eq('id', managerId);
      if (e2) throw e2;
      setSuccess(`${selected.name} is now a Team Leader under ${manager?.name || 'the selected Team Manager'}.`);
      await load();
    } catch (e: any) { setError(e?.message || 'Unable to update Team Manager hierarchy.'); }
    finally { setBusy(false); }
  };

  const saveCommissionAgreement = async () => {
    if (!isOwner || !commissionManagerId || !commissionSuccessorId || commissionManagerId === commissionSuccessorId) { setError('Select two different Team Leaders.'); return; }
    setBusy(true); setError(''); setSuccess('');
    try {
      const activeNow = commissionStatus === 'APPROVED' || commissionStatus === 'ACTIVE';
      const { error: e } = await supabase.from('team_leader_commission_agreements').insert({
        manager_user_id: commissionManagerId,
        successor_team_leader_id: commissionSuccessorId,
        commission_amount: Math.max(0, Number(commissionAmount) || 0),
        commission_percent: Math.max(0, Number(commissionPercent) || 0),
        decision_status: commissionStatus,
        decision_notes: commissionNotes || null,
        decided_by_owner: currentUser?.id || null,
        owner_decided_at: activeNow ? new Date().toISOString() : null,
        decided_with_manager: commissionStatus !== 'DRAFT',
        permanent: true,
      });
      if (e) throw e;
      if (activeNow) {
        const { error: managerUpdateError } = await supabase.from('users').update({ permanent_commission_eligible: true, permanent_commission_effective_from: new Date().toISOString().slice(0, 10) }).eq('id', commissionManagerId);
        if (managerUpdateError) throw managerUpdateError;
      }
      setSuccess(activeNow ? 'Permanent Manager commission agreement approved and recorded.' : 'Commission discussion/agreement draft recorded; it is not active until Owner approval.');
      setCommissionAmount(''); setCommissionPercent(''); setCommissionNotes(''); await load();
    } catch (e: any) { setError(e?.message || 'Unable to save commission agreement.'); }
    finally { setBusy(false); }
  };

  if (!isOwner) return null;

  return <section className="dd-page-shell min-h-screen px-4 py-5 md:px-6 md:py-8">
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="dd-card rounded-[26px] p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">OWNER ONLY · CAREER & PEOPLE CONTROL</div><h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Agent Career → Salary → Team Leader → Team Manager</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">Performance evidence covers active field sales, Dialog usage/revenue, customer handling and company discipline. Salary amounts remain Owner-controlled; no percentage is invented here. At 2 years, an eligible Agent can enter the Team Leader review process.</p></div>
          <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-bold text-white"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
        </div>
      </header>

      {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
      {success && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{success}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center gap-2 text-sm font-black text-white"><Users className="h-4 w-4 text-cyan-300"/> Employee</div>
          <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(e.target.value)} className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="">Select employee</option>{employees.filter((e) => e.role !== 'owner' && e.role !== 'dialog_officer').map((e) => <option key={e.id} value={e.id}>{e.name} · {e.role} · {e.agent_code || 'No code'}</option>)}</select>
          {selected && <div className="mt-4 space-y-2 text-xs text-slate-300"><div><b className="text-white">Current salary:</b> {selected.base_salary ? `Rs. ${Number(selected.base_salary).toLocaleString()}` : 'Not set'}</div><div><b className="text-white">Joined:</b> {selected.created_at ? new Date(selected.created_at).toLocaleDateString() : 'Not recorded'}</div><div><b className="text-white">Career stage:</b> {selected.career_stage || 'AGENT_0_TO_6_MONTHS'}</div><div><b className="text-white">Next salary review:</b> {selected.next_salary_review_at || 'Not set'}</div><div><b className="text-white">Manager:</b> {employees.find((e) => e.id === selected.reports_to_user_id)?.name || 'None'}</div></div>}
        </section>
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex flex-wrap gap-2">{PERIODS.map((p) => <button key={p.key} type="button" onClick={() => setPeriod(p.key)} className={`rounded-xl border px-3 py-2 text-xs font-black ${period === p.key ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>{p.label}</button>)}</div>
          <div className="mt-4 text-xs text-slate-400">{PERIODS.find((p) => p.key === period)?.note}</div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">{SCORE_FIELDS.map(([key, label]) => <label key={key} className="rounded-2xl border border-slate-800 bg-slate-950 p-3"><span className="block text-[10px] font-black uppercase text-slate-500">{label}</span><input type="number" min="0" max="100" value={scores[key]} onChange={(e) => setScores((v) => ({ ...v, [key]: Math.min(100, Math.max(0, Number(e.target.value) || 0)) }))} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white" /></label>)}</div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-white"><ClipboardCheck className="h-4 w-4 text-emerald-300"/> Owner decision</div>
        <div className="mt-4 grid gap-4 md:grid-cols-4"><label><span className="text-[10px] font-black uppercase text-slate-500">Salary increase (Rs.)</span><input value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} inputMode="decimal" placeholder="Enter only the increase" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label><label><span className="text-[10px] font-black uppercase text-slate-500">Salary increase (%)</span><input value={salaryPercent} onChange={(e) => setSalaryPercent(e.target.value)} inputMode="decimal" placeholder="Optional" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label><label><span className="text-[10px] font-black uppercase text-slate-500">Salary action</span><select value={salaryAction} onChange={(e) => setSalaryAction(e.target.value as any)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="NO_CHANGE">No change</option><option value="INCREASE">Increase</option><option value="HOLD">Hold</option><option value="DEFERRED">Deferred</option></select></label><label><span className="text-[10px] font-black uppercase text-slate-500">Designation</span><input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="Agent / Team Leader / Team Manager" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label></div>
        <label className="mt-4 flex items-center gap-3 text-sm text-white"><input type="checkbox" checked={promotionEligible} onChange={(e) => setPromotionEligible(e.target.checked)} /> Promotion eligibility approved</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Owner review notes" className="mt-4 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" />
        <button type="button" disabled={busy || !selected} onClick={() => void saveReview()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4"/> Save career review</button>
      </section>

      <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-white"><Crown className="h-4 w-4 text-indigo-300"/> Team Leader → Team Manager structure</div>
        <p className="mt-2 text-xs leading-5 text-slate-400">A new Team Leader can remain a Team Leader in the system while reporting to an existing Team Manager. The existing leader is marked as <b className="text-white">Team Manager</b>; the successor remains responsible for their own team.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3"><div><span className="text-[10px] font-black uppercase text-slate-500">Selected Team Leader</span><div className="mt-1 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white">{selected?.role === 'team_leader' ? selected.name : 'Select a Team Leader above'}</div></div><label><span className="text-[10px] font-black uppercase text-slate-500">Report to existing Team Manager</span><select value={managerId} onChange={(e) => setManagerId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="">Select manager</option>{teamLeaders.filter((e) => e.id !== selected?.id).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label><button type="button" disabled={busy || !selected || selected.role !== 'team_leader' || !managerId} onClick={() => void assignUnderManager()} className="self-end rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Link2 className="mr-2 inline h-4 w-4"/> Apply hierarchy</button></div>
      </section>

      <section className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2 text-sm font-black text-white"><DollarSign className="h-4 w-4 text-amber-300"/> Permanent Team Manager Commission Agreement</div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Owner and the existing Team Manager can discuss the commission. A discussion draft is not active. The agreement becomes permanent/active only when Owner approves it.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4"><label><span className="text-[10px] font-black uppercase text-slate-500">Team Manager</span><select value={commissionManagerId} onChange={(e) => setCommissionManagerId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="">Select</option>{teamLeaders.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label><span className="text-[10px] font-black uppercase text-slate-500">New Team Leader</span><select value={commissionSuccessorId} onChange={(e) => setCommissionSuccessorId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="">Select</option>{teamLeaders.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label><label><span className="text-[10px] font-black uppercase text-slate-500">Commission (Rs.)</span><input value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label><label><span className="text-[10px] font-black uppercase text-slate-500">Commission (%)</span><input value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /></label></div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]"><textarea value={commissionNotes} onChange={(e) => setCommissionNotes(e.target.value)} placeholder="Owner + Manager discussion notes / effective conditions" className="min-h-20 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /><div className="flex gap-2"><select value={commissionStatus} onChange={(e) => setCommissionStatus(e.target.value as any)} className="h-12 rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"><option value="DISCUSSION">Discussion</option><option value="APPROVED">Approved</option><option value="ACTIVE">Active</option></select><button type="button" disabled={busy} onClick={() => void saveCommissionAgreement()} className="h-12 whitespace-nowrap rounded-xl bg-amber-600 px-4 text-sm font-black text-white">Save agreement</button></div></div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><Award className="h-4 w-4 text-emerald-300"/> Review timeline</h2><div className="mt-4 space-y-2">{PERIODS.map((p) => { const r = reviews.find((x) => x.employee_id === selectedEmployeeId && x.review_period === p.key); return <div key={p.key} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs"><span className="font-black text-white">{p.label}</span>{r ? <span className="text-emerald-300">{Number(r.overall_score || 0).toFixed(1)}% · {r.salary_action}</span> : <span className="text-slate-500">Not reviewed</span>}</div>; })}</div></section>
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><h2 className="flex items-center gap-2 text-sm font-black text-white"><ShieldCheck className="h-4 w-4 text-cyan-300"/> Current commission agreements</h2><div className="mt-4 space-y-2">{agreements.slice(0, 8).map((a) => <div key={a.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"><div className="font-black text-white">{employees.find((e) => e.id === a.manager_user_id)?.name || 'Manager'} → {employees.find((e) => e.id === a.successor_team_leader_id)?.name || 'TL'}</div><div className="mt-1">Rs. {Number(a.commission_amount || 0).toLocaleString()} · {Number(a.commission_percent || 0)}% · {a.decision_status} · Permanent</div></div>)}{agreements.length === 0 && <div className="text-xs text-slate-500">No permanent agreements recorded yet.</div>}</div></section>
      </div>
    </div>
  </section>;
};