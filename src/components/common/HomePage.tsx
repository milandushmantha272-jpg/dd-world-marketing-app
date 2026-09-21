import React from 'react';
import {
  Activity,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  FileText,
  MessageSquare,
  Presentation,
  Smartphone,
  User,
  UserCog,
  UserPlus,
  Wallet,
} from 'lucide-react';
import { RealDialPadPage } from './RealDialPadPage';

const navigate = (page: string) => {
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page } }));
  window.scrollTo({ top: 0, behavior: 'auto' });
};

const featureCards = [
  { label: 'IVR Active', description: 'IVR sessions සහ status', icon: Activity, page: 'IVR Active' },
  { label: 'Sales Activation', description: 'New sales activate කරන්න', icon: BarChart3, page: 'Page 3 — Sales Activation' },
  { label: 'Sales Reports', description: 'Sales summary සහ reports', icon: FileText, page: 'Page 4 — Sales Summary / Reports' },
  { label: 'Message Room', description: 'Team messages බලන්න', icon: MessageSquare, page: 'Page 5 — Message Room' },
  { label: 'My Details', description: 'Profile සහ KYC details', icon: User, page: 'Page 6 — Details Submit / ID Requirements' },
  { label: 'Payment', description: 'Commission සහ payments', icon: Wallet, page: 'Page 7 — Commission / Payment' },
  { label: 'Attendance', description: 'Daily attendance manage', icon: CalendarCheck, page: 'Page 2 — Attendance' },
  { label: 'New Agent', description: 'New agent join process', icon: UserPlus, page: 'Page 9 — New Agent Join (Requirements)' },
  { label: 'Month End', description: 'Month-end presentation', icon: Presentation, page: 'Page 10 — Month-End Presentation' },
  { label: 'User Access', description: 'Owner access controls', icon: UserCog, page: 'Owner — User & Access Control' },
];

export const HomePage: React.FC = () => {
  return (
    <div className="w-full overflow-x-hidden pb-24">
      <section className="mx-auto w-full max-w-4xl px-3 pt-5 sm:px-4 sm:pt-8">
        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/70 p-4 shadow-lg sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">DD WORLD MARKETING</h1>
              <p className="mt-1 text-xs leading-5 text-slate-400">All agent tools එකම තැනක • Quick access dashboard</p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black text-white sm:text-base">Quick Access</h2>
            <p className="mt-1 text-[11px] text-slate-400">අවශ්‍ය function එක තෝරන්න</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-slate-400">Agent Panel</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {featureCards.map(({ label, description, icon: Icon, page }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(page)}
              className="group flex min-h-[116px] flex-col justify-between rounded-2xl border border-white/10 bg-slate-900/80 p-3 text-left shadow-md transition hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-slate-800 active:scale-[.98]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-300">
                  <Icon className="h-4 w-4" />
                </span>
                <ChevronRight className="h-4 w-4 text-slate-600 transition group-hover:text-emerald-300" />
              </div>
              <div className="mt-3 min-w-0">
                <span className="block truncate text-xs font-black text-white">{label}</span>
                <span className="mt-1 block text-[10px] leading-4 text-slate-400">{description}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="mx-auto mt-5 max-w-4xl px-3 sm:px-4">
        <RealDialPadPage />
      </div>
    </div>
  );
};
