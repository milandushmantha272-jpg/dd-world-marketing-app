import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import { requestNotificationPermission, triggerWebPushNotification } from '../../utils/audioNotification';

type NotificationRow = { id: string; user_id: string; title: string; body: string; type: string; page?: string | null; read: boolean; created_at: string };

export const NotificationCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<string>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
  const unread = useMemo(() => items.filter(i => !i.read).length, [items]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user || !mounted) return;
      const { data: profile } = await supabase.from('users').select('id,status,employment_status,id_approval_status').eq('auth_user_id', auth.user.id).maybeSingle();
      if (!profile || !mounted) return;
      if (profile.status !== 'active' || profile.employment_status !== 'ACTIVE' || profile.id_approval_status !== 'APPROVED') { setProfileId(null); setItems([]); return; }
      setProfileId(profile.id);
      const { data } = await supabase.from('notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(50);
      if (mounted) setItems((data || []) as NotificationRow[]);
    };
    void load();
    return () => { mounted = false; };
  }, [currentUser?.id]);

  useEffect(() => {
    if (!profileId) return;
    const channel = supabase.channel(`dd-world-notifications-${profileId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profileId}` }, payload => {
        const next = payload.new as NotificationRow;
        setItems(prev => [next, ...prev].slice(0, 50));
        triggerWebPushNotification(next.title, next.body, () => { if (next.page) window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: next.page } })); });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [profileId]);

  if (!currentUser || !profileId) return null;

  const enable = async () => {
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  };
  const markRead = async (id: string) => { await supabase.from('notifications').update({ read: true }).eq('id', id); setItems(prev => prev.map(i => i.id === id ? { ...i, read: true } : i)); };
  const markAllRead = async () => { await supabase.from('notifications').update({ read: true }).eq('user_id', profileId).eq('read', false); setItems(prev => prev.map(i => ({ ...i, read: true }))); };
  const openNotification = (item: NotificationRow) => { void markRead(item.id); if (item.page) window.dispatchEvent(new CustomEvent('ddworld:navigate', { detail: { page: item.page } })); setOpen(false); };

  return <div className="fixed right-4 top-20 z-[80]">
    <button type="button" onClick={() => setOpen(v => !v)} className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/30 bg-slate-900/95 text-emerald-300 shadow-2xl backdrop-blur-xl" aria-label="Notifications" title="DD WORLD Notifications">
      <Bell className="h-5 w-5" />{unread > 0 && <span className="absolute -right-1 -top-1 flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unread > 99 ? '99+' : unread}</span>}
    </button>
    {open && <div className="absolute right-0 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 p-4"><div><div className="text-sm font-black text-white">DD WORLD Notifications</div><div className="text-[10px] text-slate-500">Role-controlled • {unread} unread</div></div><div className="flex items-center gap-1">{unread > 0 && <button type="button" onClick={() => void markAllRead()} className="rounded-lg p-2 text-emerald-300 hover:bg-slate-800" title="Mark all read"><CheckCheck className="h-4 w-4" /></button>}<button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button></div></div>
      {permission !== 'granted' && permission !== 'unsupported' && <button type="button" onClick={() => void enable()} className="m-3 w-[calc(100%-1.5rem)] rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Enable device alerts</button>}
      <div className="max-h-[65vh] overflow-y-auto">{items.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">No notifications yet.</div> : items.map(item => <button type="button" key={item.id} onClick={() => openNotification(item)} className={`block w-full border-b border-slate-800 p-4 text-left transition hover:bg-slate-900 ${item.read ? 'bg-slate-950' : 'bg-emerald-500/5'}`}><div className="flex items-start justify-between gap-3"><div className="text-xs font-black text-white">{item.title}</div><span className="shrink-0 text-[9px] text-slate-500">{new Date(item.created_at).toLocaleString()}</span></div><div className="mt-1 text-xs leading-5 text-slate-300">{item.body}</div><div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-500">{item.type}{item.read ? ' • READ' : ' • NEW'}</div></button>)}</div>
    </div>}
  </div>;
};
