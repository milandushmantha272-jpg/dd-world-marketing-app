import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;
const norm = (v: any) => String(v ?? '').trim();
const num = (v: any) => Number(String(v ?? '').replace(/,/g, '').replace(/[^0-9.-]/g, '')) || 0;

function parseDelimited(text: string) {
  const lines = text.replace(/\r/g, '').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const delim = lines[0].includes('\t') ? '\t' : ',';
  const split = (line: string) => line.split(delim).map(x => x.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]);
  return lines.slice(1).map(line => {
    const cells = split(line);
    const row: Record<string, any> = {};
    headers.forEach((h, i) => { row[h || `column_${i}`] = cells[i] ?? ''; });
    return row;
  }).filter(r => Object.values(r).some(v => norm(v)));
}

function pick(row: Record<string, any>, candidates: string[]) {
  const key = Object.keys(row).find(k => candidates.some(c => k.toLowerCase().replace(/\s/g, '').includes(c.toLowerCase().replace(/\s/g, ''))));
  return key ? row[key] : '';
}

function normalizeReportRows(raw: Record<string, any>[]) {
  return raw.map((r, i) => {
    const name = norm(pick(r, ['name'])) || `Row ${i + 1}`;
    const agentCode = norm(pick(r, ['agentcode', 'agent code', 'code']));
    const appSales = num(pick(r, ['appactivation', 'app activation']));
    const ivrSales = num(pick(r, ['ivreactivation', 'ivr activation']));
    const appAmount = num(pick(r, ['amount1', 'app amount']));
    const ivrAmount = num(pick(r, ['ivramount', 'ivr amount']));
    const retentionIvr = num(pick(r, ['retentionivr', 'retention ivr amount']));
    const retentionApp = num(pick(r, ['retentionapp', 'retention app amount']));
    const reduction = num(pick(r, ['reduction']));
    const total = num(pick(r, ['total']));
    const finalized = num(pick(r, ['finalized', 'finalised'])) || total;
    return { ...r, name, agentCode, appSales, ivrSales, appAmount, ivrAmount, retentionIvr, retentionApp, reduction, total, finalized, agentPayment: appAmount + ivrAmount, teamLeaderCommission: retentionIvr + retentionApp };
  });
}

export default function CommissionPaymentPage() {
  const [me, setMe] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [product, setProduct] = useState<'sayuru' | 'govimithuru'>('sayuru');
  const [uploadError, setUploadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [ownerAddition, setOwnerAddition] = useState('');
  const [dialogRef, setDialogRef] = useState('');
  const [teamText, setTeamText] = useState('');
  const [ezGroups, setEzGroups] = useState([{ number: '', agents: [] as string[] }]);
  const [selectedTeam, setSelectedTeam] = useState('');

  const role = norm(me?.role).toLowerCase();
  const isOwner = role === 'owner';
  const isTL = role === 'team_leader';
  const isAgent = role === 'agent';
  const isDialog = role === 'dialog_officer';
  const report = reports[0];
  const reportRows = useMemo(() => Array.isArray(report?.report_rows) ? report.report_rows : [], [report]);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const [{ data: profile }, { data: rs }, { data: us }, { data: ts }] = await Promise.all([
      supabase.from('users').select('*').eq('auth_user_id', auth.user.id).maybeSingle(),
      supabase.from('commission_reports').select('*').eq('month_start', `${month}-01`).eq('product', product).order('uploaded_at', { ascending: false }).limit(1),
      supabase.from('users').select('id,name,agent_code,role,team_id').order('name'),
      supabase.from('teams').select('*').order('name'),
    ]);
    setMe(profile);
    setReports(rs || []); setUsers(us || []); setTeams(ts || []);
    if (rs?.[0]) {
      const [{ data: ss }, { data: ii }] = await Promise.all([
        supabase.from('commission_team_submissions').select('*').eq('report_id', rs[0].id).order('submitted_at', { ascending: false }),
        supabase.from('commission_payment_issues').select('*').eq('report_id', rs[0].id).order('reported_at', { ascending: false }),
      ]);
      setSubmissions(ss || []); setIssues(ii || []);
    } else { setSubmissions([]); setIssues([]); }
  };
  useEffect(() => { load(); }, [month, product]);

  const myRows = useMemo(() => {
    if (!isAgent) return reportRows;
    const code = norm(me?.agent_code);
    return reportRows.filter(r => code && norm(r.agentCode) === code);
  }, [reportRows, isAgent, me]);

  const teamAgents = useMemo(() => {
    if (!isTL) return [];
    return users.filter(u => u.role === 'agent' && u.team_id === me?.team_id);
  }, [users, isTL, me]);

  const selectedTeamObj = teams.find(t => t.id === selectedTeam) || teams.find(t => t.id === me?.team_id);

  const downloadReport = () => {
    if (!report) return;
    const rows = reportRows;
    const headers = ['Name','Agent Code','App Sales','App Amount','IVR Sales','IVR Amount','Retention IVR','Retention App','Reduction','Total','Finalized','Agent Payment','Team Leader Commission'];
    const csv = [headers.join(','), ...rows.map(r => [r.name,r.agentCode,r.appSales,r.appAmount,r.ivrSales,r.ivrAmount,r.retentionIvr,r.retentionApp,r.reduction,r.total,r.finalized,r.agentPayment,r.teamLeaderCommission].map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${month}-${product}-dialog-final-report.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    setUploadError(''); setBusy(true);
    try {
      const text = await file.text();
      const rows = normalizeReportRows(parseDelimited(text));
      if (!rows.length || !rows.some(r => r.agentCode)) throw new Error('CSV/TSV report එකේ Agent Code rows හමු වුණේ නැහැ.');
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Please login again.');
      const { error } = await supabase.from('commission_reports').upsert({ month_start: `${month}-01`, product, file_name: file.name, raw_file_text: text, report_rows: rows, uploaded_by: auth.user.id, status: 'RECEIVED' }, { onConflict: 'month_start,product' });
      if (error) throw error;
      await load();
    } catch (e: any) { setUploadError(e?.message || 'Report upload failed.'); }
    finally { setBusy(false); }
  };

  const approveReport = async () => {
    if (!report) return; setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from('commission_reports').update({ status: 'OWNER_APPROVED', owner_approved_by: auth.user?.id, owner_approved_at: new Date().toISOString(), owner_addition: num(ownerAddition) }).eq('id', report.id);
    await load(); setBusy(false);
  };

  const submitTeam = async () => {
    if (!report || !selectedTeamObj) return;
    const leader = users.find(u => u.id === selectedTeamObj.leader_id) || (isTL ? me : null);
    if (!leader) return alert('Team Leader not found for this team.');
    const lines = teamText.split('\n').map(x => x.trim()).filter(Boolean);
    const parsed: any[] = [];
    for (const line of lines) {
      const p = line.split(/[|,\t]/).map(x => x.trim());
      if (p.length < 3) continue;
      const code = p[1]; const row = reportRows.find(r => norm(r.agentCode) === code);
      if (!row) continue;
      parsed.push({ name: row.name, agentCode: code, amount: num(p[2]), appSales: row.appSales, ivrSales: row.ivrSales, agentPayment: row.agentPayment, teamLeaderCommission: row.teamLeaderCommission });
    }
    if (!parsed.length) return alert('Agent Name | Agent Code | Amount format එකෙන් අවම Agent 1ක් දාන්න.');
    const groups = ezGroups.filter(g => g.number.trim()).map(g => ({ number: g.number.trim(), agents: g.agents }));
    for (const g of groups) { const total = parsed.filter(p => g.agents.includes(p.agentCode)).reduce((s,p) => s + p.amount, 0); if (total > 150000) return alert(`eZ Cash ${g.number} group එක Rs.150,000 ඉක්මවා ඇත.`); }
    const total = parsed.reduce((s,p) => s+p.amount,0);
    const { error } = await supabase.from('commission_team_submissions').upsert({ report_id: report.id, team_id: selectedTeamObj.id, team_name: selectedTeamObj.name, team_leader_id: leader.id, ez_cash_groups: groups.map(g => ({...g, subtotal: parsed.filter(p=>g.agents.includes(p.agentCode)).reduce((s,p)=>s+p.amount,0)})), team_total: total, final_total: total, status: 'SUBMITTED', submitted_at: new Date().toISOString() }, { onConflict: 'report_id,team_leader_id' });
    if (error) alert(error.message); else { setTeamText(''); await load(); }
  };

  const markDialogPaid = async (id: string) => {
    await supabase.from('commission_team_submissions').update({ status: 'DIALOG_PAID', dialog_paid_at: new Date().toISOString(), dialog_reference: dialogRef }).eq('id', id);
    await load();
  };

  const markAgentPaid = async (id: string) => { await supabase.from('commission_team_submissions').update({ status: 'AGENT_PAID' }).eq('id', id); await load(); };

  const agentConfirm = async () => {
    if (!report || !me) return;
    const row = myRows[0]; if (!row) return;
    const { error } = await supabase.from('commission_payment_issues').insert({ report_id: report.id, agent_code: row.agentCode, agent_name: row.name, expected_amount: row.agentPayment, received_amount: row.agentPayment, reason: 'PAYMENT RECEIVED — Agent confirmation', reported_by: me.id, resolved: true, resolved_by: me.id, resolved_at: new Date().toISOString() });
    if (error) alert(error.message); else alert('Payment received confirmation saved.');
  };

  const reportIssue = async (row: any) => {
    const received = prompt(`Expected ${money(row.agentPayment)}. Received amount?`, String(row.agentPayment));
    if (received === null) return;
    const reason = prompt('Payment issue reason?'); if (!reason) return;
    const { error } = await supabase.from('commission_payment_issues').insert({ report_id: report.id, agent_code: row.agentCode, agent_name: row.name, expected_amount: row.agentPayment, received_amount: num(received), reason, reported_by: me.id });
    if (error) alert(error.message); else { alert('Issue sent to Team Leader + Owner.'); await load(); }
  };

  return <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
    <div className="max-w-7xl mx-auto space-y-5">
      <header className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="text-xs tracking-widest text-emerald-300">PAGE 7 · OFFICIAL</div>
        <h1 className="text-2xl font-bold mt-1">Commission / Payment</h1>
        <p className="text-sm text-slate-300 mt-1">Dialog Final Quality-Checked Report → Owner → Team Leader → Agent</p>
        <div className="flex flex-wrap gap-3 mt-4">
          <input type="month" value={month} onChange={e=>setMonth(e.target.value)} className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2" />
          <select value={product} onChange={e=>setProduct(e.target.value as any)} className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2"><option value="sayuru">Sayuru</option><option value="govimithuru">Govi Mithuru</option></select>
        </div>
      </header>

      {(isOwner || isDialog) && <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="font-semibold">Dialog Final Report</h2>
        <p className="text-sm text-slate-300">Ownerට ලැබුණු final report එක මේ මාසයට/මේ product එකට save වෙනවා. Agentට full report එක පෙන්වන්නේ නැහැ.</p>
        {isDialog && <input type="file" accept=".csv,.tsv,.txt" onChange={e=>e.target.files?.[0] && upload(e.target.files[0])} className="block w-full text-sm" />}
        {uploadError && <div className="text-red-300 text-sm">{uploadError}</div>}
        {report && <div className="flex flex-wrap gap-2 text-sm"><span className="px-3 py-1 rounded-full bg-emerald-500/20">{report.status}</span><span>{report.file_name}</span><button onClick={downloadReport} className="px-3 py-1 rounded-lg bg-white/10">Download phone copy</button></div>}
        {isOwner && report && <div className="flex gap-2"><input value={ownerAddition} onChange={e=>setOwnerAddition(e.target.value)} placeholder="Owner additional amount (optional)" className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3 py-2" /><button disabled={busy} onClick={approveReport} className="px-4 py-2 rounded-xl bg-emerald-600">✓ Owner Approve</button></div>}
      </section>}

      {isOwner && report && <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-semibold mb-3">Owner Monthly Calculation</h2><div className="overflow-auto"><table className="min-w-full text-sm"><thead><tr className="text-slate-400"><th className="text-left p-2">Agent</th><th>Code</th><th>App</th><th>IVR</th><th>Agent Amount</th><th>TL Commission</th></tr></thead><tbody>{reportRows.map((r:any)=><tr key={r.agentCode+r.name} className="border-t border-white/5"><td className="p-2">{r.name}</td><td>{r.agentCode || 'UNASSIGNED'}</td><td>{r.appSales}</td><td>{r.ivrSales}</td><td>{money(r.agentPayment)}</td><td>{money(r.teamLeaderCommission)}</td></tr>)}</tbody></table></div></section>}

      {isTL && report && report.status === 'OWNER_APPROVED' && <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"><h2 className="font-semibold">Team Payment → Owner</h2><select value={selectedTeam || me?.team_id || ''} onChange={e=>setSelectedTeam(e.target.value)} className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2"><option value={me?.team_id || ''}>My Team</option>{teams.filter(t=>t.id===me?.team_id).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="text-xs text-slate-400">එක් line එකක්: Agent Name | Agent Code | Amount</p><textarea value={teamText} onChange={e=>setTeamText(e.target.value)} rows={8} placeholder="Agent Name | 9127 | 85990" className="w-full rounded-xl bg-slate-900 border border-white/10 p-3 font-mono text-sm" />{ezGroups.map((g,i)=><div key={i} className="flex gap-2"><input value={g.number} onChange={e=>setEzGroups(gs=>gs.map((x,j)=>j===i?{...x,number:e.target.value}:x))} placeholder="EZ Cash Number" className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3 py-2" />{i===ezGroups.length-1 && <button onClick={()=>setEzGroups(gs=>[...gs,{number:'',agents:[]}])} className="px-3 rounded-xl bg-white/10">+ Number</button>}</div>)}<p className="text-xs text-amber-300">Maximum per eZ Cash number: Rs.150,000</p><button onClick={submitTeam} className="px-5 py-2 rounded-xl bg-emerald-600">SUBMIT TO OWNER</button></section>}

      {isOwner && report && <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3"><h2 className="font-semibold">Team Payment Review</h2>{submissions.length===0?<p className="text-sm text-slate-400">No Team Leader submission yet.</p>:submissions.map(s=><div key={s.id} className="rounded-xl border border-white/10 p-4"><div className="flex justify-between gap-3"><b>{s.team_name}</b><span>{money(s.final_total)}</span></div><pre className="text-xs text-slate-300 mt-2 whitespace-pre-wrap">{JSON.stringify(s.ez_cash_groups,null,2)}</pre><div className="flex gap-2"><button onClick={async()=>{await supabase.from('commission_team_submissions').update({status:'OWNER_APPROVED',owner_reviewed_by:me.id,owner_reviewed_at:new Date().toISOString(),owner_addition:num(ownerAddition),final_total:num(s.team_total)+num(ownerAddition)}).eq('id',s.id);load();}} className="px-3 py-1 rounded-lg bg-emerald-600">✓ Approve / Send Dialog</button><input value={dialogRef} onChange={e=>setDialogRef(e.target.value)} placeholder="Dialog reference" className="rounded-lg bg-slate-900 border border-white/10 px-2" /></div></div>)}</section>}

      {isDialog && submissions.some(s=>s.status==='OWNER_APPROVED') && <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-semibold mb-3">Dialog Payment Confirmation</h2>{submissions.filter(s=>s.status==='OWNER_APPROVED').map(s=><div key={s.id} className="flex items-center justify-between border-t border-white/5 py-3"><span>{s.team_name} · {money(s.final_total)}</span><button onClick={()=>markDialogPaid(s.id)} className="px-3 py-1 rounded-lg bg-emerald-600">Dialog Paid</button></div>)}</section>}

      {(isAgent || isTL) && report && report.status !== 'RECEIVED' && <section className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="font-semibold mb-3">{isAgent ? 'My Payment' : 'My Team Agent Payments'}</h2><div className="space-y-2">{(isAgent?myRows:teamAgents.map(u=>reportRows.find(r=>norm(r.agentCode)===norm(u.agent_code))).filter(Boolean)).map((r:any)=><div key={r.agentCode} className="rounded-xl border border-white/10 p-4"><div className="font-medium">{r.name} · {r.agentCode}</div><div className="text-sm text-slate-300 mt-1">App: {r.appSales} · IVR: {r.ivrSales}</div><div className="text-lg font-bold mt-2">Agent Amount: {money(r.agentPayment)}</div>{isAgent && <div className="flex gap-2 mt-3"><button onClick={agentConfirm} className="px-3 py-2 rounded-lg bg-emerald-600">✓ PAYMENT RECEIVED</button><button onClick={()=>reportIssue(r)} className="px-3 py-2 rounded-lg bg-red-500/80">REPORT PAYMENT ISSUE</button></div>}</div>)}</div></section>}

      {(isOwner || isTL) && issues.length>0 && <section className="rounded-2xl border border-red-400/20 bg-red-500/5 p-5"><h2 className="font-semibold text-red-200">Payment Issues</h2>{issues.map(i=><div key={i.id} className="text-sm py-2 border-t border-white/5">{i.agent_name} ({i.agent_code}) · Expected {money(i.expected_amount)} · Received {money(i.received_amount)} · {i.reason}</div>)}</section>}
    </div>
  </div>;
}
