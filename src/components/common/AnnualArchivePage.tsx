import React from 'react';
import { supabase } from '../../services/supabase';
import { Archive, Calendar, Download, RefreshCw, ShieldCheck } from 'lucide-react';

type AttendanceArchive = {
  id: string; user_id: string; year_start: string; present_days: number; late_days: number;
  absent_days: number; leave_days: number; half_days: number; total_active_minutes: number;
  field_work_days: number; gps_records: number; archived_at: string; archive_batch_id: string;
};
type SalesArchive = {
  id: string; agent_id: string; year_start: string; total_sales: number; verified_sales: number;
  total_quantity: number; verified_quantity: number; total_amount: number; verified_amount: number;
  sayuru_quantity: number; govimithuru_quantity: number; archived_at: string; archive_batch_id: string;
};

const csv = (rows: Record<string, unknown>[], name: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const body = [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([body], {type:'text/csv;charset=utf-8'}));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export const AnnualArchivePage: React.FC<{ role: 'owner' | 'dialog_officer' }> = ({ role }) => {
  const [year, setYear] = React.useState(String(new Date().getFullYear() - 1));
  const [attendance, setAttendance] = React.useState<AttendanceArchive[]>([]);
  const [sales, setSales] = React.useState<SalesArchive[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true); setError(null);
    const start = year + '-01-01';
    const end = (Number(year) + 1) + '-01-01';
    const [a, s] = await Promise.all([
      supabase.from('attendance_annual_archive').select('*').gte('year_start', start).lt('year_start', end).order('year_start'),
      supabase.from('sales_annual_archive').select('*').gte('year_start', start).lt('year_start', end).order('year_start')
    ]);
    if (a.error || s.error) setError(a.error?.message || s.error?.message || 'Archive data could not be loaded.');
    setAttendance((a.data || []) as AttendanceArchive[]);
    setSales((s.data || []) as SalesArchive[]);
    setLoading(false);
  }, [year]);

  React.useEffect(() => { void load(); }, [load]);

  return <section className="dd-page-shell min-h-screen px-4 py-5 md:px-6 md:py-8">
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="dd-card rounded-[26px] p-5 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em]">
              <Archive className="w-4 h-4" /> DD WORLD Annual Archive
            </div>
            <h1 className="mt-2 text-2xl font-black text-white">Historical Data — {year}</h1>
            <p className="mt-2 text-sm text-slate-300">Read-only historical annual summaries. Database RLS controls access.</p>
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <select value={year} onChange={e=>setYear(e.target.value)} className="bg-transparent text-white text-sm outline-none">
                {Array.from({length: 10}, (_,i)=>new Date().getFullYear()-i-1).map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <button onClick={()=>void load()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white"><RefreshCw className="inline w-4 h-4 mr-1"/>Refresh</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200">
        <ShieldCheck className="inline w-4 h-4 mr-1"/> {role === 'owner' ? 'Owner: authorized historical administration and reporting access.' : 'Dialog Audit Officer: compliance view-only access. No archive mutation controls are provided.'}
      </div>

      {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">Loading archived records…</div>}

      {!loading && <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white">Attendance Archive</h2><button disabled={!attendance.length} onClick={()=>csv(attendance as unknown as Record<string,unknown>[], `DDWorld_Attendance_Archive_${year}.csv`)} className="text-xs rounded-lg bg-slate-800 px-3 py-2 text-white disabled:opacity-40"><Download className="inline w-3 h-3 mr-1"/>CSV</button></div>
          <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-800"><th className="p-2">User</th><th className="p-2">Present</th><th className="p-2">Late</th><th className="p-2">Field</th><th className="p-2">GPS</th></tr></thead><tbody>{attendance.map(r=><tr key={r.id} className="border-b border-slate-800/70 text-slate-200"><td className="p-2">{r.user_id}</td><td className="p-2">{r.present_days}</td><td className="p-2">{r.late_days}</td><td className="p-2">{r.field_work_days}</td><td className="p-2">{r.gps_records}</td></tr>)}</tbody></table></div>
          {!attendance.length && <p className="py-8 text-center text-xs text-slate-500">No archived attendance records for {year}.</p>}
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-white">Sales Archive</h2><button disabled={!sales.length} onClick={()=>csv(sales as unknown as Record<string,unknown>[], `DDWorld_Sales_Archive_${year}.csv`)} className="text-xs rounded-lg bg-slate-800 px-3 py-2 text-white disabled:opacity-40"><Download className="inline w-3 h-3 mr-1"/>CSV</button></div>
          <div className="overflow-auto"><table className="w-full text-xs"><thead><tr className="text-left text-slate-400 border-b border-slate-800"><th className="p-2">Agent</th><th className="p-2">Sales</th><th className="p-2">Verified</th><th className="p-2">Quantity</th><th className="p-2">Amount</th></tr></thead><tbody>{sales.map(r=><tr key={r.id} className="border-b border-slate-800/70 text-slate-200"><td className="p-2">{r.agent_id}</td><td className="p-2">{r.total_sales}</td><td className="p-2">{r.verified_sales}</td><td className="p-2">{r.total_quantity}</td><td className="p-2">{r.total_amount}</td></tr>)}</tbody></table></div>
          {!sales.length && <p className="py-8 text-center text-xs text-slate-500">No archived sales records for {year}.</p>}
        </div>
      </div>}
    </div>
  </section>;
};
