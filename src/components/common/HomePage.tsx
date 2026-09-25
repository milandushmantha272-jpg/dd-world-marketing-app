import React, { useState } from 'react';
import { BarChart3, CheckCircle2, MessageSquare, UserRound, Radio, ShieldCheck, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const go = (page: string) => {
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page } }));
  window.scrollTo({ top: 0, behavior: 'auto' });
};

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const [showNotice, setShowNotice] = useState(false);

  if (!currentUser) return null;

  const firstName = currentUser.name?.split(' ')[0] || 'Agent';

  return (
    <section className="dd-reference-home min-h-screen px-3 pb-24 pt-3 sm:px-4 sm:pt-5">
      <div className="mx-auto w-full max-w-md">
        <div className="dd-home-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="dd-home-logo flex items-center justify-center overflow-hidden"><img src="/official-logo.png" alt="DD WORLD MARKETING logo" className="h-full w-full object-contain" /></div>
            <div className="min-w-0">
              <div className="truncate text-[14px] font-black text-slate-900">DD WORLD <span className="text-[#ef1d32]">MARKETING</span></div>
              <div className="text-[9px] font-bold text-slate-400">Official Employee Platform</div>
            </div>
          </div>
          <button type="button" onClick={() => setShowNotice(v => !v)} className="dd-home-notify" aria-label="Notifications">
            <MessageSquare className="h-4 w-4" />
          </button>
        </div>

        <div className="dd-home-welcome">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">Good Morning</p>
            <h1 className="mt-0.5 text-[19px] font-black tracking-tight text-slate-900">{firstName}</h1>
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">Agent ID : {currentUser.agentCode || currentUser.employeeId || '—'}</p>
          </div>
          <div className="dd-home-avatar"><UserRound className="h-5 w-5" /></div>
        </div>

        {showNotice && (
          <div className="dd-home-notice">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>DD WORLD account and service access ready.</span>
          </div>
        )}

        <div className="dd-home-banner">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[.18em] text-white/80">Dialog</div>
            <div className="mt-1 text-[17px] font-black leading-5 text-white">Stay Connected<br />Stay Ahead</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[8px] font-black text-white">
              <Radio className="h-3 w-3" /> Service Portal
            </div>
          </div>
          <div className="dd-home-banner-orb"><Smartphone className="h-7 w-7" /></div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => go('Page 1 — ID')} className="dd-home-action dd-home-action-blue"><UserRound className="h-5 w-5" /><span>Page 1 · ID</span></button>
          <button type="button" onClick={() => go('Page 2 — Attendance')} className="dd-home-action dd-home-action-green"><CheckCircle2 className="h-5 w-5" /><span>Page 2 · Attendance</span></button>
          <button type="button" onClick={() => go('Page 3 — Sales Activation')} className="dd-home-action dd-home-action-purple"><BarChart3 className="h-5 w-5" /><span>Page 3 · Sales</span></button>
          <button type="button" onClick={() => go('Page 4 — Sales Summary / Reports')} className="dd-home-action dd-home-action-orange"><BarChart3 className="h-5 w-5" /><span>Page 4 · Reports</span></button>
          <button type="button" onClick={() => go('Page 5 — Message Room')} className="dd-home-action dd-home-action-blue"><MessageSquare className="h-5 w-5" /><span>Page 5 · Messages</span></button>
          <button type="button" onClick={() => go('Page 6 — Details Submit / ID Requirements')} className="dd-home-action dd-home-action-green"><ShieldCheck className="h-5 w-5" /><span>Page 6 · Details / KYC</span></button>
          <button type="button" onClick={() => go('Page 7 — Commission / Payment')} className="dd-home-action dd-home-action-purple"><CheckCircle2 className="h-5 w-5" /><span>Page 7 · Payments</span></button>
          <button type="button" onClick={() => go('Page 8 — Promotion Items')} className="dd-home-action dd-home-action-orange"><Radio className="h-5 w-5" /><span>Page 8 · Promotions</span></button>
          <button type="button" onClick={() => go('Page 9 — New Agent Join (Requirements)')} className="dd-home-action dd-home-action-blue"><UserRound className="h-5 w-5" /><span>Page 9 · Join</span></button>
          <button type="button" onClick={() => go('Page 10 — Month-End Presentation')} className="dd-home-action dd-home-action-green"><BarChart3 className="h-5 w-5" /><span>Page 10 · Month-End</span></button>
        </div>

        <div className="dd-home-security">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <div><div className="text-[9px] font-black text-slate-700">Secure Agent Access</div><div className="text-[8px] font-semibold text-slate-400">KYC • Sales • Verification • USSD</div></div>
        </div>
      </div>
    </section>
  );
};
