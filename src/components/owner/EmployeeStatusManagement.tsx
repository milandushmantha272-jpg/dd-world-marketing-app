import React, { useMemo, useState } from 'react';
import { CheckCircle2, Database, Search, ShieldAlert, Trash2, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isOwnerDoc, useData } from '../../context/DataContext';
import { EmploymentStatus } from '../../types';

export const EmployeeStatusManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, updateEmploymentStatus, deleteUser } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'agent' | 'team_leader'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('all');
  const [message, setMessage] = useState<string | null>(null);

  const filteredUsers = useMemo(() => users.filter((u) => {
    if (isOwnerDoc(u)) return false;
    const status = u.employmentStatus || (u.status === 'blocked' ? 'BLOCKED' : 'ACTIVE');
    const roleOk = roleFilter === 'all' || u.role === roleFilter;
    const statusOk = statusFilter === 'all' || status === statusFilter;
    const query = searchTerm.trim().toLowerCase();
    const searchOk = !query || u.name.toLowerCase().includes(query) || u.agentCode?.toLowerCase().includes(query) || u.employeeId?.toLowerCase().includes(query);
    return roleOk && statusOk && searchOk;
  }), [users, searchTerm, roleFilter, statusFilter]);

  if (currentUser?.role !== 'owner') {
    return <div className="p-6 text-center text-rose-400 font-bold">⚠️ මෙම පිටුව නැරඹීමට අවසර ඇත්තේ Owner හට පමණි.</div>;
  }

  const setStatus = (id: string, status: EmploymentStatus) => {
    updateEmploymentStatus(id, status);
    setMessage(`✅ Employee status updated to ${status}.`);
    setTimeout(() => setMessage(null), 4000);
  };

  const removeEmployee = (id: string) => {
    const result = deleteUser(id);
    setMessage(result.success ? `🗑️ ${result.message}` : `⚠️ ${result.message}`);
    setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-wider"><ShieldAlert className="w-4 h-4" /> OWNER CONTROL • EMPLOYEE STATUS MANAGEMENT</div>
        <h2 className="text-xl font-black text-white mt-2">සේවක Status Control Center</h2>
        <p className="text-xs text-slate-400 mt-2">Authentication credentials are managed only by Firebase Authentication. This screen controls employee status, approval and account lifecycle only.</p>
      </div>

      {message && <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold"><CheckCircle2 className="inline w-4 h-4 mr-2" />{message}</div>}

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]"><Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="නම / Agent Code / Employee ID" className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white outline-none" /></div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-300 font-bold"><option value="all">සියලුම Roles</option><option value="agent">Agents</option><option value="team_leader">Team Leaders</option></select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-300 font-bold"><option value="all">සියලුම Statuses</option><option value="ACTIVE">ACTIVE</option><option value="SUSPENDED">SUSPENDED</option><option value="EXITED">EXITED</option><option value="BLOCKED">BLOCKED</option></select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-black text-white flex items-center gap-2"><UserCheck className="w-4 h-4 text-emerald-400" /> සේවක ලැයිස්තුව ({filteredUsers.length})</h3><span className="text-xs text-slate-400 font-bold flex items-center gap-1"><Database className="w-3.5 h-3.5 text-cyan-400" /> Historical Data Preserved</span></div>
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead><tr className="border-b border-slate-800 text-slate-400"><th className="p-3">Employee</th><th className="p-3">ID</th><th className="p-3">Role</th><th className="p-3">Team</th><th className="p-3">Status</th><th className="p-3 text-right">Owner Action</th></tr></thead>
          <tbody className="divide-y divide-slate-800/60">{filteredUsers.map((u) => { const status: EmploymentStatus = u.employmentStatus || (u.status === 'blocked' ? 'BLOCKED' : 'ACTIVE'); return <tr key={u.id} className="hover:bg-slate-950/50"><td className="p-3"><div className="font-bold text-white">{u.name}</div><div className="text-[10px] text-slate-400">{u.email || 'Firebase email not set'}</div></td><td className="p-3 font-mono text-amber-300">{u.employeeId || u.agentCode || 'N/A'}</td><td className="p-3 text-slate-200">{u.role}</td><td className="p-3 text-slate-200">{u.teamName || 'Unassigned'}</td><td className="p-3 font-bold text-cyan-300">{status}</td><td className="p-3 text-right space-x-2">{status === 'ACTIVE' ? <button onClick={() => setStatus(u.id, 'SUSPENDED')} className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">Suspend</button> : <button onClick={() => setStatus(u.id, 'ACTIVE')} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">Activate</button>}{status !== 'EXITED' && <button onClick={() => setStatus(u.id, 'EXITED')} className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20">Exit</button>}<button onClick={() => removeEmployee(u.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"><Trash2 className="inline w-3.5 h-3.5" /></button></td></tr>; })}</tbody>
        </table>
      </div>
    </div>
  );
};
