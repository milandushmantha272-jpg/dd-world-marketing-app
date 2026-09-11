import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

/**
 * Owner-only Dialog Officer communication surface.
 * Direct Agent/TL -> Dialog Officer communication is never exposed here.
 * Once an Owner-created dialog_officer account exists, messages use the same
 * central messaging pipeline used by the Officer portal, so the existing
 * notification/realtime hooks are triggered for both directions.
 */
export const OwnerDialogOfficerMessenger: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, messages, sendMessage } = useData();
  const [open, setOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState('');
  const [text, setText] = useState('');

  const officers = useMemo(
    () => users.filter((u) => u.role === 'dialog_officer' && u.employmentStatus !== 'BLOCKED' && u.employmentStatus !== 'TERMINATED'),
    [users]
  );
  const officer = officers.find((u) => u.id === selectedOfficerId) || officers[0];
  const owner = currentUser?.role === 'owner' ? currentUser : users.find((u) => u.role === 'owner');

  const conversation = useMemo(() => {
    if (!owner || !officer) return [];
    return messages
      .filter(
        (m) =>
          (m.senderId === owner.id && m.receiverId === officer.id) ||
          (m.senderId === officer.id && m.receiverId === owner.id)
      )
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }, [messages, owner, officer]);

  if (!currentUser || currentUser.role !== 'owner') return null;

  const sendToOfficer = () => {
    const content = text.trim();
    if (!content || !owner || !officer) return;

    (sendMessage as any)({
      senderId: owner.id,
      senderName: owner.name,
      senderRole: 'owner',
      receiverId: officer.id,
      receiverName: officer.name,
      receiverRole: 'dialog_officer',
      content,
    });
    setText('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 left-4 z-40 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-white shadow-xl hover:bg-slate-800"
      >
        Dialog Officer
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 text-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-800 p-5">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">DD WORLD MARKETING</div>
                <h2 className="mt-1 text-xl font-black">Owner ↔ Dialog Officer</h2>
                <p className="mt-1 text-xs text-slate-400">Private liaison channel • Internal app communication only</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">Close</button>
            </header>

            <div className="p-5">
              {officers.length === 0 ? (
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
                  No active Dialog Officer account is configured yet. Create an Owner-managed user with the <b>Dialog Officer</b> role first. No officer identity or credentials are invented by this module.
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs font-black text-slate-400">OFFICER</label>
                    <select
                      value={officer?.id || ''}
                      onChange={(e) => setSelectedOfficerId(e.target.value)}
                      className="min-w-[240px] rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
                    >
                      {officers.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} — {item.designation || item.jobPosition || 'Dialog Liaison'}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-4 max-h-[50vh] min-h-[280px] space-y-3 overflow-y-auto rounded-2xl bg-slate-950/70 p-3">
                    {conversation.length === 0 ? (
                      <div className="flex min-h-[250px] items-center justify-center text-center text-sm text-slate-500">
                        No messages with this officer yet.
                        <br />Owner messages will trigger the central notification/realtime pipeline.
                      </div>
                    ) : (
                      conversation.map((message) => {
                        const mine = message.senderId === owner?.id;
                        return (
                          <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-blue-600' : 'bg-slate-800'}`}>
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
                      rows={3}
                      placeholder="Send a report, request, clarification or official instruction..."
                      className="min-w-0 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={sendToOfficer}
                      disabled={!officer || !text.trim()}
                      className="self-end rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OwnerDialogOfficerMessenger;
