import React, { useState } from 'react';
import { BarChart3, CheckCircle2, ChevronRight, Leaf, MessageSquare, UserRound, Radio, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const go = (page: string) => {
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page } }));
  window.scrollTo({ top: 0, behavior: 'auto' });
};

const ServiceCard: React.FC<{
  title: string;
  subtitle: string;
  code: string;
  tone: 'green' | 'purple';
  onClick: () => void;
}> = ({ title, subtitle, code, tone, onClick }) => (
  <button type="button" onClick={onClick} className={`dd-home-service dd-home-service-${tone}`}>
    <span className="dd-home-service-icon">{tone === 'green' ? <Leaf className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}</span>
    <span className="min-w-0 flex-1 text-left">
      <span className="block text-[12px] font-black">{title}</span>
      <span className="mt-0.5 block text-[9px] font-semibold opacity-70">{subtitle}</span>
    </span>
    <span className="text-right">
      <span className="block text-[16px] font-black">{code}</span>
      <ChevronRight className="ml-auto mt-1 h-4 w-4 opacity-60" />
    </span>
  </button>
);

export const HomePage: React.FC = () => {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isOwner = role === 'owner';
  const isLeader = role === 'team_leader' || role === 'junior_team_leader';
  const [showNotice, setShowNotice] = useState(false);

  if (!currentUser) return null;

  const firstName = currentUser.name?.split(' ')[0] || 'Agent';

  return (
    <section className="dd-reference-home min-h-screen px-3 pb-24 pt-3 sm:px-4 sm:pt-5">
      <div className="mx-auto w-full max-w-md">
        <div className="dd-home-header">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="dd-home-logo"><span>DD</span></div>
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
            <p className="mt-0.5 text-[9px] font-semibold text-slate-500">Agent ID : {currentUser.agentCode || currentUser.employeeId || '123456'}</p>
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
          {isOwner ? <>
            <button type="button" onClick={() => go('Owner — Career & Team Management')} className="dd-home-action dd-home-action-blue"><UserRound className="h-5 w-5" /><span>Teams</span></button>
            <button type="button" onClick={() => go('Page 4 — Sales Summary / Reports')} className="dd-home-action dd-home-action-green"><BarChart3 className="h-5 w-5" /><span>Reports</span></button>
            <button type="button" onClick={() => go('Owner — User & Access Control')} className="dd-home-action dd-home-action-purple"><ShieldCheck className="h-5 w-5" /><span>User Access</span></button>
            <button type="button" onClick={() => go('Page 6 — Details Submit / ID Requirements')} className="dd-home-action dd-home-action-orange"><UserRound className="h-5 w-5" /><span>Owner Profile</span></button>
          </> : isLeader ? <>
            <button type="button" onClick={() => go('Page 3 — Sales Activation')} className="dd-home-action dd-home-action-blue"><BarChart3 className="h-5 w-5" /><span>Team Sales</span></button>
            <button type="button" onClick={() => go('Page 4 — Sales Summary / Reports')} className="dd-home-action dd-home-action-green"><CheckCircle2 className="h-5 w-5" /><span>Team Reports</span></button>
            <button type="button" onClick={() => go('Page 2 — Attendance')} className="dd-home-action dd-home-action-purple"><Radio className="h-5 w-5" /><span>Attendance</span></button>
            <button type="button" onClick={() => go('Page 6 — Details Submit / ID Requirements')} className="dd-home-action dd-home-action-orange"><UserRound className="h-5 w-5" /><span>My Profile</span></button>
          </> : <>
            <button type="button" onClick={() => go('Page 3 — Sales Activation')} className="dd-home-action dd-home-action-blue"><BarChart3 className="h-5 w-5" /><span>Sales</span></button>
            <button type="button" onClick={() => go('Page 6 — Details Submit / ID Requirements')} className="dd-home-action dd-home-action-green"><CheckCircle2 className="h-5 w-5" /><span>Verification</span></button>
            <button type="button" onClick={() => go('Page 11 — Real Dial Pad')} className="dd-home-action dd-home-action-purple"><Radio className="h-5 w-5" /><span>USSD</span></button>
            <button type="button" onClick={() => go('Page 6 — Details Submit / ID Requirements')} className="dd-home-action dd-home-action-orange"><UserRound className="h-5 w-5" /><span>Profile</span></button>
          </>}
        </div>

        <div className="mt-3 flex items-center justify-between px-1">
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-500">Quick Activation</span>
          <span className="text-[9px] font-bold text-slate-400">Dialog Services</span>
        </div>

        <div className="mt-2 space-y-2">
          <ServiceCard title="Govimithuru" subtitle="Digital Agriculture Service" code="616" tone="green" onClick={() => go('Page 11 — Real Dial Pad')} />
          <ServiceCard title="Sayuru" subtitle="Digital Life Service" code="828" tone="purple" onClick={() => go('Page 11 — Real Dial Pad')} />
        </div>

        <div className="dd-home-usdd-row">
          <button type="button" onClick={() => go('Page 11 — Real Dial Pad')} className="dd-home-code dd-home-code-red">616</button>
          <button type="button" onClick={() => go('Page 11 — Real Dial Pad')} className="dd-home-code dd-home-code-blue">828</button>
        </div>

        <div className="dd-home-security">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <div><div className="text-[9px] font-black text-slate-700">Secure Agent Access</div><div className="text-[8px] font-semibold text-slate-400">KYC • Sales • Verification • USSD</div></div>
        </div>
      </div>
    </section>
  );
};
