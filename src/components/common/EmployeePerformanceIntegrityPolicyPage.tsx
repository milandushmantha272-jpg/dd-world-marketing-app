import React from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck, Target } from 'lucide-react';

const POLICY_FORM_URL = ['https://form.jotform.com', '262385368993071'].join('/');

const EmployeePerformanceIntegrityPolicyPage: React.FC = () => (
  <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-300"><ShieldCheck className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">DD WORLD OFFICIAL PORTAL</span></div>
          <h1 className="text-2xl font-black text-white">Page 10 — Employee Performance &amp; Integrity Policy</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">මෙම පිටුවේ DD WORLD Agent performance requirement සහ Employee Performance &amp; Integrity Policy එක කියවීමට හා නිල policy form එකට පිවිසීමට හැකිය.</p>
        </div>
        <a href={POLICY_FORM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-slate-950 hover:bg-cyan-400">Open Policy Form <ExternalLink className="h-4 w-4" /></a>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-black text-white"><Target className="h-4 w-4 text-amber-400" /> Mandatory Agent Performance</h2>
        <div className="mt-4 rounded-2xl bg-slate-950 p-5"><div className="text-3xl font-black text-amber-300">20 Sales / Day × 20 Days = 400</div><p className="mt-2 text-xs leading-5 text-slate-300">සෑම Agent කෙනෙකුම වැඩ කරන සෑම දිනකම Sales 20 බැගින් ලබාගෙන, අනුමත වැඩ කරන දින 20ක් තුළ Sales 400 target එක සම්පූර්ණ කිරීමට බලාපොරොත්තු වේ.</p></div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Verified / countable sales පමණක් performance calculation සඳහා ගණනය කළ යුතුය.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-black text-white">Policy කියවීමේ ප්‍රධාන කරුණු</h2>
        <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
          <li>• Sales performance සහ attendance වගකීම් නිවැරදිව පවත්වා ගැනීම.</li>
          <li>• Customer, company සහ Dialog සම්බන්ධ තොරතුරු integrity සමඟ භාවිත කිරීම.</li>
          <li>• GPS, attendance, sales සහ employee records පිළිබඳ අසත්‍ය/වංචනික ක්‍රියා නොකිරීම.</li>
          <li>• Owner / Team Leader නිල ක්‍රමවේදයට අනුකූලව කටයුතු කිරීම.</li>
          <li>• නිල Jotform policy එක කියවා අවශ්‍ය acceptance එක සම්පූර්ණ කිරීම.</li>
        </ul>
      </div>
    </section>

    <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-white shadow-2xl">
      <div className="bg-slate-900 p-5 text-white">
        <div className="flex items-center gap-2 text-cyan-300"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Official Policy</span></div>
        <h2 className="mt-1 text-lg font-black">Employee Performance &amp; Integrity Policy</h2>
        <p className="mt-1 text-xs text-slate-300">Policy එක මෙහිම කියවිය හැකි අතර, form එක load නොවුණොත් Open Policy Form භාවිත කරන්න.</p>
      </div>
      <div className="bg-slate-100 p-2"><iframe title="Employee Performance & Integrity Policy" src={POLICY_FORM_URL} className="h-[1000px] w-full rounded-2xl border border-slate-200 bg-white" loading="lazy" /></div>
    </section>
  </div>
);

export default EmployeePerformanceIntegrityPolicyPage;
