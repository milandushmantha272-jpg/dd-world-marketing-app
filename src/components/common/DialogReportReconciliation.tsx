import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../services/supabase';
import type { ProductSale, User } from '../../types';

type Product = 'govimithuru' | 'sayuru';
type Method = 'ivr' | 'app';
type Dimension = 'agent' | 'mobile_prefix';
type ReportRow = { id?: string; report_period: string; product: Product; method: Method; dimension: Dimension; label: string; subscriber_count: number; source_filename?: string; imported_at?: string };

const clean = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const csvRows = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(cell.trim()); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(v => v !== '')) rows.push(row);
  return rows;
};
const methodOf = (s: ProductSale): Method | null => {
  const raw = clean([s.activationMethod, s.channel, s.dialCode, s.productName].join(' '));
  if (raw.includes('ivr') || raw.includes('keypaddial') || raw.includes('ussd')) return 'ivr';
  if (raw.includes('app') || raw.includes('appshare') || raw.includes('linkshare')) return 'app';
  return null;
};
const productOf = (s: ProductSale): Product | null => {
  const raw = clean([s.productType, s.productName].join(' '));
  if (raw.includes('govimithuru') || raw.includes('govi')) return 'govimithuru';
  if (raw.includes('sayuru') || raw.includes('sayura')) return 'sayuru';
  return null;
};
const quantity = (s: ProductSale) => Math.max(1, Number(s.quantity) || 1);

export const DialogReportReconciliation: React.FC<{ sales: ProductSale[]; users: User[]; isOwner: boolean }> = ({ sales, users, isOwner }) => {
  const [product, setProduct] = useState<Product>('govimithuru');
  const [method, setMethod] = useState<Method>('ivr');
  const [dimension, setDimension] = useState<Dimension>('agent');
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filename, setFilename] = useState('');

  const load = async () => {
    setBusy(true);
    const { data, error } = await supabase.from('dialog_report_import_rows').select('*')
      .eq('report_period', period).eq('product', product).eq('method', method).eq('dimension', dimension);
    if (error) setMessage('Saved reports unavailable: ' + error.message);
    else { setRows((data || []) as ReportRow[]); setMessage(''); }
    setBusy(false);
  };
  useEffect(() => { void load(); }, [period, product, method, dimension]);

  const parsedSales = useMemo(() => sales.filter(s => {
    const date = String(s.saleDate || s.date || '').slice(0, 7);
    return date === period && productOf(s) === product && methodOf(s) === method;
  }), [sales, period, product, method]);

  const appCounts = useMemo(() => {
    const result = new Map<string, number>();
    parsedSales.forEach(s => {
      const user = users.find(u => u.id === s.agentId);
      const label = String(s.agentName || user?.name || s.agentCode || s.agentId || 'Unknown');
      const key = clean(label);
      result.set(key, (result.get(key) || 0) + quantity(s));
    });
    return result;
  }, [parsedSales, users]);

  const comparisons = useMemo(() => rows.map(r => {
    if (dimension === 'mobile_prefix') return { ...r, appCount: null as number | null, delta: null as number | null, match: null as boolean | null };
    const labelKey = clean(r.label);
    let count = 0;
    for (const [key, value] of appCounts) {
      const user = users.find(u => clean(u.name) === key || clean(u.agentCode) === key);
      const candidates = [key, clean(user?.name), clean(user?.agentCode)].filter(Boolean);
      if (candidates.some(c => c === labelKey || (c.length >= 4 && labelKey.includes(c)) || (labelKey.length >= 4 && c.includes(labelKey)))) count += value;
    }
    return { ...r, appCount: count, delta: count - Number(r.subscriber_count || 0), match: count === Number(r.subscriber_count || 0) };
  }), [rows, dimension, appCounts, users]);

  const appTotal = parsedSales.reduce((n, s) => n + quantity(s), 0);
  const reportTotal = rows.reduce((n, r) => n + Number(r.subscriber_count || 0), 0);
  const hasReport = rows.length > 0;

  const importFile = async (file?: File) => {
    if (!file) return;
    if (!isOwner) { setMessage('Only the Owner can import an official Dialog report.'); return; }
    setBusy(true); setMessage(''); setFilename(file.name);
    try {
      const text = await file.text();
      const matrix = csvRows(text);
      if (matrix.length < 2) throw new Error('CSV එකේ data rows නැහැ.');
      const headerIndex = matrix.findIndex(r => r.some(c => /row labels|agent|subscriber|mobile number|count/i.test(c)));
      const header = matrix[Math.max(0, headerIndex)].map(clean);
      const labelIndex = Math.max(0, header.findIndex(h => ['rowlabels','agent','agentname','subscriber','mobilenumber','mobile'].includes(h) || h.includes('rowlabels')));
      let countIndex = header.findIndex(h => h.includes('count') || h.includes('subscriber'));
      if (countIndex === labelIndex) countIndex = header.findIndex((_, i) => i !== labelIndex && i > labelIndex);
      if (countIndex < 0) countIndex = header.length - 1;
      const dataRows = matrix.slice(Math.max(0, headerIndex) + 1).filter(r => {
        const label = String(r[labelIndex] || '').trim();
        return label && !/^grand total$/i.test(label) && Number.isFinite(Number(String(r[countIndex] || '').replace(/,/g, '')));
      });
      if (!dataRows.length) throw new Error('Row Labels සහ Count සහිත CSV එකක් තෝරන්න. Excel Pivot එක CSV ලෙස Save කර Upload කරන්න.');
      const imported: ReportRow[] = dataRows.map(r => ({
        report_period: period, product, method, dimension,
        label: String(r[labelIndex]).trim(),
        subscriber_count: Number(String(r[countIndex] || '0').replace(/,/g, '')),
        source_filename: file.name
      }));
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Login required.');
      const { data: previousRows, error: previousError } = await supabase.from('dialog_report_import_rows').select('id')
        .eq('report_period', period).eq('product', product).eq('method', method).eq('dimension', dimension);
      if (previousError) throw previousError;
      const payload = imported.map(r => ({ ...r, imported_by: auth.user!.id }));
      const { data: insertedRows, error } = await supabase.from('dialog_report_import_rows').insert(payload).select('id');
      if (error) throw error;
      const oldIds = (previousRows || []).map((r: any) => r.id);
      if (oldIds.length) {
        const { error: cleanupError } = await supabase.from('dialog_report_import_rows').delete().in('id', oldIds);
        if (cleanupError) throw cleanupError;
      }
      setRows((insertedRows || []).map((r: any, i: number) => ({ ...imported[i], id: r.id })));
      setMessage(`Imported ${imported.length} rows from ${file.name}. This is aggregate reconciliation, not individual-subscriber matching.`);
    } catch (e: any) {
      setMessage(e?.message || 'Report import failed.');
    } finally { setBusy(false); }
  };

  return <section className="rounded-3xl border border-cyan-500/25 bg-slate-900 p-5 space-y-4">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-cyan-300"/><div><h3 className="text-sm font-black text-white">Dialog Report Reconciliation</h3><p className="mt-1 text-xs leading-5 text-slate-400">Govimithuru IVR, Govimithuru App, Sayuru IVR සහ Sayuru App වෙන වෙනම සසඳයි. Report එකේ aggregate counts පමණක් තිබේ නම්, individual sale එකක් auto-confirm නොකරයි.</p></div></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-[11px] font-bold text-slate-400">Product<select value={product} onChange={e=>setProduct(e.target.value as Product)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white"><option value="govimithuru">Govimithuru</option><option value="sayuru">Sayuru</option></select></label>
      <label className="text-[11px] font-bold text-slate-400">Activation Method<select value={method} onChange={e=>setMethod(e.target.value as Method)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white"><option value="ivr">IVR</option><option value="app">App</option></select></label>
      <label className="text-[11px] font-bold text-slate-400">Report Type<select value={dimension} onChange={e=>setDimension(e.target.value as Dimension)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white"><option value="agent">Agent totals</option><option value="mobile_prefix">Mobile prefix totals</option></select></label>
      <label className="text-[11px] font-bold text-slate-400">Report Month<input type="month" value={period} onChange={e=>setPeriod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white"/></label>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      {isOwner && <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-slate-950"><FileUp className="h-4 w-4"/> Import Dialog CSV<input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={e=>void importFile(e.target.files?.[0])}/></label>}
      <button type="button" onClick={()=>void load()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-xs font-bold text-white"><RefreshCw className={`h-4 w-4 ${busy?'animate-spin':''}`}/> Refresh</button>
      <span className="text-[11px] text-slate-500">{filename || (hasReport ? `${rows.length} report rows loaded` : 'No report imported for this selection')}</span>
    </div>
    {message && <div className="rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-300">{message}</div>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">App Submitted</div><div className="mt-1 text-2xl font-black text-white">{appTotal}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Dialog Report Total</div><div className="mt-1 text-2xl font-black text-white">{hasReport ? reportTotal : '—'}</div></div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="text-[10px] font-black uppercase text-slate-500">Difference (App − Dialog)</div><div className={`mt-1 text-2xl font-black ${hasReport && appTotal===reportTotal?'text-emerald-300':'text-amber-300'}`}>{hasReport ? appTotal - reportTotal : '—'}</div></div>
    </div>
    {dimension === 'mobile_prefix' && <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200"><AlertTriangle className="mr-1 inline h-4 w-4"/> Mobile-prefix report එක overall cross-check එකක් පමණයි. Agent අනුව හෝ individual sale අනුව confirmation ලබාදෙන්නේ නැහැ.</p>}
    <div className="overflow-x-auto rounded-xl border border-slate-800"><table className="w-full text-left text-xs"><thead className="bg-slate-950 text-slate-400"><tr><th className="p-3">Dialog Report Label</th><th className="p-3 text-right">Dialog Count</th>{dimension==='agent'&&<th className="p-3 text-right">App Count</th>}{dimension==='agent'&&<th className="p-3 text-right">Difference</th>}<th className="p-3">Status</th></tr></thead><tbody>{comparisons.map((r,i)=><tr key={r.id||i} className="border-t border-slate-800"><td className="p-3 text-white">{r.label}</td><td className="p-3 text-right">{r.subscriber_count}</td>{dimension==='agent'&&<td className="p-3 text-right">{r.appCount}</td>}{dimension==='agent'&&<td className="p-3 text-right">{r.delta}</td>}<td className="p-3">{dimension==='mobile_prefix'?<span className="text-amber-300">Aggregate only</span>:r.match?<span className="inline-flex items-center gap-1 text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5"/> Count matches</span>:<span className="text-amber-300">Review Required</span>}</td></tr>)}{!comparisons.length&&<tr><td colSpan={dimension==='agent'?4:3} className="p-5 text-center text-slate-500">Import an official CSV report to compare.</td></tr>}</tbody></table></div>
    <p className="text-[11px] leading-5 text-slate-500">Count matching is a report-level check only. A matching total does not prove that each individual sale is valid; keep individual sales provisional until a row-level official reference is available.</p>
  </section>;
};
