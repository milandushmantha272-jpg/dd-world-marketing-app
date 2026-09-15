import React from 'react';
import { FileCheck2, UserPlus, ShieldCheck, ExternalLink, Target, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const POLICY_FORM_URL = ['https://form.jotform.com', '262385368993071'].join('/');

export const NewAgentJoinRequirementsPage: React.FC = () => {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 shadow-2xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-emerald-300"><UserPlus className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">DD WORLD OFFICIAL PORTAL</span></div>
            <h1 className="text-2xl font-black text-white">Page 9 — New Agent Join (Requirements)</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">නව Agent කෙනෙකු සම්බන්ධ කිරීම සඳහා අවශ්‍ය විස්තර හා ලේඛන ඉදිරිපත් කර Team Leader → Owner → Dialog Officer නිල ක්‍රමවේදය හරහා අනුමැතිය ලබාගත යුතුය.</p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-right"><div className="text-[10px] font-black uppercase tracking-wider text-amber-300">Agent Performance Requirement</div><div className="mt-1 text-lg font-black text-white">20 Sales / Day × 20 Days = 400</div></div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-white"><FileCheck2 className="h-4 w-4 text-cyan-400" /> New Agent Requirements</h2>
          <ol className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
            <li><b className="text-white">1.</b> Full Name, NIC/ID number and contact number.</li>
            <li><b className="text-white">2.</b> Full residential address and emergency/home contacts.</li>
            <li><b className="text-white">3.</b> Agent photo and required identity documents.</li>
            <li><b className="text-white">4.</b> G/S Report and Police Report / Police Clearance where required.</li>
            <li><b className="text-white">5.</b> Relevant Team Leader verification before Owner review.</li>
            <li><b className="text-white">6.</b> Owner approval and official employee ID/signature process before access is activated.</li>
            <li><b className="text-white">7.</b> Approved details are then forwarded through the controlled Dialog Officer channel.</li>
          </ol>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
          <h2 className="flex items-center gap-2 text-sm font-black text-white"><Target className="h-4 w-4 text-amber-400" /> Mandatory Agent Work Target</h2>
          <div className="mt-4 rounded-2xl bg-slate-950 p-5"><div className="text-3xl font-black text-amber-300">20 × 20 = 400</div><p className="mt-2 text-xs leading-5 text-slate-300">සෑම Agent කෙනෙකුම අනුමත වැඩ කරන දින 20ක් තුළ, වැඩ කරන සෑම දිනකම Sales 20 බැගින් ලබාගැනීමේ Performance expectation එක සම්පූර්ණ කළ යුතුය. ඒ අනුව target එක Sales 400කි.</p></div>
          <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-400"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><span>Verified / countable sales පමණක් performance calculation සඳහා ගණනය කෙරේ.</span></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-5 text-white">
          <div><div className="flex items-center gap-2 text-cyan-300"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Final Page — Policy Acceptance</span></div><h2 className="mt-1 text-lg font-black">Employee Performance &amp; Integrity Policy Acceptance</h2><p className="mt-1 text-xs text-slate-300">Jotform policy form is included here as the final section of Page 9.</p></div>
          <a href={POLICY_FORM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-400">Open Policy Form <ExternalLink className="h-4 w-4" /></a>
        </div>
        <div className="bg-slate-100 p-2"><iframe title="Employee Performance & Integrity Policy Acceptance Form" src={POLICY_FORM_URL} className="h-[900px] w-full rounded-2xl border border-slate-200 bg-white" loading="lazy" allow="camera; microphone; geolocation" /></div>
      </section>
    </div>
  );
};

export default NewAgentJoinRequirementsPage;
