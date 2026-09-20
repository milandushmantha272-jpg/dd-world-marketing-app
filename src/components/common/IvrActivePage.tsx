import React from 'react';
import { Activity, ArrowLeft, RefreshCw } from 'lucide-react';

export const IvrActivePage: React.FC = () => {
  const [lastRefresh, setLastRefresh] = React.useState(() => new Date().toLocaleTimeString());
  const [sessions] = React.useState<Array<{ id: string; code: string; status: string; note: string }>>([]);

  return (
    <section className="dd-page-shell min-h-screen px-4 pt-20 pb-24 sm:pt-24">
      <div className="mx-auto w-full max-w-4xl">
        <div className="dd-card rounded-[26px] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">DD WORLD MARKETING</div>
              <h1 className="mt-2 text-2xl font-black text-white">IVR Active</h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">දැනට ක්‍රියාත්මක IVR sessions සහ verification status මෙතැනින් බලන්න.</p>
            </div>
            <button type="button" onClick={() => setLastRefresh(new Date().toLocaleTimeString())} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-200"><RefreshCw className="h-4 w-4" /> Refresh</button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"><div className="text-xs text-slate-400">Active sessions</div><div className="mt-1 text-3xl font-black text-white">{sessions.length}</div></div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"><div className="text-xs text-slate-400">Pending</div><div className="mt-1 text-3xl font-black text-amber-300">0</div></div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4"><div className="text-xs text-slate-400">Last refresh</div><div className="mt-2 text-sm font-bold text-white">{lastRefresh}</div></div>
          </div>
          <div className="mt-5 rounded-2xl border border-dashed border-white/15 bg-slate-950/50 p-6 text-center">
            <Activity className="mx-auto h-8 w-8 text-slate-500" />
            <h2 className="mt-3 text-sm font-black text-white">No active IVR sessions</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">IVR call එකක් ආරම්භ කළ පසු එහි live status එක මෙතැන පෙන්වනු ඇත.</p>
          </div>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'Home' } }))} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950"><ArrowLeft className="h-4 w-4" /> Home වෙත</button>
        </div>
      </div>
    </section>
  );
};
