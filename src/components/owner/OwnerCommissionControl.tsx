import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';

const money = (v: number) => `Rs. ${Number(v || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`;

export const OwnerCommissionControl: React.FC = () => {
  const [product, setProduct] = useState('sayuru');
  const [form, setForm] = useState({ agentIvr: 80, agentApp: 100, tlIvr: 0, tlApp: 0, quality: 1 });
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async (p = product) => {
    const { data } = await supabase.from('commission_settings').select('*').eq('product', p).maybeSingle();
    if (data) setForm({ agentIvr: Number(data.agent_ivr_commission ?? 0), agentApp: Number(data.agent_app_commission ?? 0), tlIvr: Number(data.team_leader_ivr_commission ?? 0), tlApp: Number(data.team_leader_app_commission ?? 0), quality: Number(data.quality_multiplier ?? 1) });
  };

  useEffect(() => { load(); }, [product]);

  const save = async () => {
    setBusy(true); setSaved(false);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('commission_settings').upsert({
        product,
        agent_ivr_commission: Math.max(0, form.agentIvr),
        agent_app_commission: Math.max(0, form.agentApp),
        team_leader_ivr_commission: Math.max(0, form.tlIvr),
        team_leader_app_commission: Math.max(0, form.tlApp),
        quality_multiplier: Math.max(0, form.quality),
        active: true,
        updated_by: auth.user?.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'product' });
      if (error) throw error;
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) { alert(e.message || 'Commission settings save failed'); }
    finally { setBusy(false); }
  };

  return <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/5 p-5 space-y-4">
    <div>
      <div className="text-xs tracking-widest text-emerald-300">OWNER CONTROL</div>
      <h2 className="text-lg font-bold">Commission Rules</h2>
      <p className="text-xs text-slate-400 mt-1">Ownerට Agent සහ Team Leader commission rates වෙනස් කිරීමට හැකියාව. Product අනුව වෙන වෙනම.</p>
    </div>
    <div className="flex flex-wrap gap-3">
      <select value={product} onChange={e => setProduct(e.target.value)} className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm"><option value="sayuru">Sayuru</option><option value="govimithuru">Govi Mithuru</option></select>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {[
        ['agentIvr', 'Agent · IVR', form.agentIvr], ['agentApp', 'Agent · APP', form.agentApp],
        ['tlIvr', 'Team Leader · IVR', form.tlIvr], ['tlApp', 'Team Leader · APP', form.tlApp],
      ].map(([key, label, value]) => <label key={String(key)} className="text-xs text-slate-300">{label}
        <input type="number" min="0" step="0.01" value={Number(value)} onChange={e => setForm(f => ({ ...f, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white" />
      </label>)}
    </div>
    <label className="text-xs text-slate-300">Quality multiplier
      <input type="number" min="0" step="0.001" value={form.quality} onChange={e => setForm(f => ({ ...f, quality: Number(e.target.value) }))} className="mt-1 w-full rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-white" />
    </label>
    <div className="rounded-xl bg-slate-900/70 p-3 text-xs text-slate-400">Current preview: Agent IVR {money(form.agentIvr)} · Agent APP {money(form.agentApp)} · TL IVR {money(form.tlIvr)} · TL APP {money(form.tlApp)}</div>
    <button disabled={busy} onClick={save} className="rounded-xl bg-emerald-600 px-5 py-2.5 font-bold disabled:opacity-50">{busy ? 'Saving…' : 'SAVE COMMISSION RULES'}</button>
    {saved && <span className="ml-3 text-xs text-emerald-300">✓ Saved</span>}
    <p className="text-[11px] text-amber-300/80">Dialog final report remains the source of truth; these Owner rules are the controlled commission configuration and should be applied/overridden only through Owner approval.</p>
  </section>;
};

export default OwnerCommissionControl;
