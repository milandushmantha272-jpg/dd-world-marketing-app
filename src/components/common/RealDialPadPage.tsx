import React, { useState } from 'react';
import { Delete, Phone, PhoneCall, RotateCcw } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const QUICK_CODES = ['#616#', '#828#'] as const;

export const RealDialPadPage: React.FC = () => {
  const [display, setDisplay] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const press = (value: string) => {
    setDisplay((previous) => (previous.length < 32 ? previous + value : previous));
    setStatus(null);
  };

  const clear = () => {
    setDisplay('');
    setStatus(null);
  };

  const backspace = () => {
    setDisplay((previous) => previous.slice(0, -1));
    setStatus(null);
  };

  const dial = async () => {
    const value = display.trim();
    if (!value) {
      setStatus('අංකයක් හෝ #616# / #828# code එකක් ඇතුළත් කරන්න.');
      return;
    }

    setBusy(true);
    setStatus(null);
    try {
      const result = await dialNativeUssd(value);
      setStatus(
        result.status === 'DIALER_FALLBACK'
          ? 'Phone dialer එක විවෘත වුණා. Call/USSD එක phone එකෙන් තහවුරු කරන්න.'
          : 'Dial request එක Android phone එකට යොමු කළා. Dialog activation success එක මෙතැනින් තහවුරු කරන්නේ නැහැ.'
      );
    } catch (error) {
      console.error('Dial pad error:', error);
      setStatus('Dial කරන්න බැරි වුණා. Phone permission සහ SIM එක පරීක්ෂා කරන්න.');
    } finally {
      setBusy(false);
    }
  };

  const keys = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ];

  return (
    <section className="dd-page-shell min-h-screen px-4 py-5 pb-28 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-red-300">DD WORLD MARKETING</div>
          <h1 className="mt-2 text-2xl font-black text-white">Real Dial Pad</h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">Normal phone calls සහ Dialog IVR codes සඳහා</p>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-slate-950/80 p-4 shadow-2xl">
          <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900 px-4 py-5 text-right">
            <div className="min-h-10 break-all text-3xl font-semibold tracking-wider text-white" aria-live="polite">
              {display || <span className="text-slate-600">Enter number</span>}
            </div>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {QUICK_CODES.map((code) => (
              <button key={code} type="button" onClick={() => { setDisplay(code); setStatus(null); }} className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-3 text-sm font-black text-red-200 active:scale-95">
                {code}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {keys.map(([value, letters]) => (
              <button key={value} type="button" onClick={() => press(value)} className="flex h-[76px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white shadow-lg active:scale-95 active:bg-slate-800">
                <span className="text-3xl font-semibold leading-none">{value}</span>
                <span className="mt-1 min-h-3 text-[9px] font-bold tracking-[0.2em] text-slate-500">{letters}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 items-center gap-3">
            <button type="button" onClick={clear} className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 active:scale-95" aria-label="Clear">
              <RotateCcw className="h-5 w-5" />
            </button>
            <button type="button" disabled={busy} onClick={dial} className="flex h-16 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl active:scale-95 disabled:opacity-50" aria-label="Call">
              <PhoneCall className="h-7 w-7" />
            </button>
            <button type="button" onClick={backspace} className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 active:scale-95" aria-label="Backspace">
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {status && <div className="mt-4 rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-center text-xs leading-5 text-slate-300">{status}</div>}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-3 text-[11px] leading-5 text-amber-100/80">
          <Phone className="mt-0.5 h-4 w-4 shrink-0" />
          <p>මෙය real Android dial action එකක්. Dialog system එකෙන් activation/sales confirmation එකක් ලැබෙන බව මෙම app එක තනිවම පොරොන්දු නොවේ.</p>
        </div>
      </div>
    </section>
  );
};
