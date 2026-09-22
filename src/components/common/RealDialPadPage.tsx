import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const QUICK_USSD = [
  { code: '#616#', label: '#616#' },
  { code: '#828#', label: '#828#' },
] as const;

export const RealDialPadPage: React.FC = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runDial = async (value: string) => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await dialNativeUssd(value);
      if (result.status === 'SUCCESS') {
        setStatus(result.response ? `Dialog response: ${result.response}` : 'USSD request එක සාර්ථකයි.');
      } else if (result.status === 'FALLBACK_STARTED') {
        setStatus('USSD request started.');
      } else {
        setStatus(result.message || `USSD status: ${result.status}`);
      }
    } catch (error) {
      console.error('USSD error:', error);
      const detail = error instanceof Error ? error.message : 'Unknown native bridge error';
      setStatus(`USSD run කරන්න බැරි වුණා: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="dd-page-shell min-h-screen px-3 pt-20 pb-24 sm:px-4 sm:pt-24">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-4 text-center">
          <h1 className="text-xl font-black text-white sm:text-2xl">Agent USSD</h1>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">Service activation codes only</p>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
          <div className="grid grid-cols-1 gap-3">
            {QUICK_USSD.map(({ code, label }) => (
              <button key={code} type="button" onClick={() => runDial(code)} disabled={busy} className="h-16 rounded-2xl border border-red-400/30 bg-red-500/10 text-xl font-black text-red-200 active:scale-95 disabled:opacity-50">
                {label}
              </button>
            ))}
          </div>
          {status && <div className="mt-4 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-[11px] leading-5 text-slate-300">{status}</div>}
          <button type="button" onClick={() => setStatus(null)} className="mx-auto mt-3 flex items-center gap-2 text-xs text-slate-500">
            <RotateCcw className="h-4 w-4" /> Clear status
          </button>
        </div>
      </div>
    </section>
  );
};
