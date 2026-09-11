import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { canSendInternalMessage } from '../../utils/messagePermissions';

/**
 * Restricted Dialog Officer portal.
 * Officers can communicate only with the DD WORLD MARKETING Owner.
 * Agents and Team Leaders never receive a direct Dialog Officer route here.
 */
export const DialogOfficerPortal: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, messages, sendMessage } = useData();
  const [text, setText] = useState('');

  const owner = users.find((u) => u.role === 'owner');
  const conversation = useMemo(() => {
    if (!currentUser || !owner) return [];
    return messages
      .filter(
        (m) =>
          (m.senderId === currentUser.id && m.receiverId === owner.id) ||
          (m.senderId === owner.id && m.receiverId === currentUser.id)
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [messages, currentUser, owner]);

  if (!currentUser || currentUser.role !== 'dialog_officer') return null;

  const sendToOwner = () => {
    const content = text.trim();
    if (!content || !owner) return;
    if (!canSendInternalMessage('dialog_officer', 'owner')) return;

    (sendMessage as any)({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'dialog_officer',
      receiverId: owner.id,
      receiverName: owner.name,
      receiverRole: 'owner',
      content,
    });
    setText('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">DD WORLD MARKETING</div>
          <h1 className="mt-1 text-2xl font-black">Dialog Officer Portal</h1>
          <p className="mt-1 text-sm text-slate-400">Restricted liaison channel • Officer ↔ Owner only</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-800 p-3"><div className="text-[10px] text-slate-400">Officer</div><div className="font-bold">{currentUser.name}</div></div>
            <div className="rounded-2xl bg-slate-800 p-3"><div className="text-[10px] text-slate-400">Responsibility</div><div className="font-bold">{currentUser.designation || currentUser.jobPosition || 'Dialog Liaison'}</div></div>
            <div className="rounded-2xl bg-slate-800 p-3"><div className="text-[10px] text-slate-400">DD WORLD Owner</div><div className="font-bold">{owner?.name || 'Owner'}</div></div>
          </div>
        </header>

        <section className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-black">Owner Communication</h2>
              <p className="text-xs text-slate-400">Reports, notices, requests, clarifications and responses stay inside DD WORLD.</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black text-emerald-400">PRIVATE CHANNEL</span>
          </div>

          <div className="min-h-[280px] max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/70 p-3">
            {conversation.length === 0 ? (
              <div className="flex min-h-[250px] items-center justify-center text-center text-sm text-slate-500">No messages yet.<br />Owner ↔ Dialog Officer communication will appear here.</div>
            ) : (
              conversation.map((message) => {
                const mine = message.senderId === currentUser.id;
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-100'}`}>
                      <div className="mb-1 text-[10px] font-black opacity-70">{message.senderName}</div>
                      <div className="whitespace-pre-wrap text-sm">{message.content || message.message}</div>
                      <div className="mt-1 text-[9px] opacity-60">{message.timestamp}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendToOwner(); } }}
              rows={3}
              placeholder="Write a report, notice, request or clarification for the Owner..."
              className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
            />
            <button type="button" onClick={sendToOwner} disabled={!owner || !text.trim()} className="self-end rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Send</button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DialogOfficerPortal;
