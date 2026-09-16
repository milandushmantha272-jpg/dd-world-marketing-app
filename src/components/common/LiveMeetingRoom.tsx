import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, MonitorUp, Users, MessageSquare, Copy, Play, Square } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

type Participant = { userId: string; name: string; role: string; team?: string | null };
type ChatItem = { id: string; userId: string; name: string; text: string; at: string };

type Props = { monthlyPresentation?: boolean };

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export const LiveMeetingRoom: React.FC<Props> = ({ monthlyPresentation = false }) => {
  const { currentUser } = useAuth();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const peers = useRef<Record<string, RTCPeerConnection>>({});
  const streamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const participantsRef = useRef<Record<string, Participant>>({});

  const [me, setMe] = useState<Participant | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [activeRoom, setActiveRoom] = useState<{ id: string; room_code: string; title: string; status: string } | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [chatText, setChatText] = useState('');
  const [micOff, setMicOff] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isOwner = currentUser?.role === 'owner';

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !mounted) return;
      const { data } = await supabase.from('users').select('id,name,role,team_id').eq('auth_user_id', auth.user.id).maybeSingle();
      if (!data || !mounted) return;
      let teamName: string | null = null;
      if (data.team_id) {
        const { data: team } = await supabase.from('teams').select('name').eq('id', data.team_id).maybeSingle();
        teamName = team?.name || null;
      }
      setMe({ userId: data.id, name: data.name, role: data.role, team: teamName });
      const { data: live } = await supabase.from('live_meeting_rooms').select('id,room_code,title,status').eq('status','live').order('created_at',{ ascending:false }).limit(1).maybeSingle();
      if (live && mounted) setActiveRoom(live);
    };
    void loadProfile();
    return () => { mounted = false; };
  }, []);

  useEffect(() => () => cleanupMeeting(), []);

  const attachRemote = (userId: string, stream: MediaStream) => {
    const el = remoteRefs.current[userId];
    if (el && el.srcObject !== stream) {
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    }
  };

  const sendSignal = async (event: string, to: string, payload: any) => {
    const channel = channelRef.current;
    if (!channel || !me) return;
    await channel.send({ type: 'broadcast', event: 'webrtc', payload: { event, from: me.userId, to, payload } });
  };

  const createPeer = (remote: Participant, initiator: boolean) => {
    if (!streamRef.current || peers.current[remote.userId]) return peers.current[remote.userId];
    const pc = new RTCPeerConnection(ICE_SERVERS);
    streamRef.current.getTracks().forEach(track => pc.addTrack(track, streamRef.current!));
    pc.onicecandidate = e => {
      if (e.candidate) void sendSignal('ice', remote.userId, e.candidate.toJSON());
    };
    pc.ontrack = e => {
      const stream = e.streams[0];
      if (stream) attachRemote(remote.userId, stream);
    };
    pc.onconnectionstatechange = () => {
      if (['failed','closed','disconnected'].includes(pc.connectionState)) {
        delete peers.current[remote.userId];
      }
    };
    peers.current[remote.userId] = pc;
    if (initiator) {
      void pc.createOffer().then(offer => pc.setLocalDescription(offer)).then(() => {
        const desc = pc.localDescription;
        if (desc) return sendSignal('offer', remote.userId, desc);
        return undefined;
      }).catch(() => undefined);
    }
    return pc;
  };

  const handleSignal = async ({ payload }: any) => {
    if (!me || !payload || (payload.to && payload.to !== me.userId)) return;
    const remoteId = payload.from as string;
    if (remoteId === me.userId) return;
    const remote = participantsRef.current[remoteId];
    if (!remote) return;
    const pc = createPeer(remote, false);
    if (!pc) return;
    try {
      if (payload.event === 'offer') {
        await pc.setRemoteDescription(payload.payload);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        const desc = pc.localDescription;
        if (desc) await sendSignal('answer', remoteId, desc);
      } else if (payload.event === 'answer') {
        await pc.setRemoteDescription(payload.payload);
      } else if (payload.event === 'ice') {
        await pc.addIceCandidate(payload.payload);
      }
    } catch { /* connection can recover when a new peer joins */ }
  };

  const syncParticipants = (state: Record<string, any[]>) => {
    const list: Participant[] = Object.values(state).flat().map((p: any) => ({ userId: p.userId, name: p.name, role: p.role, team: p.team || null })).filter(p => p.userId);
    participantsRef.current = Object.fromEntries(list.map(p => [p.userId, p]));
    setParticipants(list);
    list.forEach(p => {
      if (p.userId !== me?.userId && me && me.userId < p.userId) createPeer(p, true);
    });
  };

  const startMeeting = async () => {
    if (!me || !isOwner || busy) return;
    setBusy(true); setNotice(null);
    try {
      const code = `DD-${crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()}`;
      const { data, error } = await supabase.from('live_meeting_rooms').insert({
        room_code: code,
        title: monthlyPresentation ? 'DD WORLD Monthly Presentation & Meeting' : 'DD WORLD Live Meeting',
        meeting_type: monthlyPresentation ? 'MONTHLY_PRESENTATION' : 'GENERAL',
        created_by: me.userId,
        status: 'live',
        starts_at: new Date().toISOString(),
      }).select('id,room_code,title,status').single();
      if (error) throw error;
      setActiveRoom(data);
      setRoomCode(data.room_code);
      await joinRoom(data.room_code, data.title);
    } catch (e: any) {
      setNotice(e?.message || 'Meeting could not be started.');
    } finally { setBusy(false); }
  };

  const joinRoom = async (codeInput?: string, title = 'DD WORLD Live Meeting') => {
    if (!me || busy) return;
    const code = (codeInput || roomCode).trim().toUpperCase();
    if (!code) { setNotice('Enter the meeting code.'); return; }
    setBusy(true); setNotice(null);
    try {
      const { data: room, error } = await supabase.from('live_meeting_rooms').select('id,room_code,title,status').eq('room_code', code).maybeSingle();
      if (error) throw error;
      if (!room || room.status !== 'live') throw new Error('This meeting is not live.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (localVideoRef.current) { localVideoRef.current.srcObject = stream; await localVideoRef.current.play().catch(() => undefined); }
      const channel = supabase.channel(`dd-world-live-meeting:${code}`, { config: { presence: { key: me.userId } } });
      channel.on('presence', { event: 'sync' }, () => syncParticipants(channel.presenceState())).on('presence', { event: 'join' }, () => syncParticipants(channel.presenceState())).on('presence', { event: 'leave' }, () => syncParticipants(channel.presenceState())).on('broadcast', { event: 'webrtc' }, handleSignal).on('broadcast', { event: 'chat' }, ({ payload }: any) => {
        if (payload?.userId !== me.userId) setChat(prev => [...prev, payload]);
      });
      const status = await channel.subscribe();
      if (status !== 'SUBSCRIBED') throw new Error('Live meeting connection failed.');
      channelRef.current = channel;
      await channel.track({ userId: me.userId, name: me.name, role: me.role, team: me.team, joinedAt: new Date().toISOString() });
      setActiveRoom(room); setRoomCode(code); setNotice(`${title} • Live`);
      setTimeout(() => setNotice(null), 3000);
    } catch (e: any) {
      streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
      setNotice(e?.message || 'Camera/microphone permission is required.');
    } finally { setBusy(false); }
  };

  const cleanupMeeting = () => {
    Object.values(peers.current).forEach(pc => pc.close()); peers.current = {};
    if (channelRef.current) { void supabase.removeChannel(channelRef.current); channelRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
  };

  const leaveMeeting = async () => { cleanupMeeting(); setParticipants([]); setChat([]); setSharing(false); setActiveRoom(null); };

  const endMeeting = async () => {
    if (!activeRoom || !isOwner) return;
    await supabase.from('live_meeting_rooms').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', activeRoom.id);
    await leaveMeeting();
  };

  const toggleMic = () => { const track = streamRef.current?.getAudioTracks()[0]; if (!track) return; track.enabled = micOff; setMicOff(!micOff); };
  const toggleVideo = () => { const track = streamRef.current?.getVideoTracks()[0]; if (!track) return; track.enabled = videoOff; setVideoOff(!videoOff); };
  const shareScreen = async () => {
    if (!streamRef.current) return;
    if (sharing) { const camera = await navigator.mediaDevices.getUserMedia({ video: true, audio: false }); const next = camera.getVideoTracks()[0]; const old = streamRef.current.getVideoTracks()[0]; Object.values(peers.current).forEach(pc => { const sender = pc.getSenders().find(s => s.track?.kind === 'video'); if (sender) void sender.replaceTrack(next); }); old?.stop(); streamRef.current.removeTrack(old); streamRef.current.addTrack(next); if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current; setSharing(false); return; }
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true }); const next = screen.getVideoTracks()[0]; const old = streamRef.current.getVideoTracks()[0]; Object.values(peers.current).forEach(pc => { const sender = pc.getSenders().find(s => s.track?.kind === 'video'); if (sender) void sender.replaceTrack(next); }); next.onended = () => { setSharing(false); }; old?.stop(); streamRef.current.removeTrack(old); streamRef.current.addTrack(next); if (localVideoRef.current) localVideoRef.current.srcObject = streamRef.current; setSharing(true);
  };

  const sendChat = async () => {
    if (!chatText.trim() || !channelRef.current || !me) return;
    const item = { id: crypto.randomUUID(), userId: me.userId, name: me.name, text: chatText.trim(), at: new Date().toISOString() };
    await channelRef.current.send({ type: 'broadcast', event: 'chat', payload: item }); setChat(prev => [...prev, item]); setChatText('');
  };

  if (!currentUser || !me) return <div className="p-6 text-sm text-slate-400">Loading live meeting…</div>;

  return <div className="space-y-5 rounded-3xl border border-indigo-500/20 bg-slate-950 p-4 md:p-6">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div><div className="flex items-center gap-2"><Video className="h-6 w-6 text-indigo-400" /><h2 className="text-lg font-black text-white">{monthlyPresentation ? 'Monthly Presentation + Live Meeting' : 'Live Meeting Room'}</h2></div><p className="mt-1 text-xs text-slate-400">Real camera + microphone WebRTC session • Owner / Team Leaders / Agents</p></div>
      <div className="flex flex-wrap gap-2">
        {isOwner && !activeRoom && <button onClick={() => void startMeeting()} disabled={busy} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><Play className="mr-1 inline h-4 w-4" />Start Live Meeting</button>}
        {!activeRoom && !isOwner && <><input value={roomCode} onChange={e => setRoomCode(e.target.value)} placeholder="Meeting code" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs text-white" /><button onClick={() => void joinRoom()} disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Join Live</button></>}
        {activeRoom && <button onClick={() => void navigator.clipboard?.writeText(roomCode)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-xs font-bold text-slate-200"><Copy className="mr-1 inline h-4 w-4" />Copy Code</button>}
      </div>
    </div>
    {notice && <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs font-bold text-indigo-200">{notice}</div>}
    {!activeRoom ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center text-xs text-slate-400">{isOwner ? 'Owner can start a protected live room. Share the meeting code through Message Room.' : 'Enter the meeting code provided by Owner and join the live room.'}</div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3"><div className="flex items-center gap-2 text-xs font-black text-white"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />LIVE • {activeRoom.title} • {roomCode}</div><span className="text-xs text-slate-400"><Users className="mr-1 inline h-4 w-4" />{participants.length} online</span></div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-900"><video ref={localVideoRef} muted playsInline className="h-full w-full object-cover" /><span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white">{me.name} • You</span></div>
          {participants.filter(p => p.userId !== me.userId).map(p => <div key={p.userId} className="relative aspect-video overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"><video playsInline autoPlay ref={el => { remoteRefs.current[p.userId] = el; }} className="h-full w-full object-cover" /><div className="absolute inset-0 -z-0 flex items-center justify-center text-xs text-slate-500">Waiting for video…</div><span className="absolute bottom-2 left-2 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-bold text-white">{p.name} • {p.role.replace('_',' ')}</span></div>)}
        </div>
        <div className="flex min-h-[300px] flex-col rounded-2xl border border-slate-800 bg-slate-900"><div className="border-b border-slate-800 p-3 text-xs font-black text-white"><MessageSquare className="mr-1 inline h-4 w-4 text-indigo-400" />Live Chat</div><div className="flex-1 space-y-2 overflow-y-auto p-3">{chat.map(c => <div key={c.id} className="rounded-xl bg-slate-950 p-2.5"><div className="text-[10px] font-bold text-indigo-300">{c.name}</div><div className="text-xs text-slate-300">{c.text}</div></div>)}</div><div className="flex gap-2 border-t border-slate-800 p-2"><input value={chatText} onChange={e => setChatText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void sendChat(); }} placeholder="Message…" className="min-w-0 flex-1 rounded-xl bg-slate-950 px-3 py-2 text-xs text-white" /><button onClick={() => void sendChat()} className="rounded-xl bg-indigo-600 px-3 text-xs font-black text-white">Send</button></div></div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-3"><button onClick={toggleMic} className={`rounded-xl p-3 ${micOff ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200'}`}>{micOff ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}</button><button onClick={toggleVideo} className={`rounded-xl p-3 ${videoOff ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-200'}`}>{videoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}</button><button onClick={() => void shareScreen()} className={`rounded-xl p-3 ${sharing ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}><MonitorUp className="h-5 w-5" /></button><button onClick={() => void leaveMeeting()} className="rounded-xl bg-red-600 p-3 text-white"><PhoneOff className="h-5 w-5" /></button>{isOwner && <button onClick={() => void endMeeting()} className="rounded-xl bg-rose-800 px-4 py-3 text-xs font-black text-white"><Square className="mr-1 inline h-4 w-4" />End Meeting</button>}</div>
    </>}
  </div>;
};
