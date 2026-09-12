import React, { useEffect, useMemo, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { AlertTriangle, Check, Download, FileSpreadsheet, Upload, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

type ReportStatus = 'RECEIVED' | 'OWNER_OK' | 'TL_OK' | 'CORRECTION_REQUIRED';
type Row = { agentCode: string; agentName: string; teamId?: string; teamName?: string; date: string; product: string; app: number; ivr: number; total: number };
type Report = { id: string; fileName: string; weekStart: string; weekEnd: string; uploadedAt: string; uploadedBy: string; status: ReportStatus; rows: Row[]; issue?: string; issueBy?: string; issueRole?: string };

const parseNumber = (value: string) => Number((value || '').replace(/[^0-9.-]/g, '')) || 0;
const normalizeProduct = (value: string) => /govi|govimithuru|ගොවි/i.test(value) ? 'Govi Mithuru' : /sayuru|සයුරු/i.test(value) ? 'Sayuru' : value || 'Unknown';

export const WeeklySalesSheetWorkflow: React.FC = () => {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [fileName, setFileName] = useState('');
  const [weekStart, setWeekStart] = useState(new Date().toISOString().slice(0, 10));
  const [weekEnd, setWeekEnd] = useState(new Date().toISOString().slice(0, 10));
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [issueReportId, setIssueReportId] = useState<string | null>(null);
  const [issueText, setIssueText] = useState('');

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'weeklySalesReports'), orderBy('uploadedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Report, 'id'>) }))));
    return () => unsubscribe();
  }, []);

  const visibleReports = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'dialog_officer') return reports.filter((r) => r.uploadedBy === currentUser.id);
    if (currentUser.role === 'owner') return reports;
    if (currentUser.role === 'team_leader') return reports.filter((r) => r.status === 'OWNER_OK' && r.rows.some((x) => x.teamId === currentUser.teamId));
    return reports.filter((r) => r.status === 'TL_OK' && r.rows.some((x) => x.agentCode === currentUser.agentCode));
  }, [currentUser, reports]);

  if (!currentUser) return null;

  const saveReport = async (report: Report) => {
    if (!db) throw new Error('Firestore unavailable');
    await setDoc(doc(db, 'weeklySalesReports', report.id), report);
  };

  const updateStatus = async (report: Report, status: ReportStatus) => {
    try {
      await saveReport({ ...report, status, issue: undefined, issueBy: undefined, issueRole: undefined });
      setMessage(status === 'OWNER_OK' ? 'Owner OK කළා — Team Leaders වෙත යැවුණා.' : status === 'TL_OK' ? 'Team Leader OK කළා — Agents වෙත යැවුණා.' : 'Report status updated.');
    } catch { setMessage('Status update failed.'); }
  };

  const submitIssue = async () => {
    const report = reports.find((r) => r.id === issueReportId);
    if (!report || !issueText.trim()) return;
    try {
      await saveReport({ ...report, status: 'CORRECTION_REQUIRED', issue: issueText.trim(), issueBy: currentUser.name, issueRole: currentUser.role });
      setIssueReportId(null); setIssueText(''); setMessage('වැරදි තොරතුරු Owner වෙත Inform කළා.');
    } catch { setMessage('Issue submission failed.'); }
  };

  const handleUpload = async (file: File) => {
    setUploading(true); setMessage('');
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
      if (!lines.length) throw new Error('empty');
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(delimiter).map((x) => x.trim().toLowerCase());
      const idx = (...names: string[]) => names.map((n) => headers.findIndex((h) => h.includes(n))).find((i) => i >= 0) ?? -1;
      const dateI = idx('date', 'දිනය'); const codeI = idx('agent code', 'agentcode', 'code', 'agent'); const nameI = idx('agent name', 'name');
      const teamI = idx('team'); const productI = idx('product'); const appI = idx('app'); const ivrI = idx('ivr'); const totalI = idx('total');
      const rows: Row[] = lines.slice(1).map((line) => {
        const p = line.split(delimiter).map((x) => x.trim());
        const app = appI >= 0 ? parseNumber(p[appI]) : 0; const ivr = ivrI >= 0 ? parseNumber(p[ivrI]) : 0;
        const total = totalI >= 0 ? parseNumber(p[totalI]) : app + ivr;
        return { agentCode: p[codeI] || '', agentName: p[nameI] || '', teamId: p[teamI] || undefined, teamName: p[teamI] || undefined, date: p[dateI] || weekStart, product: normalizeProduct(p[productI] || ''), app, ivr, total };
      }).filter((r) => r.agentCode || r.agentName);
      if (!rows.length) throw new Error('rows');
      const report: Report = { id: `wsr-${Date.now()}`, fileName: file.name, weekStart, weekEnd, uploadedAt: new Date().toISOString(), uploadedBy: currentUser.id, status: 'RECEIVED', rows };
      await saveReport(report); setFileName(file.name); setMessage('Weekly Sales Sheet Owner වෙත ලැබුණා.');
    } catch { setMessage('CSV/TSV Sheet එක කියවීමට නොහැකි විය. Excel file එක CSV/TSV ලෙස export කර upload කරන්න.'); }
    finally { setUploading(false); }
  };

  const downloadReport = (report: Report) => {
    const csv = ['Agent Code,Agent Name,Team,Date,Product,App Sales,IVR Sales,Total Sales', ...report.rows.map((r) => [r.agentCode, r.agentName, r.teamName || '', r.date, r.product, r.app, r.ivr, r.total].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `DD-WORLD-Weekly-Sales-${report.weekStart}-${report.weekEnd}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <section className="mx-auto mt-5 max-w-7xl rounded-3xl border border-slate-800 bg-slate-950/95 p-5 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-black">WEEKLY SALES SHEET</h2></div><p className="mt-1 text-xs text-slate-400">Sales information only • No payment / money data</p></div>
        {currentUser.role === 'dialog_officer' && <label className="cursor-pointer rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950"><Upload className="mr-1 inline h-4 w-4" /> SEND SHEET TO OWNER<input className="hidden" type="file" accept=".csv,.tsv,.txt" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])} /></label>}
      </div>
      {currentUser.role === 'dialog_officer' && <div className="mt-4 grid gap-3 sm:grid-cols-3"><label className="text-xs text-slate-400">Week Start<input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" /></label><label className="text-xs text-slate-400">Week End<input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white" /></label><div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-400">{fileName ? `Attached: ${fileName}` : 'CSV / TSV sheet only'}</div></div>}
      {message && <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs font-bold text-emerald-300">{message}</div>}
      <div className="mt-5 space-y-4">
        {visibleReports.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">No Weekly Sales Sheets available for this role.</div> : visibleReports.map((report) => {
          const rows = currentUser.role === 'team_leader' ? report.rows.filter((r) => r.teamId === currentUser.teamId) : currentUser.role === 'agent' ? report.rows.filter((r) => r.agentCode === currentUser.agentCode) : report.rows;
          const canOwner = currentUser.role === 'owner' && report.status === 'RECEIVED';
          const canTl = currentUser.role === 'team_leader' && report.status === 'OWNER_OK';
          const canAgent = currentUser.role === 'agent' && report.status === 'TL_OK';
          return <div key={report.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><div className="font-black">{report.fileName}</div><div className="text-[11px] text-slate-500">{report.weekStart} → {report.weekEnd} • {report.status}</div></div><button onClick={() => downloadReport({ ...report, rows })} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold"><Download className="mr-1 inline h-4 w-4" /> Sheet</button></div>
            <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-800 text-slate-500"><th className="p-2">Agent Code</th><th className="p-2">Agent</th><th className="p-2">Date</th><th className="p-2">Product</th><th className="p-2 text-right">App</th><th className="p-2 text-right">IVR</th><th className="p-2 text-right">Total</th></tr></thead><tbody>{rows.map((r, i) => <tr key={`${report.id}-${i}`} className="border-b border-slate-800/60"><td className="p-2 font-mono text-emerald-300">{r.agentCode}</td><td className="p-2">{r.agentName}</td><td className="p-2">{r.date}</td><td className="p-2">{r.product}</td><td className="p-2 text-right">{r.app}</td><td className="p-2 text-right">{r.ivr}</td><td className="p-2 text-right font-black">{r.total}</td></tr>)}</tbody></table></div>
            {report.issue && <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200"><AlertTriangle className="mr-1 inline h-4 w-4" /> {report.issue} — {report.issueBy}</div>}
            <div className="mt-3 flex flex-wrap gap-2">{canOwner && <><button onClick={() => updateStatus(report, 'OWNER_OK')} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-slate-950"><Check className="mr-1 inline h-4 w-4" /> OWNER OK</button><button onClick={() => setIssueReportId(report.id)} className="rounded-xl bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-300"><XCircle className="mr-1 inline h-4 w-4" /> REPORT ISSUE</button></>}{canTl && <><button onClick={() => updateStatus(report, 'TL_OK')} className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-black text-white"><Check className="mr-1 inline h-4 w-4" /> TL OK</button><button onClick={() => setIssueReportId(report.id)} className="rounded-xl bg-rose-500/10 px-4 py-2 text-xs font-black text-rose-300">REPORT ISSUE</button></>}{canAgent && <button onClick={() => updateStatus(report, 'TL_OK')} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-black text-white"><Check className="mr-1 inline h-4 w-4" /> VIEWED / OK</button>}{report.status === 'CORRECTION_REQUIRED' && <span className="rounded-xl bg-amber-500/10 px-4 py-2 text-xs font-black text-amber-300">CORRECTION REQUIRED</span>}</div>
          </div>;
        })}
      </div>
      {issueReportId && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-5"><h3 className="font-black">Inform Incorrect Sales Information</h3><textarea value={issueText} onChange={(e) => setIssueText(e.target.value)} placeholder="Agent / date / product / sales count / reason..." className="mt-3 h-32 w-full rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /><div className="mt-3 flex justify-end gap-2"><button onClick={() => setIssueReportId(null)} className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold">Cancel</button><button onClick={submitIssue} className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white">Inform Owner</button></div></div></div>}
    </section>
  );
};