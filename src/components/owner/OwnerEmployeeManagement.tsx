import React from 'react';
import { Ban, CheckCircle2, KeyRound, UserX } from 'lucide-react';
import { useData } from '../../context/DataContext';

const FRAME_NAMES = ['Dilshan Team', 'Buddika Team', 'Dilan Team', 'Nethsara Team', 'Direct Agents'];

export const OwnerEmployeeManagement: React.FC = () => {
  const { users, teams, updateEmployeeStatusSecure, resetEmployeePasswordSecure } = useData();
  const teamIdFor = (name:string) => teams.find((t:any) => String(t.name || '').trim().toLowerCase() === name.toLowerCase())?.id;
  const frames = FRAME_NAMES.map(name => ({
    name,
    users: name === 'Direct Agents'
      ? users.filter((u:any) => u.role === 'agent' && !u.teamId)
      : users.filter((u:any) => u.role === 'agent' && u.teamId === teamIdFor(name)),
  }));
  const others = users.filter((u:any) => u.role === 'agent' && u.teamId && !FRAME_NAMES.slice(0,4).some(n => teamIdFor(n) === u.teamId));

  const action = async (id:string, status:string) => {
    const result = await updateEmployeeStatusSecure(id, status);
    window.alert(result?.message || 'Updated.');
  };
  const resetPassword = async (id:string, name:string) => {
    const password = window.prompt(`New password for ${name} (minimum 8 characters):`, '');
    if (!password) return;
    const result = await resetEmployeePasswordSecure(id, password);
    window.alert(result?.message || 'Password reset completed.');
  };
  const statusBadge = (u:any) => String(u.employmentStatus || u.employment_status || 'PENDING').toUpperCase();

  const renderFrame = (frame:{name:string;users:any[]}) => (
    <section key={frame.name} className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div><h3 className="font-black text-white">{frame.name}</h3><p className="text-[11px] text-slate-400">{frame.users.length} agents</p></div>
        <span className="text-[10px] font-black text-emerald-300">OWNER CONTROL</span>
      </div>
      <div className="space-y-2">
        {frame.users.length === 0 ? <p className="text-xs text-slate-500 py-3">No agents mapped.</p> : frame.users.map((u:any) => {
          const status = statusBadge(u);
          const blocked = ['BLOCKED','SUSPENDED','INACTIVE','EXITED','PENDING'].includes(status);
          return <div key={u.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="min-w-0"><div className="font-bold text-white truncate">{u.name}</div><div className="text-[11px] text-slate-400">{u.agentCode || 'NO CODE'} · {u.email}</div><div className="text-[10px] text-slate-500 mt-1">Status: <span className="font-black text-slate-300">{status}</span> · Approval: {String(u.idApprovalStatus || u.id_approval_status || 'PENDING').toUpperCase()}</div></div>
              <div className="flex flex-wrap gap-2">
                <button onClick={()=>void action(u.id, blocked ? 'ACTIVE' : 'BLOCKED')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">{blocked ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <Ban className="w-3.5 h-3.5 inline mr-1" />}{blocked ? 'Activate' : 'Block'}</button>
                <button onClick={()=>void action(u.id, 'EXITED')} className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold"><UserX className="w-3.5 h-3.5 inline mr-1" /> Soft Remove</button>
                <button onClick={()=>void resetPassword(u.id, u.name)} className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold"><KeyRound className="w-3.5 h-3.5 inline mr-1" /> Reset Password</button>
              </div>
            </div>
          </div>;
        })}
      </div>
    </section>
  );

  return <div className="space-y-4">
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4"><h2 className="text-lg font-black text-white">Employee Management</h2><p className="text-xs text-slate-400 mt-1">Owner-only roster. ACTIVE / BLOCKED / SUSPENDED / INACTIVE / PENDING / APPROVED are preserved as authoritative state flags.</p></div>
    <div className="grid gap-4 md:grid-cols-2">{frames.map(renderFrame)}</div>
    {others.length > 0 && <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><h3 className="font-black text-white">Other Existing Teams</h3><p className="text-xs text-slate-500 mt-1">Existing teams outside the five requested frames remain visible here.</p><div className="mt-3 space-y-2">{others.map((u:any)=><div key={u.id} className="text-xs text-slate-300">{u.name} · {u.agentCode || 'NO CODE'} · {statusBadge(u)}</div>)}</div></section>}
  </div>;
};
