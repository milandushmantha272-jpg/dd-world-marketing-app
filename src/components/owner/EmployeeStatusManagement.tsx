import React, { useState } from 'react';
import { UserCheck, ShieldAlert, Search, Filter, AlertTriangle, Lock, CheckCircle2, UserX, Clock, Database } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { EmploymentStatus, User } from '../../types';

export const EmployeeStatusManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, updateEmploymentStatus } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'agent' | 'team_leader'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EmploymentStatus>('all');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (currentUser?.role !== 'owner') {
    return (
      <div className="p-6 text-center text-rose-400 font-bold">
        ⚠️ මෙම පිටුව නැරඹීමට අවසර ඇත්තේ Owner හට පමණි.
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (u.role === 'owner') return false; // Exclude Owner from status changes
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    const currentEmpStatus = u.employmentStatus || (u.status === 'blocked' ? 'BLOCKED' : 'ACTIVE');
    const matchStatus = statusFilter === 'all' || currentEmpStatus === statusFilter;
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.agentCode && u.agentCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchRole && matchStatus && matchSearch;
  });

  const handleStatusChange = (targetUser: User, newStatus: EmploymentStatus) => {
    setUpdatingUserId(targetUser.id);
    updateEmploymentStatus(targetUser.id, newStatus);

    setSuccessMsg(`✅ ${targetUser.name} ගේ ගිණුම් තත්ත්වය ${newStatus} ලෙස සාර්ථකව වෙනස් කරන ලදී. (ඓතිහාසික දත්ත සියල්ල සුරක්ෂිතයි)`);
    setUpdatingUserId(null);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-rose-400 text-xs font-black uppercase tracking-wider">
          <ShieldAlert className="w-4 h-4" /> OWNER CONTROL • EMPLOYEE STATUS MANAGEMENT
        </div>
        <h2 className="text-xl font-black text-white">
          සේවක සක්‍රීය / අක්‍රීය / ඉවත් කිරීම් පාලන මධ්‍යස්ථානය (Employee Status Control)
        </h2>
        <p className="text-xs text-slate-400">
          සේවකයෙකු EXITED හෝ BLOCKED කළ විට ඔවුන්ට පද්ධතියට ලොග් වීමට, අලුතින් Attendance හෝ Sales ඇතුළත් කිරීමට නොහැකි වේ. <strong>නමුත් ඔවුන්ගේ පෙර පැවති සියලුම Sales, Attendance සහ GPS ඓතිහාසික දත්ත පද්ධතිය තුළ සුරක්ෂිතව තැන්පත් වී පවතී.</strong>
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="නම, Agent Code හෝ Employee ID මඟින් සොයන්න..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-300 font-bold focus:border-rose-500 outline-none"
          >
            <option value="all">සියලුම Roles</option>
            <option value="agent">Agents Only</option>
            <option value="team_leader">Team Leaders Only</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-2xl px-3 py-2.5 text-xs text-slate-300 font-bold focus:border-rose-500 outline-none"
          >
            <option value="all">සියලුම Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="EXITED">EXITED</option>
            <option value="BLOCKED">BLOCKED</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" /> සේවක ලැයිස්තුව ({filteredUsers.length})
          </h3>
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <Database className="w-3.5 h-3.5 text-cyan-400" /> Historical Data Preserved
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[780px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold bg-slate-950">
                <th className="p-3 whitespace-nowrap">Employee Name</th>
                <th className="p-3 whitespace-nowrap">Employee ID</th>
                <th className="p-3 whitespace-nowrap">Agent Code</th>
                <th className="p-3 whitespace-nowrap min-w-[120px]">Role</th>
                <th className="p-3 whitespace-nowrap min-w-[140px]">Assigned Team</th>
                <th className="p-3 whitespace-nowrap">KYC Compliance</th>
                <th className="p-3 whitespace-nowrap">Current Status</th>
                <th className="p-3 text-right whitespace-nowrap">Change Status (Owner Action)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => {
                const currentEmpStatus: EmploymentStatus = u.employmentStatus || (u.status === 'blocked' ? 'BLOCKED' : 'ACTIVE');
                const hasKyc = Boolean(u.kycDocuments?.gnCertificate && u.kycDocuments?.policeReport);

                return (
                  <tr key={u.id} className="hover:bg-slate-950/50">
                    <td className="p-3">
                      <div className="font-bold text-white whitespace-nowrap">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.mobile}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                      {u.employeeId || `DDW-EMP-${u.agentCode || '000'}`}
                    </td>
                    <td className="p-3 font-mono text-cyan-300 font-bold whitespace-nowrap">{u.agentCode || 'N/A'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {u.role === 'team_leader' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 font-extrabold text-[11px] whitespace-nowrap">
                          Team Leader
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 font-extrabold text-[11px] whitespace-nowrap">
                          Agent
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-bold text-slate-200">{u.teamName || 'Unassigned'}</span>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {hasKyc ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified (GN/Police)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                          <AlertTriangle className="w-3 h-3 text-amber-400" /> Pending Upload
                        </span>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border inline-block ${
                        currentEmpStatus === 'ACTIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : currentEmpStatus === 'SUSPENDED'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : currentEmpStatus === 'EXITED'
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {currentEmpStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          disabled={currentEmpStatus === 'ACTIVE'}
                          onClick={() => handleStatusChange(u, 'ACTIVE')}
                          className="px-2.5 py-1 rounded-xl bg-emerald-600/80 hover:bg-emerald-500 disabled:opacity-30 text-white font-black text-[10px] transition"
                        >
                          ACTIVE
                        </button>
                        <button
                          disabled={currentEmpStatus === 'SUSPENDED'}
                          onClick={() => handleStatusChange(u, 'SUSPENDED')}
                          className="px-2.5 py-1 rounded-xl bg-amber-600/80 hover:bg-amber-500 disabled:opacity-30 text-white font-black text-[10px] transition"
                        >
                          SUSPEND
                        </button>
                        <button
                          disabled={currentEmpStatus === 'EXITED'}
                          onClick={() => handleStatusChange(u, 'EXITED')}
                          className="px-2.5 py-1 rounded-xl bg-purple-600/80 hover:bg-purple-500 disabled:opacity-30 text-white font-black text-[10px] transition"
                        >
                          EXITED
                        </button>
                        <button
                          disabled={currentEmpStatus === 'BLOCKED'}
                          onClick={() => handleStatusChange(u, 'BLOCKED')}
                          className="px-2.5 py-1 rounded-xl bg-rose-600/80 hover:bg-rose-500 disabled:opacity-30 text-white font-black text-[10px] transition"
                        >
                          BLOCK
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
