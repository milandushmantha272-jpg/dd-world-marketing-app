import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

/**
 * Controlled DD WORLD MARKETING liaison workflow.
 * Agents -> Team Leader -> Owner -> Dialog Officer.
 * Direct Agent/TL -> Dialog Officer communication is intentionally not exposed here.
 */

type Product = 'සයුරු' | 'ගොවි මිතුරු';
type Size = 'S' | 'M' | 'L' | 'XL' | 'XXL';

const OFFICER_DEFAULTS = {
  sayuru: { name: 'Mr. Malika', responsibility: 'සයුරු' },
  govimithuru: { name: 'Pradeepa Rajapaksha', responsibility: 'ගොවි මිතුරු' },
  overall: { name: 'Mr. Mohamed Hadil', responsibility: 'Overall / Decisions' },
};

const STORAGE_KEY = 'ddworld_dialog_liaison_v1';

const readOfficers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : OFFICER_DEFAULTS;
  } catch {
    return OFFICER_DEFAULTS;
  }
};

export const DialogLiaisonHub: React.FC = () => {
  const { currentUser } = useAuth();
  const { users, teams, sendMessage } = useData();
  const [open, setOpen] = useState(false);
  const [product, setProduct] = useState<Product>('සයුරු');
  const [sizeRows, setSizeRows] = useState<Record<string, Size>>({});
  const [promotionRows, setPromotionRows] = useState<Record<string, string>>({});
  const [address, setAddress] = useState(currentUser?.address || '');
  const [notes, setNotes] = useState('');
  const [sent, setSent] = useState(false);
  const [officers, setOfficers] = useState(readOfficers);

  const isOwner = currentUser?.role === 'owner';
  const isLeader = currentUser?.role === 'team_leader';
  const isAgent = currentUser?.role === 'agent';
  const team = teams.find((t) => t.id === currentUser?.teamId);
  const myTeamAgents = useMemo(
    () => users.filter((u) => u.role === 'agent' && u.teamId === currentUser?.teamId),
    [users, currentUser?.teamId]
  );
  const owner = users.find((u) => u.role === 'owner');
  const myLeader = users.find((u) => u.id === currentUser?.teamLeaderId) || users.find((u) => u.id === team?.leaderId);

  const saveOfficers = (next: typeof officers) => {
    setOfficers(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* local persistence is optional */ }
  };

  const submitAgentRequest = () => {
    if (!currentUser || !myLeader) return;
    const lines = [
      `DIALOG SUPPORT REQUEST`,
      `Product: ${product}`,
      `Agent: ${currentUser.name} | Code: ${currentUser.agentCode || '-'}`,
      `Team: ${currentUser.teamName || team?.name || '-'}`,
      `T-Shirt Size: ${sizeRows[currentUser.id] || '-'}`,
      `Promotion Item: ${promotionRows[currentUser.id] || '-'}`,
      `Courier Address: ${address || '-'}`,
      `Notes: ${notes || '-'}`,
    ];
    sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'agent',
      receiverId: myLeader.id,
      receiverName: myLeader.name,
      receiverRole: 'team_leader',
      content: lines.join('\n'),
    });
    setSent(true);
  };

  const submitLeaderRequest = () => {
    if (!currentUser || !owner || !team) return;
    const rows = myTeamAgents.map((agent) => ({
      name: agent.name,
      code: agent.agentCode || '-',
      size: sizeRows[agent.id] || '-',
      promotion: promotionRows[agent.id] || '-',
    }));
    const lines = [
      `MONTHLY ${product.toUpperCase()} T-SHIRT & PROMOTION REQUEST`,
      `Team Leader: ${currentUser.name}`,
      `Team Leader Code: ${currentUser.agentCode || '-'}`,
      `Team Leader Phone: ${currentUser.mobile || currentUser.phone || '-'}`,
      `Team: ${team.name}`,
      `Courier Address: ${address || '-'}`,
      '',
      'AGENT-WISE DETAILS',
      ...rows.map((r) => `${r.name} | Code: ${r.code} | Size: ${r.size} | Promotion: ${r.promotion}`),
      '',
      `Notes: ${notes || '-'}`,
      'Please check and consolidate before forwarding to the relevant Dialog officer.',
    ];
    sendMessage({
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: 'team_leader',
      receiverId: owner.id,
      receiverName: owner.name,
      receiverRole: 'owner',
      content: lines.join('\n'),
    });
    setSent(true);
  };

  if (!currentUser) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-xl border border-slate-700 hover:bg-slate-800"
      >
        Dialog Liaison
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="mx-auto mt-6 max-w-5xl rounded-3xl bg-white text-slate-900 shadow-2xl overflow-hidden">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-400">DD WORLD MARKETING</div>
                <h2 className="text-xl font-black mt-1">Dialog Liaison & Support</h2>
                <p className="text-xs text-slate-300 mt-1">Controlled communication: Agent → TL → Owner → Dialog</p>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 bg-white/10">Close</button>
            </div>

            <div className="p-5 space-y-5">
              {isOwner && (
                <section className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                  <h3 className="font-black text-sm">Dialog Officer Directory</h3>
                  <p className="text-xs text-slate-500 mt-1">Owner can change responsible officer names without changing historical messages.</p>
                  <div className="grid md:grid-cols-3 gap-3 mt-4">
                    {(Object.keys(officers) as Array<keyof typeof officers>).map((key) => (
                      <label key={key} className="text-xs font-bold">
                        {officers[key].responsibility}
                        <input
                          value={officers[key].name}
                          onChange={(e) => saveOfficers({ ...officers, [key]: { ...officers[key], name: e.target.value } })}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-medium"
                        />
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {(isAgent || isLeader) && (
                <section className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {(['සයුරු', 'ගොවි මිතුරු'] as Product[]).map((p) => (
                      <button key={p} onClick={() => setProduct(p)} className={`rounded-xl px-4 py-2 text-xs font-black ${product === p ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}>{p}</button>
                    ))}
                  </div>

                  {isAgent ? (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="text-sm font-black">{currentUser.name} <span className="text-slate-400">({currentUser.agentCode || '-'})</span></div>
                        <select value={sizeRows[currentUser.id] || ''} onChange={(e) => setSizeRows({ ...sizeRows, [currentUser.id]: e.target.value as Size })} className="rounded-xl border p-2 text-sm">
                          <option value="">T-shirt size</option>{(['S','M','L','XL','XXL'] as Size[]).map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <input value={promotionRows[currentUser.id] || ''} onChange={(e) => setPromotionRows({ ...promotionRows, [currentUser.id]: e.target.value })} placeholder="Promotion item / quantity" className="rounded-xl border p-2 text-sm" />
                        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Courier address" className="rounded-xl border p-2 text-sm" />
                      </div>
                      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Other Dialog support required" className="mt-3 w-full rounded-xl border p-3 text-sm" rows={3} />
                      <button onClick={submitAgentRequest} disabled={!myLeader} className="mt-3 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-40">Send to Team Leader</button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        <div className="font-bold">Team Leader: {currentUser.name}</div>
                        <div>Phone: {currentUser.mobile || currentUser.phone || '-'}</div>
                        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Courier address" className="rounded-xl border p-2" />
                        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional support" className="rounded-xl border p-2" />
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead><tr className="border-b"><th className="text-left p-2">Agent</th><th className="text-left p-2">Code</th><th className="text-left p-2">T-shirt</th><th className="text-left p-2">Promotion item / qty</th></tr></thead>
                          <tbody>{myTeamAgents.map((agent) => <tr key={agent.id} className="border-b last:border-0"><td className="p-2 font-bold">{agent.name}</td><td className="p-2">{agent.agentCode || '-'}</td><td className="p-2"><select value={sizeRows[agent.id] || ''} onChange={(e) => setSizeRows({ ...sizeRows, [agent.id]: e.target.value as Size })} className="rounded-lg border p-1"><option value="">-</option>{(['S','M','L','XL','XXL'] as Size[]).map((s) => <option key={s}>{s}</option>)}</select></td><td className="p-2"><input value={promotionRows[agent.id] || ''} onChange={(e) => setPromotionRows({ ...promotionRows, [agent.id]: e.target.value })} className="rounded-lg border p-1 w-full" placeholder="Item / qty" /></td></tr>)}</tbody>
                        </table>
                      </div>
                      <button onClick={submitLeaderRequest} disabled={!owner} className="mt-4 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black disabled:opacity-40">Submit Agent-wise Total to Owner</button>
                    </div>
                  )}
                </section>
              )}

              {isOwner && (
                <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-black text-sm">Owner → Dialog</h3>
                  <p className="text-xs text-slate-600 mt-1">Direct Agent/TL → Dialog access is not provided. Owner checks and sends the consolidated official request to the responsible officer.</p>
                  <div className="grid md:grid-cols-3 gap-3 mt-4 text-xs">
                    <div className="rounded-xl bg-white p-3"><b>සයුරු</b><br />{officers.sayuru.name}</div>
                    <div className="rounded-xl bg-white p-3"><b>ගොවි මිතුරු</b><br />{officers.govimithuru.name}</div>
                    <div className="rounded-xl bg-white p-3"><b>Overall</b><br />{officers.overall.name}</div>
                  </div>
                  <p className="text-xs mt-3 text-slate-600">Courier number received from Dialog should be recorded against the approved request and then shared back to the relevant Team Leader.</p>
                </section>
              )}

              {sent && <div className="rounded-xl bg-emerald-100 text-emerald-800 px-4 py-3 text-xs font-bold">Request submitted successfully through the controlled company chain.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DialogLiaisonHub;
