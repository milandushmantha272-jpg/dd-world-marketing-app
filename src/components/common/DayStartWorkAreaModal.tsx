import React, { useEffect, useMemo, useState } from 'react';
import { X, MapPin, Play, Square, Clock3, ShieldCheck, Navigation } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

const SESSION_KEY = 'ddworld_field_work_session_v1';

type StoredSession = {
  id: string;
  startedAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
};

const readSession = (): StoredSession | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
};

const formatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

export const DayStartWorkAreaModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { currentUser } = useAuth();
  const { addWorkAreaRecord, addLocationRecord, updateUserGps } = useData();
  const [session, setSession] = useState<StoredSession | null>(() => readSession());
  const [now, setNow] = useState(() => Date.now());
  const [gps, setGps] = useState<{ latitude?: number; longitude?: number; accuracy?: number }>({});
  const [message, setMessage] = useState<string | null>(null);

  const activeSeconds = useMemo(() => {
    if (!session) return 0;
    return Math.max(0, (now - new Date(session.startedAt).getTime()) / 1000);
  }, [now, session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  useEffect(() => {
    if (!isOpen || !session || !currentUser || !('geolocation' in navigator)) return;
    const pushLocation = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      setGps({ latitude, longitude, accuracy });
      updateUserGps(currentUser.id, { latitude, longitude, accuracy, district: currentUser.district });
      addLocationRecord({
        employee_id: currentUser.id,
        agent_code: currentUser.agentCode || 'AG-000',
        employee_name: currentUser.name,
        team_id: currentUser.teamId,
        team_name: currentUser.teamName,
        role: currentUser.role,
        latitude,
        longitude,
        accuracy: accuracy || 0,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().slice(0, 10),
        time_display: new Date().toLocaleTimeString(),
        status: 'FIELD_ACTIVE',
        source: 'FIELD_WORK_SESSION',
        sessionId: session.id,
        gpsPermissionStatus: 'GRANTED',
      });
    };
    const watchId = navigator.geolocation.watchPosition(pushLocation, () => undefined, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 15000,
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOpen, session, currentUser, addLocationRecord, updateUserGps]);

  if (!isOpen) return null;

  const startFieldWork = () => {
    if (!currentUser) return;
    if (session) {
      setMessage('⚠️ අද දින Field Work session එක දැනටමත් Active.');
      return;
    }

    const start = new Date().toISOString();
    const newSession: StoredSession = {
      id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      startedAt: start,
    };

    const finishStart = (position?: GeolocationPosition) => {
      const next = position
        ? { ...newSession, latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }
        : newSession;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setSession(next);
      setNow(Date.now());
      setMessage('✅ Field Work ආරම්භ විය. Active Time + GPS tracking සක්‍රියයි.');
    };

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(finishStart, () => finishStart(), {
        enableHighAccuracy: true,
        timeout: 10000,
      });
    } else {
      finishStart();
    }
  };

  const endFieldWork = () => {
    if (!currentUser || !session) return;
    const endedAt = new Date();
    const seconds = Math.max(0, Math.floor((endedAt.getTime() - new Date(session.startedAt).getTime()) / 1000));
    const date = endedAt.toISOString().slice(0, 10);
    const district = currentUser.district || 'Assigned Territory';

    addWorkAreaRecord({
      agentId: currentUser.id,
      agentName: currentUser.name,
      district,
      areaName: `Field Sales — ${district}`,
      assignedDate: date,
    });

    if (gps.latitude && gps.longitude) {
      addLocationRecord({
        employee_id: currentUser.id,
        agent_code: currentUser.agentCode || 'AG-000',
        employee_name: currentUser.name,
        team_id: currentUser.teamId,
        team_name: currentUser.teamName,
        role: currentUser.role,
        latitude: gps.latitude,
        longitude: gps.longitude,
        accuracy: gps.accuracy || 0,
        timestamp: endedAt.toISOString(),
        date,
        time_display: endedAt.toLocaleTimeString(),
        status: 'FIELD_ENDED',
        source: 'FIELD_WORK_SESSION',
        sessionId: session.id,
        gpsPermissionStatus: 'GRANTED',
      });
    }

    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
    setMessage(`✅ Field Work අවසන්. Active Time: ${formatDuration(seconds)}.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full text-white space-y-5 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider font-black text-emerald-400">DD WORLD FIELD CONTROL</div>
              <h3 className="font-black text-base">Daily Field Work / Active Location</h3>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400"><Clock3 className="w-4 h-4 text-cyan-400" /> Active Time</div>
            <div className="mt-2 font-mono text-2xl font-black text-white">{formatDuration(activeSeconds)}</div>
          </div>
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400"><MapPin className="w-4 h-4 text-rose-400" /> Location</div>
            <div className="mt-2 text-xs font-bold text-white">{gps.latitude ? `${gps.latitude.toFixed(5)}, ${gps.longitude?.toFixed(5)}` : 'Waiting for GPS…'}</div>
          </div>
        </div>

        <div className={`rounded-2xl border p-3 text-xs ${session ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'}`}>
          <div className="flex items-center gap-2 font-bold"><ShieldCheck className="w-4 h-4" />
            {session ? 'FIELD ACTIVE — GPS tracking is running while this control is open.' : 'FIELD NOT STARTED — Start Field Work before sales activity.'}
          </div>
        </div>

        {message && <div className="rounded-xl bg-blue-500/10 border border-blue-500/30 p-3 text-xs text-blue-200">{message}</div>}

        <div className="grid grid-cols-2 gap-3">
          <button onClick={startFieldWork} disabled={!!session} className="py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2">
            <Play className="w-4 h-4" /> Start Field Work
          </button>
          <button onClick={endFieldWork} disabled={!session} className="py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-xs flex items-center justify-center gap-2">
            <Square className="w-4 h-4" /> End Field Work
          </button>
        </div>

        <p className="text-[10px] text-slate-500 leading-relaxed">
          Customer phone numbers are not collected or stored by this Field Work control. Location tracking is tied to the Field Work session.
        </p>
      </div>
    </div>
  );
};
