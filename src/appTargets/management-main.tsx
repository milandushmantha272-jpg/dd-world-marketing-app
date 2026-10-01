import React from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { Providers, TargetShell } from './shared';
import { useAuth } from '../context/AuthContext';
import { OwnerDashboard } from '../components/owner/OwnerDashboard';
import { TeamLeaderDashboard } from '../components/leader/TeamLeaderDashboard';
import { MonthEndPresentationPage } from '../components/common/MonthEndPresentationPage';
import { SalesSummaryPage } from '../components/common/SalesSummaryPage';
import { MessageRoomPage } from '../components/common/MessageRoomPage';

const TEAM_ROLES = new Set(['team_leader', 'junior_team_leader']);

export const ManagementAppShell: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isTeamSupervisor = TEAM_ROLES.has(currentUser.role);

  if (!isOwner && !isTeamSupervisor) return null;

  return (
    <div className="min-h-screen bg-[#f5f8fc] text-[#14213d]">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black">DD WORLD Management App</h1>
            <p className="mt-1 text-xs text-slate-500">
              {isOwner
                ? 'Owner Control & Corporate Management'
                : `Team-scoped Management • ${currentUser.teamName || 'Assigned Team'}`}
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-600">
            {currentUser.role.replace(/_/g, ' ')}
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-5">
        {isOwner ? (
          <>
            <OwnerDashboard />
            <SalesSummaryPage />
            <MonthEndPresentationPage />
            <MessageRoomPage />
          </>
        ) : isTeamSupervisor ? (
          <>
            <TeamLeaderDashboard />
          </>
        ) : null}
      </main>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <Providers>
    <TargetShell target="management">
      <ManagementAppShell />
    </TargetShell>
  </Providers>
);
