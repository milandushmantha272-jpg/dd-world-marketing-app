import React, { useState } from 'react';
import { Delete, PhoneCall, RotateCcw } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const QUICK_CALLS = [
  { code: '616', label: 'Govi Mithuru · 616' },
  { code: '828', label: 'Sayuru · 828' },
] as const;

const QUICK_USSD = [
  { code: '#616#', label: 'Activate · #616#' },
  { code: '#828#', label: 'Activate · #828#' },
] as const;

export const RealDialPadPage: React.FC = () => {
  const [display, setDisplay] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const press = (value: string) => {
    setDisplay((previous) => (previous.length < 32 ? previous + value : previous));
    setStatus(null);
  };
  const clear = () => { setDisplay(''); setStatus(null); };
  const backspace = () => { setDisplay((previous) => previous.slice(0, -1)); setStatus(null); };

  const runDial = async (value: string) => {
    const target = value.trim();
    if (!target) {
      setStatus('අංකයක් හෝ #616# / #828# activation code එකක් ඇතුළත් කරන්න.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await dialNativeUssd(target);
      if (result.status === 'SUCCESS') {
        setStatus(result.response ? `Dialog response: ${result.response}` : 'USSD request එක සාර්ථකයි.');
      } else if (result.status === 'FAILED') {
        setStatus(`USSD අසාර්ථකයි: ${result.message}`);
      } else if (result.status === 'UNSUPPORTED_API' || result.status === 'UNSUPPORTED_DEVICE') {
        setStatus(result.message);
      } else if (result.status === 'WEB_UNAVAILABLE') {
        setStatus('මෙය Android app එකෙන්ම භාවිතා කරන්න. Browser එකෙන් USSD යවන්න බැහැ.');
      } else {
        setStatus(result.message || `Dial status: ${result.status}`);
      }
    } catch (error) {
      console.error('Dial pad error:', error);
      const detail = error instanceof Error ? error.message : 'Unknown native bridge error';
      setStatus(`Dial කරන්න බැරි වුණා: ${detail}`);
    } finally {
      setBusy(false);
    }
  };

  const dial = () => runDial(display);

  const keys = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ];

  return (
    <section className="dd-page-shell min-h-screen px-3 pt-20 pb-24 sm:px-4 sm:pt-24">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-3 text-center">
          <h1 className="text-xl font-black text-white sm:text-2xl">Real Dial Pad</h1>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">616 / 828 = IVR call · #616# / #828# = Agent activation USSD</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/80 p-3 shadow-2xl sm:p-4">
          <div className="mb-3 rounded-2xl border border-white/10 bg-slate-900 px-3 py-4 text-right">
            <div className="min-h-8 break-all text-2xl font-semibold tracking-wide text-white sm:text-3xl" aria-live="polite">
              {display || <span className="text-slate-600">Enter number</span>}
            </div>
          </div>

          <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Product information — normal call</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {QUICK_CALLS.map(({ code, label }) => (
              <button key={code} type="button" onClick={() => runDial(code)} disabled={busy} className="h-10 rounded-xl border border-emerald-400/30 bg-emerald-500/10 text-sm font-black text-emerald-200 active:scale-95 disabled:opacity-50">
                <PhoneCall className="mr-1 inline h-4 w-4" />{label}
              </button>
            ))}
          </div>

          <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Agent service activation — USSD</div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            {QUICK_USSD.map(({ code, label }) => (
              <button key={code} type="button" onClick={() => runDial(code)} disabled={busy} className="h-10 rounded-xl border border-red-400/30 bg-red-500/10 text-sm font-black text-red-200 active:scale-95 disabled:opacity-50">
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {keys.map(([value, letters]) => (
              <button key={value} type="button" onClick={() => press(value)} className="flex h-16 flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white shadow-lg active:scale-95 active:bg-slate-800 sm:h-[70px]">
                <span className="text-2xl font-semibold leading-none sm:text-3xl">{value}</span>
                <span className="mt-1 min-h-3 text-[8px] font-bold tracking-[0.18em] text-slate-500">{letters}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 items-center gap-2 sm:gap-3">
            <button type="button" onClick={clear} className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 active:scale-95" aria-label="Clear"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" disabled={busy} onClick={dial} className="flex h-14 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl active:scale-95 disabled:opacity-50" aria-label="Call or USSD"><PhoneCall className="h-6 w-6" /></button>
            <button type="button" onClick={backspace} className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 active:scale-95" aria-label="Backspace"><Delete className="h-5 w-5" /></button>
          </div>

          {status && <div className="mt-3 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-[11px] leading-5 text-slate-300">{status}</div>}
        </div>
      </div>
    </section>
  );
};
