import React, { useState } from 'react';
import { CheckCircle2, Delete, Info, Loader2, Phone, RotateCcw, Smartphone } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'] as const;

type StatusTone = 'success' | 'started' | 'error';

export const RealDialPadPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const pressKey = (key: string) => {
    if (busy || code.length >= 32) return;
    setCode(current => current + key);
    setStatus(null);
  };

  const erase = () => {
    if (busy) return;
    setCode(current => current.slice(0, -1));
    setStatus(null);
  };

  const clear = () => {
    if (busy) return;
    setCode('');
    setStatus(null);
  };

  const isUssdCode = /^[*#][0-9*#]{1,30}#$/.test(code);

  const runDial = async () => {
    if (!isUssdCode || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = await dialNativeUssd(code);
      if (result.status === 'SUCCESS') {
        setStatus({ tone: 'success', text: result.response ? `Network response: ${result.response}` : 'USSD request accepted.' });
      } else if (result.status === 'DIALER_STARTED') {
        setStatus({ tone: 'started', text: 'USSD code එක Phone/SIM network එකට යොමු කළා. දුරකථනයේ ප්‍රතිචාරය බලන්න.' });
      } else {
        setStatus({ tone: 'error', text: result.message || `USSD status: ${result.status}` });
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown native bridge error';
      setStatus({ tone: 'error', text: `USSD යවන්න බැරි වුණා: ${detail}` });
    } finally {
      setBusy(false);
    }
  };

  const statusClass = status?.tone === 'error' ? 'dd-status-error' : status?.tone === 'started' ? 'dd-status-started' : 'dd-status-success';

  return (
    <section className='dd-agent-ussd-page min-h-screen px-3 pt-3 pb-24 sm:px-4 sm:pt-5'>
      <div className='mx-auto w-full max-w-md'>
        <div className='dd-agent-hero'>
          <div className='flex items-center gap-3'>
            <div className='dd-brand-mark'><Smartphone className='h-5 w-5' /></div>
            <div className='min-w-0 flex-1'>
              <p className='text-[9px] font-black uppercase tracking-[.22em] text-white/75'>DD WORLD</p>
              <h1 className='truncate text-[18px] font-black tracking-tight text-white'>MARKETING</h1>
              <p className='text-[10px] font-semibold text-white/80'>Phone • SIM • USSD</p>
            </div>
          </div>
        </div>

        <div className='dd-agent-info'>
          <Info className='mt-0.5 h-4 w-4 shrink-0 text-blue-600' />
          <div>
            <p className='text-[11px] font-black text-slate-800'>USSD Dial Pad</p>
            <p className='text-[10px] leading-4 text-slate-500'>USSD code එක keypad එකෙන් ඇතුළත් කර Dial කරන්න. Dialog SIM එක තිබේ නම් එය තෝරාගැනීමට උත්සාහ කරයි.</p>
          </div>
        </div>

        <div className='rounded-3xl border border-slate-200 bg-white p-4 shadow-sm'>
          <div className='mb-3 flex items-center justify-between'>
            <span className='text-[10px] font-black uppercase tracking-[.16em] text-slate-500'>USSD Code</span>
            <button type='button' onClick={clear} disabled={busy || !code} className='text-[10px] font-bold text-slate-500 disabled:opacity-40'>Clear</button>
          </div>
          <div className='mb-4 flex min-h-14 items-center justify-center rounded-2xl bg-slate-50 px-3 text-center text-2xl font-bold tracking-widest text-slate-900' aria-live='polite'>
            {code || <span className='text-base font-medium tracking-normal text-slate-400'>*123#</span>}
          </div>

          <div className='grid grid-cols-3 gap-2'>
            {KEYS.map(key => (
              <button key={key} type='button' onClick={() => pressKey(key)} disabled={busy || code.length >= 32} className='flex h-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-800 shadow-sm active:scale-[.98] active:bg-slate-100 disabled:opacity-50'>
                {key}
              </button>
            ))}
            <button type='button' onClick={erase} disabled={busy || !code} className='flex h-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 disabled:opacity-40' aria-label='Delete last digit'>
              <Delete className='h-5 w-5' />
            </button>
            <button type='button' onClick={runDial} disabled={!isUssdCode || busy} className='col-span-2 flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-sm disabled:bg-slate-300'>
              {busy ? <Loader2 className='h-4 w-4 animate-spin' /> : <Phone className='h-4 w-4' />}
              {busy ? 'Connecting…' : 'DIAL USSD'}
            </button>
          </div>
          {!isUssdCode && code.length > 0 && <p className='mt-3 text-center text-[10px] font-semibold text-amber-700'>USSD code එක * හෝ # වලින් ආරම්භ වී # වලින් අවසන් විය යුතුයි.</p>}
        </div>

        {status && <div className={`dd-status-box ${statusClass}`}><CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0' /><p className='min-w-0 text-[10px] font-bold leading-4'>{status.text}</p></div>}

        <button type='button' onClick={() => setStatus(null)} className='dd-clear-status' disabled={!status}>
          <RotateCcw className='h-3.5 w-3.5' />Clear status
        </button>
      </div>
    </section>
  );
};
