import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, CheckCircle2, Clock3, MapPin, RefreshCw, ShieldCheck, Square, TimerReset, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { detectFakeGps } from '../../utils/antiCheatDetector';
import { LiveGpsMapPanel, LiveGpsRow } from './LiveGpsMapPanel';

type AttendanceRow = LiveGpsRow;
type UserRow = { id: string; name: string; agent_code?: string | null; role: string; team_id?: string | null; team_name?: string | null };
type Props = { onBack?: () => void };

const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const formatTime = (value?: string | null) => { if (!value) return '--'; const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); };
const durationText = (start?: string | null, end?: string | null) => { if (!start) return '00:00:00'; const a = new Date(start).getTime(); const b = end ? new Date(end).getTime() : Date.now(); if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return '00:00:00'; const seconds = Math.floor((b - a) / 1000); return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; };

export const AttendancePage: React.FC<Props> = () => {
  const { currentUser } = useAuth();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showMap, setShowMap] = useState(false);
  const watchId = useRef<number | null>(null);
  const lastGpsWrite = useRef(0);

  const today = localDate();
  const isOwner = currentUser?.role === 'owner';
  const isLeader = currentUser?.role === 'team_leader';

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    const [attendanceResult, usersResult] = await Promise.all([
      supabase.from('attendance').select('*').order('date', { ascending: false }),
      supabase.from('users').select('id,name,agent_code,role,team_id')
    ]);
    if (attendanceResult.error) { setMessage(`Attendance data error: ${attendanceResult.error.message}`); setLoading(false); return; }
    if (usersResult.error) { setMessage(`Employee data error: ${usersResult.error.message}`); setLoading(false); return; }
    setRows((attendanceResult.data || []) as AttendanceRow[]);
    setUsers((usersResult.data || []) as UserRow[]);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const myRow = useMemo(() => rows.find(r => r.user_id === currentUser?.id && r.date === today), [rows, currentUser?.id, today]);
  const teamIds = useMemo(() => { if (!isLeader || !currentUser?.teamId) return new Set<string>(); return new Set(users.filter(u => u.team_id === currentUser.teamId).map(u => u.id)); }, [isLeader, currentUser?.teamId, users]);
  const visibleRows = useMemo(() => { if (isOwner) return rows.filter(r => r.date === today); if (isLeader) return rows.filter(r => r.date === today && (r.user_id === currentUser?.id || teamIds.has(r.user_id))); return rows.filter(r => r.user_id === currentUser?.id).slice(0, 31); }, [rows, today, isOwner, isLeader, currentUser?.id, teamIds]);

  useEffect(() => {
    const channel = supabase.channel(`dd-world-attendance-live:${currentUser?.id || 'anonymous'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load, currentUser?.id]);

  const stopLiveGps = useCallback(() => {
    if (watchId.current !== null && 'geolocation' in navigator) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }, []);

  const startLiveGps = useCallback((attendanceId: string) => {
    stopLiveGps();
    if (!('geolocation' in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(async position => {
      const nowMs = Date.now();
      if (nowMs - lastGpsWrite.current < 15000) return;
      const fake = detectFakeGps(position.coords);
      if (fake.isFake) { setMessage(`⚠️ Live GPS blocked: ${fake.reason}`); return; }
      lastGpsWrite.current = nowMs;
      const gps = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy, timestamp: new Date(nowMs).toISOString() };
      const { data: current } = await supabase.from('attendance').select('gps_location').eq('id', attendanceId).eq('user_id', currentUser?.id || '').maybeSingle();
      const previous = (current?.gps_location || {}) as Record<string, any>;
      await supabase.from('attendance').update({ gps_location: { ...previous, lastLocation: gps } }).eq('id', attendanceId).eq('user_id', currentUser?.id || '');
    }, error => setMessage(`⚠️ Live GPS: ${error.message}`), { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  }, [currentUser?.id, stopLiveGps]);

  useEffect(() => { if (myRow?.check_in_time && !myRow?.check_out_time) startLiveGps(myRow.id); else stopLiveGps(); return stopLiveGps; }, [myRow?.id, myRow?.check_in_time, myRow?.check_out_time, startLiveGps, stopLiveGps]);

  const getGps = () => new Promise<GeolocationPosition>((resolve, reject) => { if (!('geolocation' in navigator)) return reject(new Error('GPS is not available on this device.')); navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); });

  const mark = async (kind: 'in' | 'out') => {
    if (!currentUser || busy) return;
    if (kind === 'out' && !myRow?.check_in_time) { setMessage('මුලින් Check-In කරන්න.'); return; }
    if (kind === 'in' && myRow?.check_in_time) { setMessage('අද Check-In එක දැනටමත් සටහන් වී ඇත.'); return; }
    if (kind === 'out' && myRow?.check_out_time) { setMessage('අද Check-Out එක දැනටමත් සටහන් වී ඇත.'); return; }
    setBusy(true); setMessage('GPS location verify කරමින්...');
    try {
      const pos = await getGps(); const fake = detectFakeGps(pos.coords); if (fake.isFake) throw new Error(`Fake GPS හඳුනාගන්නා ලදී: ${fake.reason}`);
      const timestamp = new Date().toISOString(); const gps = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
      if (kind === 'in') {
        const payload = { id: crypto.randomUUID(), user_id: currentUser.id, date: today, status: 'present', check_in_time: timestamp, gps_location: { ...gps, checkIn: { ...gps, timestamp }, lastLocation: { ...gps, timestamp } } };
        const { error } = await supabase.from('attendance').insert(payload); if (error) throw error;
        setMessage('✅ GPS verified — Check-In සාර්ථකයි. Live GPS tracking ආරම්භ විය.');
      } else {
        const oldGps = myRow?.gps_location || {}; const { error } = await supabase.from('attendance').update({ check_out_time: timestamp, gps_location: { ...oldGps, checkOut: { ...gps, timestamp }, lastLocation: { ...gps, timestamp } } }).eq('id', myRow!.id).eq('user_id', currentUser.id); if (error) throw error;
        stopLiveGps(); setMessage('✅ Check-Out සාර්ථකයි. Live GPS tracking නවතා data save කරන ලදී.');
      }
      await load();
    } catch (error: any) { setMessage(`⚠️ Attendance save වුණේ නැහැ: ${error?.message || 'GPS/permission error'}`); } finally { setBusy(false); }
  };

  if (!currentUser) return null;
  const running = Boolean(myRow?.check_in_time && !myRow?.check_out_time);
  const currentDuration = durationText(myRow?.check_in_time, myRow?.check_out_time || (running ? new Date(now).toISOString() : undefined));

  return <section className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
    <div className="rounded-3xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-5 shadow-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="mb-2 flex items-center gap-2 text-emerald-400"><CalendarCheck className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[0.18em]">Page 2</span></div><h1 className="text-2xl font-black text-white">Attendance & Field Work</h1><p className="mt-1 text-sm text-slate-400">GPS verified Check-In → live field tracking → GPS verified Check-Out</p></div><div className="flex gap-2"><button onClick={() => void load()} disabled={loading} className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>{(isOwner || isLeader) && <button onClick={() => setShowMap(v => !v)} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-black text-white hover:bg-emerald-500"><MapPin className="h-4 w-4" />{showMap ? 'Hide Live Map' : 'Live GPS Map'}</button>}</div></div>
    </div>

    {showMap && (isOwner || isLeader) && <LiveGpsMapPanel rows={visibleRows} users={users} title={isOwner ? 'Company Live GPS Map' : 'My Team Live GPS Map'} />}

    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
        <div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">TODAY · {today}</p><h2 className="mt-1 text-lg font-black text-white">{currentUser.name}</h2><p className="text-xs text-slate-400">{currentUser.agentCode || ''}</p></div><div className={`rounded-2xl px-3 py-2 text-xs font-black ${running ? 'bg-emerald-500/15 text-emerald-400' : myRow?.check_out_time ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>{running ? 'FIELD WORK ACTIVE' : myRow?.check_out_time ? 'COMPLETED' : 'NOT MARKED'}</div></div>
        <div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4"><Clock3 className="h-4 w-4 text-emerald-400" /><p className="mt-2 text-[10px] font-bold text-slate-500">CHECK-IN</p><p className="text-sm font-black text-white">{formatTime(myRow?.check_in_time)}</p></div><div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4"><Square className="h-4 w-4 text-blue-400" /><p className="mt-2 text-[10px] font-bold text-slate-500">CHECK-OUT</p><p className="text-sm font-black text-white">{formatTime(myRow?.check_out_time)}</p></div><div className="rounded-2xl border border-slate-700 bg-slate-950/70 p-4"><TimerReset className="h-4 w-4 text-amber-400" /><p className="mt-2 text-[10px] font-bold text-slate-500">TOTAL TIME</p><p className="text-sm font-black text-white tabular-nums">{currentDuration}</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><button onClick={() => void mark('in')} disabled={busy || Boolean(myRow?.check_in_time)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"><MapPin className="h-5 w-5" />Mark Check-In</button><button onClick={() => void mark('out')} disabled={busy || !myRow?.check_in_time || Boolean(myRow?.check_out_time)} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"><CheckCircle2 className="h-5 w-5" />End Field Work / Check-Out</button></div>
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-slate-700 bg-slate-950/60 p-3 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />GPS is required for both actions. During Field Work, the latest GPS point is updated securely and visible only to authorized roles.</div>
        {message && <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-300">{message}</div>}
      </div>
      {(isOwner || isLeader) && <div className="rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-xl"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-black text-white">{isOwner ? 'Company Attendance — Today' : 'My Team Attendance — Today'}</h2></div><div className="mt-4 space-y-2">{visibleRows.length === 0 && <p className="rounded-2xl bg-slate-950/60 p-4 text-sm text-slate-500">No attendance records yet.</p>}{visibleRows.slice(0, 40).map(row => { const u = users.find(x => x.id === row.user_id); const gps = row.gps_location?.lastLocation || row.gps_location; return <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 p-3"><div><p className="text-sm font-bold text-white">{u?.name || row.user_id}</p><p className="text-[10px] text-slate-500">{u?.agent_code || ''} · {row.status}</p>{gps?.latitude != null && <p className="text-[9px] text-emerald-400">GPS {Number(gps.latitude).toFixed(5)}, {Number(gps.longitude).toFixed(5)}</p>}</div><div className="text-right text-[11px] font-bold text-slate-300"><div>{formatTime(row.check_in_time)} → {formatTime(row.check_out_time)}</div><div className="text-emerald-400">{durationText(row.check_in_time, row.check_out_time)}</div></div></div>; })}</div></div>}
    </div>
  </section>;
};
