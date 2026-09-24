import React, { useState } from 'react';
import { CheckCircle2, Info, RotateCcw, Smartphone } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const QUICK_USSD = [
  { code: '#616#', label: '#616#', title: 'Govimithuru', className: 'border-red-200 bg-red-50 text-red-600' },
  { code: '#828#', label: '#828#', title: 'Sayuru', className: 'border-blue-200 bg-blue-50 text-blue-600' },
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
      } else if (result.status === 'DIALER_STARTED' || result.status === 'FALLBACK_STARTED') {
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
    <section className="dd-page-shell min-h-screen px-3 pt-4 pb-20 sm:px-4 sm:pt-6">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-blue-600 text-white">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-slate-900">DD WORLD Marketing</h1>
              <p className="text-[11px] font-semibold text-slate-500">Agent USSD • Service Activation</p>
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5 text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <p className="text-[11px] leading-4">USSD code එක touch කරලා service activation එක run කරන්න.</p>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {QUICK_USSD.map(({ code, label, title, className }) => (
            <button
              key={code}
              type="button"
              onClick={() => runDial(code)}
              disabled={busy}
              className={`flex min-h-[88px] items-center justify-between rounded-2xl border px-5 text-left shadow-sm transition active:scale-[.98] disabled:opacity-50 ${className}`}
            >
              <span>
                <span className="block text-[11px] font-black uppercase tracking-[.16em] opacity-70">{title}</span>
                <span className="mt-1 block text-3xl font-black tracking-tight">{label}</span>
              </span>
              <span className="rounded-xl bg-white/80 px-3 py-2 text-[10px] font-black uppercase">Run</span>
            </button>
          ))}
        </div>

        {status && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 text-[11px] leading-4">{status}</div>
          </div>
        )}

        <button type="button" onClick={() => setStatus(null)} className="mx-auto mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <RotateCcw className="h-3.5 w-3.5" /> Clear status
        </button>
      </div>
    </section>
  );
};
