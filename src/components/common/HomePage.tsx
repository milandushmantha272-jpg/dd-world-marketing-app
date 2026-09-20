import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import { RealDialPadPage } from './RealDialPadPage';

export const HomePage: React.FC = () => {
  const openIvrActive = () => window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'IVR Active' } }));

  return (
    <>
      <div className="mx-auto w-full max-w-4xl px-4 pt-16 sm:pt-20">
        <button type="button" onClick={openIvrActive} className="dd-card flex w-full items-center justify-between gap-4 rounded-2xl border border-emerald-400/20 p-4 text-left transition active:scale-[0.99]">
          <span className="flex items-center gap-3"><span className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300"><Activity className="h-5 w-5" /></span><span><span className="block text-sm font-black text-white">IVR Active</span><span className="mt-1 block text-xs text-slate-400">Live IVR sessions සහ status</span></span></span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      </div>
      <RealDialPadPage />
    </>
  );
};
