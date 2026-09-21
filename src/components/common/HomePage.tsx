import React from 'react';
import { Activity, ChevronRight, Smartphone } from 'lucide-react';
import { RealDialPadPage } from './RealDialPadPage';

export const HomePage: React.FC = () => {
  const openIvrActive = () =>
    window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'IVR Active' } }));

  return (
    <div className="w-full overflow-x-hidden">
      <section className="mx-auto w-full max-w-4xl px-3 pt-5 sm:px-4 sm:pt-8">
        <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg sm:p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white sm:text-xl">DD WORLD MARKETING</h1>
              <p className="mt-1 text-xs leading-5 text-slate-400">USSD, IVR සහ agent tools එකම තැනක</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openIvrActive}
          className="dd-card flex min-h-16 w-full items-center justify-between gap-3 rounded-2xl border border-emerald-400/20 p-4 text-left transition active:scale-[0.99]"
        >
          <span className="flex min-w-0 items-center gap-3">
            <span className="shrink-0 rounded-xl bg-emerald-500/15 p-3 text-emerald-300">
              <Activity className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-black text-white">IVR Active</span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">Live IVR sessions සහ status බලන්න</span>
            </span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
        </button>
      </section>

      <RealDialPadPage />
    </div>
  );
};
