import React, { useMemo, useState } from 'react';
import { BellRing, Send, Users, Loader2 } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';

export const OwnerPushNotificationPanel: React.FC = () => {
  const { currentUser } = useAuth();
  const { users } = useData();
  const agents = useMemo(
    () => users.filter((u) => u.role === 'agent' && String(u.status).toLowerCase() === 'active' && String(u.employmentStatus).toUpperCase() === 'ACTIVE' && String(u.idApprovalStatus).toUpperCase() === 'APPROVED'),
    [users],
  );
  const [recipient, setRecipient] = useState('all');
  const [title, setTitle] = useState('DD WORLD MARKETING');
  const [body, setBody] = useState('');
  const [page, setPage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (!currentUser || currentUser.role !== 'owner') return null;

  const send = async () => {
    if (!body.trim() || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          broadcast: recipient === 'all',
          recipientIds: recipient === 'all' ? [] : [recipient],
          title: title.trim(),
          body: body.trim(),
          page: page.trim() || undefined,
          type: 'owner_push',
        },
      });
      if (error) throw error;
      setResult(data?.error ? String(data.error) : 'Sent: ' + (data?.sent ?? 0) + ' device(s) • ' + (data?.notificationsCreated ?? 0) + ' notification(s)');
      if (!data?.error) setBody('');
    } catch (error) {
      setResult(error instanceof Error ? error.message : 'Notification send failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-3xl border border-emerald-500/25 bg-slate-950/80 p-5 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-500/15 p-3 text-emerald-300"><BellRing className="h-5 w-5" /></div>
        <div>
          <h3 className="text-sm font-black text-white">📲 Agent Push Notification</h3>
          <p className="text-[11px] text-slate-400">Owner only • Supabase record + Firebase FCM delivery</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="text-xs font-bold text-slate-400">
          Recipient
          <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="all">All active Agents ({agents.length})</option>
            {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} — {agent.agentCode || agent.employeeId || 'Agent'}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-400">
          Open page (optional)
          <input value={page} onChange={(e) => setPage(e.target.value)} placeholder="e.g. home, messages" className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
        </label>
      </div>
      <label className="mt-3 block text-xs font-bold text-slate-400">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
      </label>
      <label className="mt-3 block text-xs font-bold text-slate-400">
        Message
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={3} placeholder="Agent ලාට යැවීමට පණිවිඩය..." className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" />
      </label>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-[10px] text-slate-500"><Users className="mr-1 inline h-3 w-3" />Only active, approved Agents can receive broadcast.</div>
        <button type="button" onClick={() => void send()} disabled={busy || !body.trim()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send Push
        </button>
      </div>
      {result && <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-slate-300">{result}</div>}
    </section>
  );
};
