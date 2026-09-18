import React, { useMemo, useState } from 'react';
import { Ban, CheckCircle2, KeyRound, LockKeyhole, Pencil, Plus, RefreshCw, Search, ShieldCheck, Trash2, UserPlus, Users, Wifi, WifiOff, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ownerUserAdmin } from '../../services/supabaseAuth';

type ManagedUser = any;
type Filter = 'ALL' | 'ONLINE' | 'OFFLINE' | 'AGENTS' | 'LEADERS';

const roleLabel = (role: string) =>
  role === 'team_leader' ? 'Team Leader' : role === 'junior_team_leader' ? 'Junior Team Leader' : 'Agent';

const statusLabel = (u: ManagedUser) => {
  const status = String(u.status || '').toLowerCase();
  if (status === 'blocked') return 'BLOCKED';
  if (status === 'suspended') return 'SUSPENDED';
  if (status === 'inactive') return 'LOGIN OFF';
  return 'ACTIVE';
};

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'agent' as 'agent' | 'team_leader' | 'junior_team_leader',
  phone: '',
  agentCode: '',
  teamId: '',
};

export const OwnerUserAccessManagementPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, teams, retryData } = useData();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [query, setQuery] = useState('');
  const [authRows, setAuthRows] = useState<ManagedUser[]>([]);
  const [selected, setSelected] = useState<ManagedUser | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [createForm, setCreateForm] = useState({ ...emptyForm });
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const ownerOnly = currentUser?.role === 'owner';

  const load = async () => {
    if (!ownerOnly) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = await ownerUserAdmin<{ users: ManagedUser[] }>({ action: 'list' });
      setAuthRows((result.users || []).map((u: ManagedUser) => ({ ...u, isLoggedIn: Boolean(u.is_logged_in), isAppDownloaded: Boolean(u.is_app_downloaded), lastLoginAt: u.last_login_at || null, authLastSignInAt: u.auth_last_sign_in_at || null })));
      await retryData();
    } catch (e: any) {
      setError(e?.message || 'Unable to load Owner account management data.');
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => { void load(); }, [ownerOnly]);

  const mergedUsers = useMemo(() => {
    const source = authRows.length ? authRows : users.filter((u: any) => ['agent', 'team_leader', 'junior_team_leader'].includes(u.role));
    const q = query.trim().toLowerCase();
    return source
      .filter((u: ManagedUser) => {
        if (filter === 'AGENTS' && u.role !== 'agent') return false;
        if (filter === 'LEADERS' && !['team_leader', 'junior_team_leader'].includes(u.role)) return false;
        if (filter === 'ONLINE' && !u.isLoggedIn) return false;
        if (filter === 'OFFLINE' && u.isLoggedIn) return false;
        if (!q) return true;
        return [u.name, u.email, u.agent_code, u.phone, u.role, u.team_name].some((v) => String(v || '').toLowerCase().includes(q));
      })
      .sort((a: ManagedUser, b: ManagedUser) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [authRows, users, filter, query]);

  const onlineCount = mergedUsers.filter((u: ManagedUser) => u.isLoggedIn).length;
  const offlineCount = mergedUsers.filter((u: ManagedUser) => !u.isLoggedIn).length;
  const agentCount = mergedUsers.filter((u: ManagedUser) => u.role === 'agent').length;
  const leaderCount = mergedUsers.filter((u: ManagedUser) => ['team_leader', 'junior_team_leader'].includes(u.role)).length;

  const openEdit = (u: ManagedUser) => {
    setSelected(u);
    setEditForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      role: ['agent', 'team_leader', 'junior_team_leader'].includes(u.role) ? u.role : 'agent',
      phone: u.phone || u.mobile || '',
      agentCode: u.agent_code || u.agentCode || '',
      teamId: u.team_id || u.teamId || '',
    });
    setError(''); setMessage('');
  };

  const run = async (payload: any, successText: string) => {
    setBusy(true); setError(''); setMessage('');
    try {
      await ownerUserAdmin(payload);
      setMessage(successText);
      await load();
      setSelected(null);
    } catch (e: any) {
      setError(e?.message || 'Owner account action failed.');
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    if (!selected) return;
    await run({
      action: 'update',
      id: selected.id,
      name: editForm.name,
      email: editForm.email,
      password: editForm.password || undefined,
      role: editForm.role,
      phone: editForm.phone,
      agentCode: editForm.agentCode,
      teamId: editForm.teamId || null,
    }, 'Username / profile / password updated successfully.');
  };

  const setStatus = async (u: ManagedUser, status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'INACTIVE') => {
    await run({ action: 'set_status', id: u.id, status }, `${u.name} → ${status} completed.`);
  };

  const deleteAccount = async (u: ManagedUser) => {
    if (!window.confirm(`${u.name} account එක සම්පූර්ණයෙන් delete කරන්නද? Auth login එකත් employee profile එකත් ඉවත් වේ.`)) return;
    await run({ action: 'delete', id: u.id }, `${u.name} account deleted.`);
  };

  const createAccount = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError('Name, username/email and password are required.');
      return;
    }
    await run({
      action: 'create',
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
      phone: createForm.phone,
      agentCode: createForm.agentCode,
      teamId: createForm.teamId || null,
    }, 'New employee login account created and activated.');
    setCreateForm({ ...emptyForm });
    setShowCreate(false);
  };

  if (!ownerOnly) return null;

  return (
    <section className="dd-page-shell min-h-screen px-3 py-4 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-4 md:space-y-5">
        <header className="dd-card rounded-[26px] p-5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-emerald-300"><ShieldCheck className="h-4 w-4" /> OWNER ONLY · USER & ACCESS CONTROL</div>
              <h1 className="mt-2 text-2xl font-black text-white md:text-3xl">Agents & Team Leaders — Accounts</h1>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">සියලු Agent / Team Leader accounts එකම තැනකින් බලන්න. Username (email), password, login permission, active / blocked / suspended status, app usage සහ delete controls Ownerට පමණයි.</p>
            </div>
            <div className="flex w-full gap-2 sm:w-auto">
              <button type="button" onClick={() => void load()} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs font-black text-white sm:flex-none"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</button>
              <button type="button" onClick={() => { setShowCreate(true); setError(''); setMessage(''); }} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white sm:flex-none"><UserPlus className="h-4 w-4" /> New Account</button>
            </div>
          </div>
        </header>

        {error && <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm font-bold text-rose-200">{error}</div>}
        {message && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">{message}</div>}

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['ALL', 'All', mergedUsers.length, Users],
            ['ONLINE', 'Logged In', onlineCount, Wifi],
            ['OFFLINE', 'Logged Out', offlineCount, WifiOff],
            ['AGENTS', 'Agents', agentCount, UserPlus],
          ].map(([key, label, count, Icon]: any) => (
            <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-2xl border p-3 text-left ${filter === key ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'}`}>
              <div className="flex items-center justify-between"><Icon className="h-4 w-4 text-emerald-300" /><span className="text-xl font-black text-white">{count}</span></div>
              <div className="mt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name / username / code / team" className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-emerald-400" /></div>
            <button type="button" onClick={() => setFilter('LEADERS')} className={`rounded-xl border px-4 py-3 text-xs font-black ${filter === 'LEADERS' ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950 text-slate-300'}`}>Team Leaders ({leaderCount})</button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mergedUsers.map((u: ManagedUser) => {
            const online = Boolean(u.isLoggedIn);
            const status = statusLabel(u);
            const lastLogin = u.authLastSignInAt || u.lastLoginAt || u.last_login_at;
            return (
              <article key={u.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-slate-600'}`} /><h2 className="truncate text-base font-black text-white">{u.name || 'Unnamed'}</h2></div>
                    <div className="mt-1 text-[11px] font-bold text-cyan-300">{roleLabel(u.role)}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-300' : status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'}`}>{status}</span>
                </div>

                <div className="mt-4 space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-3 text-xs">
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Username</span><span className="truncate text-right font-bold text-slate-200">{u.email || 'Not set'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Agent Code</span><span className="font-bold text-slate-200">{u.agent_code || u.agentCode || '—'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Team</span><span className="truncate text-right font-bold text-slate-200">{u.team_name || teams.find((t: any) => t.id === u.team_id)?.name || 'Not assigned'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">App</span><span className={`font-bold ${u.isAppDownloaded ? 'text-emerald-300' : 'text-slate-400'}`}>{u.isAppDownloaded ? 'Downloaded' : 'Not downloaded'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Login</span><span className={online ? 'font-bold text-emerald-300' : 'font-bold text-slate-400'}>{online ? 'LOGGED IN' : 'LOGGED OUT'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">Last Auth Login</span><span className="text-right font-bold text-slate-300">{lastLogin ? new Date(lastLogin).toLocaleString() : 'Not recorded'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-slate-500">ID Approval</span><span className="font-bold text-slate-300">{u.id_approval_status || '—'}</span></div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => openEdit(u)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 text-xs font-black text-white"><Pencil className="h-4 w-4" /> Edit</button>
                  <button type="button" onClick={() => void setStatus(u, 'ACTIVE')} disabled={busy || status === 'ACTIVE'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-black text-emerald-200 disabled:opacity-40"><CheckCircle2 className="h-4 w-4" /> Active</button>
                  <button type="button" onClick={() => void setStatus(u, 'SUSPENDED')} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs font-black text-amber-200"><LockKeyhole className="h-4 w-4" /> Suspend</button>
                  <button type="button" onClick={() => void setStatus(u, 'BLOCKED')} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-black text-rose-200"><Ban className="h-4 w-4" /> Block</button>
                  <button type="button" onClick={() => void setStatus(u, 'INACTIVE')} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 text-xs font-black text-slate-300"><WifiOff className="h-4 w-4" /> Login Off</button>
                  <button type="button" onClick={() => void deleteAccount(u)} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/30 text-xs font-black text-rose-200"><Trash2 className="h-4 w-4" /> Delete</button>
                </div>
              </article>
            );
          })}
        </div>

        {!mergedUsers.length && <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 p-10 text-center text-sm text-slate-400">No employees match this filter.</div>}

        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs leading-5 text-slate-300">
          <b className="text-white">Security note:</b> Ownerට password <b>බලන්න</b> දෙන්නේ නැහැ. Supabase Auth එකේ plaintext password එක නැති නිසා Ownerට <b>new password set / change</b> කිරීම පමණක් කළ හැක. Password/admin operations are executed through a protected server-side Edge Function; the service/secret key is never placed in the Android app.
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 sm:p-6">
          <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:my-10">
            <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">OWNER ACCOUNT EDIT</div><h2 className="mt-1 text-xl font-black text-white">{selected.name}</h2></div><button type="button" onClick={() => setSelected(null)} className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-900 text-slate-300"><X className="mx-auto h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Name', 'name'], ['Username / Email', 'email'], ['Phone', 'phone'], ['Agent Code', 'agentCode']
              ].map(([label, key]) => <label key={key} className="text-xs font-bold text-slate-400">{label}<input value={(editForm as any)[key]} onChange={(e) => setEditForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>)}
              <label className="text-xs font-bold text-slate-400">Role<select value={editForm.role} onChange={(e) => setEditForm((v) => ({ ...v, role: e.target.value as any }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white"><option value="agent">Agent</option><option value="team_leader">Team Leader</option><option value="junior_team_leader">Junior Team Leader</option></select></label>
              <label className="text-xs font-bold text-slate-400">Team<select value={editForm.teamId} onChange={(e) => setEditForm((v) => ({ ...v, teamId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white"><option value="">No team</option>{teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400 sm:col-span-2">New Password <span className="text-slate-600">(leave empty = no change)</span><input type="password" value={editForm.password} onChange={(e) => setEditForm((v) => ({ ...v, password: e.target.value }))} placeholder="Minimum 8 characters" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button type="button" onClick={() => void saveEdit()} disabled={busy} className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white"><Pencil className="h-4 w-4" /> Save</button>
              <button type="button" onClick={() => void run({ action: 'set_status', id: selected.id, status: 'ACTIVE' }, 'Login permission enabled.')} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-black text-emerald-200"><CheckCircle2 className="h-4 w-4" /> Login ON</button>
              <button type="button" onClick={() => void run({ action: 'set_status', id: selected.id, status: 'INACTIVE' }, 'Login permission disabled.')} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 text-xs font-black text-slate-300"><LockKeyhole className="h-4 w-4" /> Login OFF</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 p-3 sm:p-6">
          <div className="mx-auto my-4 w-full max-w-2xl rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:my-10">
            <div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-300">OWNER ONLY</div><h2 className="mt-1 text-xl font-black text-white">New Agent / Team Leader Login</h2></div><button type="button" onClick={() => setShowCreate(false)} className="h-10 w-10 rounded-xl border border-slate-700 bg-slate-900 text-slate-300"><X className="mx-auto h-5 w-5" /></button></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ['Name', 'name'], ['Username / Email', 'email'], ['Phone', 'phone'], ['Agent Code', 'agentCode']
              ].map(([label, key]) => <label key={key} className="text-xs font-bold text-slate-400">{label}<input value={(createForm as any)[key]} onChange={(e) => setCreateForm((v) => ({ ...v, [key]: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>)}
              <label className="text-xs font-bold text-slate-400">Role<select value={createForm.role} onChange={(e) => setCreateForm((v) => ({ ...v, role: e.target.value as any }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white"><option value="agent">Agent</option><option value="team_leader">Team Leader</option><option value="junior_team_leader">Junior Team Leader</option></select></label>
              <label className="text-xs font-bold text-slate-400">Team<select value={createForm.teamId} onChange={(e) => setCreateForm((v) => ({ ...v, teamId: e.target.value }))} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white"><option value="">No team</option>{teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-400 sm:col-span-2">Initial Password<input type="password" value={createForm.password} onChange={(e) => setCreateForm((v) => ({ ...v, password: e.target.value }))} placeholder="Minimum 8 characters" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" /></label>
            </div>
            <button type="button" onClick={() => void createAccount()} disabled={busy} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-black text-white"><Plus className="h-5 w-5" /> Create & Activate Login</button>
            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-500"><KeyRound className="mt-0.5 h-4 w-4 shrink-0" /> Email is the Supabase username. The Owner creates the password; employees do not create organization Auth accounts themselves.</div>
          </div>
        </div>
      )}
    </section>
  );
};
