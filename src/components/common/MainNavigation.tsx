import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';

export const MainNavigation: React.FC = () => {
  const goHome = () => {
    window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'Home' } }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <button
        type="button"
        onClick={goHome}
        className="group flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-slate-900/95 px-5 py-3 text-xs font-black text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:bg-slate-800 active:scale-95"
        aria-label="Return to Home"
        title="Return to DD WORLD Home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300 transition group-hover:bg-emerald-400/20">
          <Home className="h-4 w-4" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] tracking-[0.18em] text-emerald-300">DD WORLD</span>
          <span className="mt-1">Home</span>
        </span>
        <ArrowLeft className="ml-1 h-4 w-4 text-slate-500 transition group-hover:-translate-x-0.5 group-hover:text-emerald-300" />
      </button>
    </div>
  );
};
