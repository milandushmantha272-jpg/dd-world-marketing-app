import React from 'react';
import { Home, ArrowLeft } from 'lucide-react';

export const MainNavigation: React.FC = () => {
  const goHome = () => {
    window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: 'Home' } }));
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2">
      <button
        type="button"
        onClick={goHome}
        className="group flex items-center gap-2 rounded-2xl border border-red-400/25 bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-2xl transition active:scale-[.98]"
        aria-label="Return to Home"
        title="Return to DD WORLD Home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
          <Home className="h-4 w-4" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="text-[9px] tracking-[0.18em] text-red-300">DD WORLD</span>
          <span className="mt-1">Home</span>
        </span>
        <ArrowLeft className="ml-1 h-4 w-4 text-slate-400" />
      </button>
    </div>
  );
};
