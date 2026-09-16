import React, { useEffect, useMemo, useState } from 'react';
import { Bell, BookOpen, CheckCheck, MessageCircle, Send, Users, Video } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { MonthEndPresentationPage } from './MonthEndPresentationPage';
import { TrainingCenter } from './TrainingCenter';

type Profile = { id: string; name: string; role: string; team_id?: string | null; auth_user_id?: string | null; status?: string };
type Msg = { id: string; sender_id: string; receiver_id: string; message: string; timestamp: string; read: boolean; title?: string; category?: string };

export const MessageRoomPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<'messages' | 'meetings' | 'training'>('messages');
  const [me, setMe] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [receiver, setReceiver] = useState('');
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const [{ data: profile }, { data: people }] = await Promise.all([
      supabase.from('users').select('*').eq('auth_user_id', auth.user.id).maybeSingle(),
      supabase.from('users').select('*').order('name')
    ]);
    if (!profile) return;
    setMe(profile); setUsers(people || []);
    const { data } = await supabase.from('messages').select('*').order('timestamp', { ascending: false }).limit(200);
    setMessages(data || []);
  };

  useEffect(() => { void load(); const channel = supabase.channel('dd-world-message-room').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load()).subscribe(); return () => { void supabase.removeChannel(channel); }; }, []);

  const contacts = useMemo(() => {
    if (!me) return [];
    if (me.role === 'owner') return users.filter(u => u.id !== me.id && ['active', 'pending'].includes(u.status || 'active'));
    if (me.role === 'team_leader') return users.filter(u => u.id !== me.id && (u.role === 'owner' || u.team_id === me.team_id));
    const teamLeaderIds = users.filter(u => u.role === 'team_leader' && u.team_id === me.team_id).map(u => u.id);
    return users.filter(u => u.id !== me.id && (u.role === 'owner' || teamLeaderIds.includes(u.id)));
  }, [me, users]);
  const visible = messages.filter(m => me && (m.sender_id === me.id || m.receiver_id === me.id));

  const send = async (category: string = 'message') => {
    if (!me || !receiver || !text.trim()) return;
    const { error } = await supabase.from('messages').insert({ id: crypto.randomUUID(), sender_id: me.id, receiver_id: receiver, message: text.trim(), title: title.trim() || null, category, timestamp: new Date().toISOString(), read: false });
    if (error) setStatus(`Send failed: ${error.message}`); else { setStatus('Message sent ✓'); setText(''); setTitle(''); await load(); }
  };
  const markRead = async (id: string) => { await supabase.from('messages').update({ read: true }).eq('id', id); await load(); };

  if (!currentUser) return null;
  return <div className="space-y-5 p-3 md:p-5">
    <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-5 shadow-xl"><div className="flex items-center gap-3"><MessageCircle className="h-7 w-7 text-emerald-400" /><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-400">PAGE 5 · OFFICIAL</p><h1 className="text-xl font-black text-white">DD WORLD Message Room</h1><p className="text-xs text-slate-400">Messages + live meetings + role-based training in one place.</p></div></div></div>
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-900 p-2">
      <button onClick={() => setTab('messages')} className={`rounded-xl p-3 text-xs font-black ${tab === 'messages' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}><MessageCircle className="mr-2 inline h-4 w-4" />Messages</button>
      <button onClick={() => setTab('meetings')} className={`rounded-xl p-3 text-xs font-black ${tab === 'meetings' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}><Video className="mr-2 inline h-4 w-4" />Live Meetings</button>
      <button onClick={() => setTab('training')} className={`rounded-xl p-3 text-xs font-black ${tab === 'training' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}><BookOpen className="mr-2 inline h-4 w-4" />Training</button>
    </div>
    {tab === 'training' ? <TrainingCenter /> : tab === 'meetings' ? <MonthEndPresentationPage embedded /> : <>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4"><div className="flex items-center gap-2 text-sm font-black text-white"><Users className="h-4 w-4 text-emerald-400" />Authorized Contacts</div><select value={receiver} onChange={e => setReceiver(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white"><option value="">Select recipient...</option>{contacts.map(u => <option key={u.id} value={u.id}>{u.name} · {u.role.replace('_',' ')}</option>)}</select><input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Write message..." rows={3} className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-white" /><div className="flex flex-wrap gap-2"><button disabled={!receiver || !text.trim()} onClick={() => void send()} className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40"><Send className="mr-2 inline h-4 w-4" />Send</button><button disabled={!receiver || !text.trim()} onClick={() => void send('meeting')} className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40"><Video className="mr-2 inline h-4 w-4" />Send Meeting Notice</button></div>{status && <p className="text-xs font-bold text-emerald-300">{status}</p>}</div>
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-3"><div className="flex items-center gap-2 text-sm font-black text-white"><Bell className="h-4 w-4 text-amber-400" />Messages ({visible.length})</div>{visible.length === 0 ? <p className="p-8 text-center text-xs text-slate-500">No messages yet.</p> : visible.map(m => <div key={m.id} onClick={() => !m.read && m.receiver_id === me?.id && void markRead(m.id)} className={`rounded-2xl border p-4 ${m.read ? 'border-slate-800 bg-slate-950' : 'border-emerald-500/40 bg-emerald-500/5'}`}><div className="flex items-center justify-between gap-2"><b className="text-sm text-white">{m.title || (m.category === 'meeting' ? 'Meeting Notice' : 'Message')}</b><span className="text-[10px] text-slate-500">{new Date(m.timestamp).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-xs text-slate-300">{m.message}</p><div className="mt-2 text-[10px] text-slate-500">{m.category || 'message'} · {m.receiver_id === me?.id ? (m.read ? 'Read' : 'Unread — tap to read') : 'Sent'} {m.read && <CheckCheck className="ml-1 inline h-3 w-3 text-emerald-400" />}</div></div>)}</div>
    </>}
  </div>;
};
