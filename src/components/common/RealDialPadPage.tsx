import React, { useState } from 'react';
import { Delete, PhoneCall, RotateCcw } from 'lucide-react';
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
  const clear = () => { setDisplay(''); setStatus(null); };
  const backspace = () => { setDisplay((previous) => previous.slice(0, -1)); setStatus(null); };

  const dial = async () => {
    const value = display.trim();
    if (!value) { setStatus('අංකයක් හෝ #616# / #828# code එකක් ඇතුළත් කරන්න.'); return; }
    setBusy(true); setStatus(null);
    try {
      const result = await dialNativeUssd(value);
      if (result.status === 'SUCCESS' || result.status === 'USSD_RESPONSE_RECEIVED') {
        setStatus(result.response ? `Dialog response: ${result.response}` : 'USSD request එක සාර්ථකයි.');
      } else if (result.status === 'FALLBACK_STARTED') {
        setStatus('USSD code එක Android Phone Dialer එකට යොමු කළා. එතැනින් Continue කරන්න.');
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
    } finally { setBusy(false); }
  };

  const keys = [
    ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
    ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
    ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
    ['*', ''], ['0', '+'], ['#', ''],
  ];

  return (
    <section className="w-full px-3 pb-24 pt-4 sm:px-4 sm:pb-8 sm:pt-6">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-3 px-1 text-center sm:mb-4">
          <h2 className="text-xl font-black text-white sm:text-2xl">Real Dial Pad</h2>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Normal calls සහ Dialog USSD codes</p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-slate-950/90 p-3 shadow-2xl sm:p-4">
          <div className="mb-3 min-h-[68px] rounded-2xl border border-white/10 bg-slate-900 px-3 py-3 sm:min-h-[78px] sm:px-4 sm:py-4">
            <div className="flex min-h-10 items-center justify-end break-all text-right text-2xl font-semibold tracking-wide text-white sm:text-3xl" aria-live="polite">
              {display || <span className="text-base font-medium text-slate-600 sm:text-lg">Enter number / USSD</span>}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:gap-3">
            {QUICK_CODES.map((code) => (
              <button key={code} type="button" onClick={() => { setDisplay(code); setStatus(null); }} className="h-11 rounded-xl border border-red-400/30 bg-red-500/10 text-sm font-black text-red-200 transition active:scale-95">
                {code}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {keys.map(([value, letters]) => (
              <button key={value} type="button" onClick={() => press(value)} className="flex h-[clamp(58px,16vw,76px)] flex-col items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-white shadow-lg transition active:scale-95 active:bg-slate-800">
                <span className="text-2xl font-semibold leading-none sm:text-3xl">{value}</span>
                <span className="mt-1 min-h-3 text-[8px] font-bold tracking-[0.18em] text-slate-500">{letters}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 items-center gap-2 sm:gap-3">
            <button type="button" onClick={clear} className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 transition active:scale-95" aria-label="Clear"><RotateCcw className="h-5 w-5" /></button>
            <button type="button" disabled={busy} onClick={dial} className="flex h-14 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-xl transition active:scale-95 disabled:opacity-50" aria-label="Call"><PhoneCall className="h-6 w-6" /></button>
            <button type="button" onClick={backspace} className="flex h-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-900 text-slate-300 transition active:scale-95" aria-label="Backspace"><Delete className="h-5 w-5" /></button>
          </div>

          {status && <div className="mt-3 break-words rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-center text-[11px] leading-5 text-slate-300" role="status">{status}</div>}
        </div>
      </div>
    </section>
  );
};
