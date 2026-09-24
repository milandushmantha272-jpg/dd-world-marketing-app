import React, { useState } from 'react';
import { Home, BarChart3, CalendarCheck, MessageSquare, MoreHorizontal, FileText, User, Wallet, UserPlus, Presentation, X, UserCog } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navigate = (page: string) => {
  window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page } }));
  window.scrollTo({ top: 0, behavior: 'auto' });
};

export const MainNavigation: React.FC = () => {
  const { currentUser } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const items = [
    { label: 'Home', icon: Home, page: 'Home' },
    { label: 'Sales', icon: BarChart3, page: 'Page 3 — Sales Activation' },
    { label: 'Messages', icon: MessageSquare, page: 'Page 5 — Message Room' },
  ];

  const moreItems = [
    { label: 'Reports', icon: FileText, page: 'Page 4 — Sales Summary / Reports' },
    { label: 'My Details', icon: User, page: 'Page 6 — Details Submit / ID Requirements' },
    { label: 'Payment', icon: Wallet, page: 'Page 7 — Commission / Payment' },
    { label: 'Attendance', icon: CalendarCheck, page: 'Page 2 — Attendance' },
    { label: 'New Agent', icon: UserPlus, page: 'Page 9 — New Agent Join (Requirements)' },
    { label: 'Month End', icon: Presentation, page: 'Page 10 — Month-End Presentation' },
    ...(currentUser?.role === 'owner' ? [{ label: 'User Access', icon: UserCog, page: 'Owner — User & Access Control' }] : []),
  ];

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-x-2 bottom-[78px] z-[70] rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:hidden dd-more-sheet">
          <div className="mb-1 flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-black uppercase tracking-[.18em] text-slate-500">More DD WORLD</span>
            <button type="button" onClick={() => setMoreOpen(false)} className="!min-h-9 h-9 w-9 rounded-lg p-1 text-slate-500" aria-label="Close menu"><X className="mx-auto h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {moreItems.map(({ label, icon: Icon, page }) => (
              <button key={label} type="button" onClick={() => { setMoreOpen(false); navigate(page); }} className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-800 active:scale-[.98]">
                <Icon className="h-4 w-4 shrink-0 text-red-300" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom))] z-[60] mx-auto grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-xl dd-bottom-nav sm:inset-x-auto sm:bottom-4 sm:flex sm:max-w-none sm:gap-2 sm:rounded-2xl sm:p-2">
        {items.map(({ label, icon: Icon, page }) => (
          <button key={label} type="button" onClick={() => navigate(page)} className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-black text-slate-600 active:bg-slate-100 sm:flex-row sm:gap-2 sm:px-4 sm:text-xs" aria-label={label}>
            <Icon className="h-4 w-4 text-[#ef1d32]" />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" onClick={() => setMoreOpen(v => !v)} className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[9px] font-black text-slate-300 active:bg-slate-800 sm:flex-row sm:gap-2 sm:px-4 sm:text-xs" aria-label="More">
          <MoreHorizontal className="h-4 w-4 text-red-300" />
          <span>More</span>
        </button>
      </nav>
    </>
  );
};
