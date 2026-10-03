import React, { useMemo, useState } from 'react';
import { Copy, ExternalLink, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { User } from '../../types';
import { dialNativeUssd } from '../../services/nativeUssdBridge';
import {
  ACTIVATION_DIAL_CODES,
  ActivationProduct,
  captureHighPrecisionGps,
  startActivation,
  openDigitalActivation,
} from '../../services/activationEngine';

interface IvrKeypadAndAppShareModalProps {
  currentUser: User;
  onClose?: () => void;
  isOpen?: boolean;
  embedded?: boolean;
}

const PRODUCT_META: Record<ActivationProduct, { label: string; code: string }> = {
  govimithuru: { label: 'ගොවිමිතුරු', code: ACTIVATION_DIAL_CODES.GOVIMITHURU },
  sayuru: { label: 'Dialog සයුරු', code: ACTIVATION_DIAL_CODES.SAYURU },
};

export const IvrKeypadAndAppShareModal: React.FC<IvrKeypadAndAppShareModalProps> = ({
  currentUser,
  onClose,
  isOpen = true,
}) => {
  const [product, setProduct] = useState<ActivationProduct>('govimithuru');
  const [mode, setMode] = useState<'ussd' | 'app'>('ussd');
  const [customerPhone, setCustomerPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activationId, setActivationId] = useState<string | null>(null);

  const meta = useMemo(() => PRODUCT_META[product], [product]);

  if (!isOpen) return null;

  const startUssdActivation = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const gps = await captureHighPrecisionGps();
      const dialResult = await dialNativeUssd(meta.code);
      if (!['STARTED', 'SUCCESS'].includes(String(dialResult.status).toUpperCase())) {
        throw new Error(dialResult.message || 'USSD dialer could not start.');
      }

      // Customer phone/name is intentionally NOT passed to startActivation.
      // The USSD/IVR flow handles customer verification dynamically.
      const result = await startActivation({
        product,
        path: 'USSD_IVR',
        agentId: currentUser.id,
        agentCode: currentUser.agentCode,
        teamId: currentUser.teamId,
        amount: 0,
        notes: `USSD activation started with ${meta.code}`,
        gps,
      });

      setActivationId(result.id);
      setMessage(`Activation started. ${meta.code} was launched. Status: ${result.status}. GPS accuracy: ${gps.accuracy.toFixed(1)}m.`);
    } catch (error: any) {
      setMessage(error?.message || 'Activation could not be started.');
    } finally {
      setBusy(false);
    }
  };

  const startAppActivation = async () => {
    setBusy(true);
    setMessage(null);
    try {
      // Phone number stays in component memory only and is never appended to the URL.
      const gps = await captureHighPrecisionGps();
      const configuredUrl = `${window.location.origin}/activation`;
      openDigitalActivation();
      // The activation route itself must create the transaction using the same RPC.
      // This pre-navigation GPS snapshot is deliberately not persisted here because
      // the route owns the final activation transaction and verification loop.
      void gps;
      void configuredUrl;
    } catch (error: any) {
      setMessage(error?.message || 'Live GPS permission is required before activation.');
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(meta.code);
    setMessage(`${meta.code} copied.`);
  };

  const shareDigitalLink = async () => {
    const url = `${window.location.origin}/activation`;
    const text = `DD WORLD ${meta.label} activation`;
    if (navigator.share) {
      await navigator.share({ title: text, text, url });
    } else {
      await navigator.clipboard.writeText(url);
      setMessage('Digital activation link copied. Customer phone number was not added to the link.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center" role="dialog" aria-modal="true">
      <section className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">DD WORLD Activation</p>
            <h2 className="text-xl font-black text-slate-900">USSD / App Activation</h2>
          </div>
          {onClose && <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm font-black text-slate-600">Close</button>}
        </header>

        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setProduct('govimithuru')} className={`rounded-xl border p-3 text-sm font-black ${product === 'govimithuru' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>ගොවිමිතුරු<br/><span className="text-xs font-bold">{ACTIVATION_DIAL_CODES.GOVIMITHURU}</span></button>
            <button type="button" onClick={() => setProduct('sayuru')} className={`rounded-xl border p-3 text-sm font-black ${product === 'sayuru' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>Dialog සයුරු<br/><span className="text-xs font-bold">{ACTIVATION_DIAL_CODES.SAYURU}</span></button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('ussd')} className={`rounded-xl border p-3 text-sm font-black ${mode === 'ussd' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>USSD / IVR</button>
            <button type="button" onClick={() => setMode('app')} className={`rounded-xl border p-3 text-sm font-black ${mode === 'app' ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600'}`}>Digital App</button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm font-black text-slate-800"><MapPin className="h-4 w-4"/> Live high-accuracy GPS required</div>
            <p className="mt-1 text-xs text-slate-500">Latitude, longitude, accuracy and ISO capture time are written with the activation transaction. Customer phone is not stored.</p>
          </div>

          <label className="block">
            <span className="text-xs font-black text-slate-700">Customer phone (temporary UI only)</span>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
              <Phone className="h-4 w-4 text-slate-400"/>
              <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^0-9+ ]/g, ''))} inputMode="tel" autoComplete="off" className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Used only for the live verification interaction" />
            </div>
          </label>

          {mode === 'ussd' ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button type="button" onClick={copyCode} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700"><Copy className="mr-1 inline h-4 w-4"/>{meta.code}</button>
                <button type="button" disabled={busy} onClick={startUssdActivation} className="flex-[2] rounded-xl bg-slate-900 px-3 py-3 text-sm font-black text-white disabled:opacity-50"><Phone className="mr-1 inline h-4 w-4"/>{busy ? 'Starting…' : 'Start USSD Activation'}</button>
              </div>
              <p className="text-[11px] text-slate-500">USSD starts with <b>*</b> and ends with <b>#</b>. A dial start alone never counts the sale as activated.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <button type="button" disabled={busy} onClick={startAppActivation} className="w-full rounded-xl bg-blue-700 px-3 py-3 text-sm font-black text-white disabled:opacity-50"><ExternalLink className="mr-1 inline h-4 w-4"/>{busy ? 'Opening…' : 'Open Digital Activation'}</button>
              <button type="button" onClick={shareDigitalLink} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700">Share activation link</button>
              <p className="text-[11px] text-slate-500">The customer enters their phone number inside the activation/PWA screen. It is not put in the URL or persisted by this sales engine.</p>
            </div>
          )}

          {activationId && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Transaction created: {activationId}</div>}
          {message && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700"><ShieldCheck className="mr-1 inline h-4 w-4"/>{message}</div>}
        </div>
      </section>
    </div>
  );
};
