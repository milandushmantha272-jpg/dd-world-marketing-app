import React, { useState } from 'react';
import { CheckCircle2, Info, Loader2, Radio, RotateCcw, Smartphone } from 'lucide-react';
import { dialNativeUssd } from '../../services/nativeUssdBridge';

const QUICK_USSD = [
  { code: '#616#', title: 'Govimithuru', subtitle: 'Service Activation', className: 'dd-ussd-red' },
  { code: '#828#', title: 'Sayuru', subtitle: 'Service Activation', className: 'dd-ussd-blue' },
] as const;

type StatusTone = 'success' | 'started' | 'error';

export const RealDialPadPage: React.FC = () => {
  const [status, setStatus] = useState<{ tone: StatusTone; text: string } | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);

  const runDial = async (value: string) => {
    setBusyCode(value);
    setStatus(null);
    try {
      const result = await dialNativeUssd(value);
      if (result.status === 'SUCCESS') {
        setStatus({ tone: 'success', text: result.response ? `Dialog response: ${result.response}` : `${value} USSD request එක සාර්ථකයි.` });
      } else if (result.status === 'DIALER_STARTED') {
        setStatus({ tone: 'started', text: `${value} Dialog USSD request එක phone telephony වෙත run කළා.` });
      } else {
        setStatus({ tone: 'error', text: result.message || `USSD status: ${result.status}` });
      }
    } catch (error) {
      console.error('USSD error:', error);
      const detail = error instanceof Error ? error.message : 'Unknown native bridge error';
      setStatus({ tone: 'error', text: `USSD run කරන්න බැරි වුණා: ${detail}` });
    } finally {
      setBusyCode(null);
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
              <p className='text-[10px] font-semibold text-white/80'>Test Agent • KYC • Service Activation</p>
            </div>
            <span className='dd-live-chip'><Radio className='h-3 w-3' />LIVE</span>
          </div>
        </div>

        <div className='dd-agent-info'>
          <Info className='mt-0.5 h-4 w-4 shrink-0 text-blue-600' />
          <div>
            <p className='text-[11px] font-black text-slate-800'>Agent USSD</p>
            <p className='text-[10px] leading-4 text-slate-500'>Code එක touch කරලා service activation run කරන්න.</p>
          </div>
        </div>

        <div className='mb-2 flex items-center justify-between px-1'>
          <span className='text-[10px] font-black uppercase tracking-[.16em] text-slate-500'>Choose Service</span>
          <span className='text-[10px] font-bold text-slate-400'>Dialog • Agent</span>
        </div>

        <div className='space-y-2.5'>
          {QUICK_USSD.map(({ code, title, subtitle, className }) => {
            const isBusy = busyCode === code;
            return (
              <button key={code} type='button' onClick={() => runDial(code)} disabled={busyCode !== null} className={`dd-ussd-card ${className}`}>
                <span className='dd-ussd-icon'>{isBusy ? <Loader2 className='h-5 w-5 animate-spin' /> : <Radio className='h-5 w-5' />}</span>
                <span className='min-w-0 flex-1 text-left'>
                  <span className='block text-[10px] font-black uppercase tracking-[.16em] opacity-75'>{title}</span>
                  <span className='mt-0.5 block text-[30px] font-black leading-none tracking-tight'>{code}</span>
                  <span className='mt-1 block text-[10px] font-bold opacity-70'>{subtitle}</span>
                </span>
                <span className='dd-run-chip'>{isBusy ? 'RUN...' : 'RUN'}</span>
              </button>
            );
          })}
        </div>

        {status && <div className={`dd-status-box ${statusClass}`}><CheckCircle2 className='mt-0.5 h-4 w-4 shrink-0' /><p className='min-w-0 text-[10px] font-bold leading-4'>{status.text}</p></div>}

        <button type='button' onClick={() => setStatus(null)} className='dd-clear-status' disabled={!status}>
          <RotateCcw className='h-3.5 w-3.5' />Clear status
        </button>
      </div>
    </section>
  );
};
