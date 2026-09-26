import React from 'react';
import { CheckCircle2, ExternalLink, ShieldCheck, Target, FileCheck2, AlertTriangle } from 'lucide-react';

const POLICY_FORM_URL = ['https://form.jotform.com', '262385368993071'].join('/');

const EmployeePerformanceIntegrityPolicyPage: React.FC = () => (
  <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <section className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 shadow-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-300"><ShieldCheck className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">DD WORLD OFFICIAL PORTAL</span></div>
          <h1 className="text-2xl font-black text-white">Page 10 — Employee Performance &amp; Integrity Policy</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">DD WORLD Agent performance, sales reporting, official verification සහ integrity නීති මෙහි කියවන්න. නිල policy form එකටද මෙතැනින් පිවිසිය හැකිය.</p>
        </div>
        <a href={POLICY_FORM_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-black text-slate-950 hover:bg-cyan-400">Open Policy Form <ExternalLink className="h-4 w-4" /></a>
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-amber-500/30 bg-slate-900 p-5">
        <h2 className="flex items-center gap-2 text-sm font-black text-white"><Target className="h-4 w-4 text-amber-400" /> Mandatory Agent Performance</h2>
        <div className="mt-4 rounded-2xl bg-slate-950 p-5"><div className="text-3xl font-black text-amber-300">20 Sales / Day × 20 Days = 400</div><p className="mt-2 text-xs leading-5 text-slate-300">සෑම Agent කෙනෙකුම අනුමත වැඩ කරන දින අනුව දෛනික target සම්පූර්ණ කිරීමට බලාපොරොත්තු වේ.</p></div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Dialog නිල වාර්තාවෙන් තහවුරු කළ sales පමණක් final performance සහ payment ගණනයට යොදාගනී.</p>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-sm font-black text-white">අනිවාර්ය ක්‍රියාමාර්ග</h2>
        <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
          <li>• සියලුම sales සහ activation attempts DD WORLD app එක හරහාම සටහන් කළ යුතුය.</li>
          <li>• App එකේ සටහන් කළ sale එකක් පමණින් verified හෝ payable sale එකක් නොවේ.</li>
          <li>• Agent විසින් submit කළ ගණන සහ Dialog නිල වාර්තාවෙන් තහවුරු කළ ගණන වෙන වෙනම පෙන්විය යුතුය.</li>
          <li>• Dialog සතිපතා/නිල වාර්තාව සමඟ නොගැළපෙන sales “Review Required” ලෙස පරීක්ෂාවට යොමු කළ යුතුය.</li>
          <li>• අසමත්, duplicate, අවලංගු හෝ තහවුරු නොකළ activation එකක් payable sales ලෙස ගණනය නොකළ යුතුය.</li>
          <li>• Sales, attendance, GPS හෝ customer details පිළිබඳ අසත්‍ය/වංචනික තොරතුරු ඇතුළත් කිරීම තහනම්ය.</li>
          <li>• Team Leader තමන්ගේ sales සහ තම team එකේ sales වෙන වෙනම පවත්වාගෙන යා යුතුය.</li>
        </ul>
      </div>
    </section>

    <section className="rounded-2xl border border-cyan-500/30 bg-slate-900 p-5">
      <h2 className="flex items-center gap-2 text-sm font-black text-white"><FileCheck2 className="h-4 w-4 text-cyan-300" /> Sales Verification &amp; Payment Rule</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950 p-4"><p className="text-xs font-black text-sky-300">1 · Submitted</p><p className="mt-2 text-xs leading-5 text-slate-300">Agent app එකෙන් සටහන් කළ sale. මෙය provisional record එකක් පමණි; payment සඳහා තහවුරු කිරීමක් නොවේ.</p></div>
        <div className="rounded-xl border border-amber-500/30 bg-slate-950 p-4"><p className="text-xs font-black text-amber-300">2 · Review Required</p><p className="mt-2 text-xs leading-5 text-slate-300">Dialog report එක සමඟ නොගැළපෙන හෝ පැහැදිලි කිරීමක් අවශ්‍ය sale එකක්. Owner/අදාළ reviewer විසින් පරීක්ෂා කළ යුතුය.</p></div>
        <div className="rounded-xl border border-emerald-500/30 bg-slate-950 p-4"><p className="text-xs font-black text-emerald-300">3 · Officially Confirmed</p><p className="mt-2 text-xs leading-5 text-slate-300">Dialog නිල වාර්තාව සමඟ reconcile කර බලයලත් අයෙකු විසින් තහවුරු කළ sale එක පමණක් final/payable ගණනයට යොදාගත හැකිය.</p></div>
      </div>
      <div className="mt-4 flex gap-3 rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs leading-5 text-rose-100"><AlertTriangle className="h-5 w-5 shrink-0 text-rose-300" /><p><strong>Repeated false reporting:</strong> නැවත නැවත අසත්‍ය sales වාර්තා කිරීමේ සාක්ෂි තිබේ නම්, පළමුව වාර්තා පරීක්ෂා කර Agent හට කරුණු පැහැදිලි කිරීමට අවස්ථාව ලබාදී, Owner විසින් අනුමත කළ පසු පමණක් account suspension/block කිරීම සලකා බලනු ලැබේ. ස්වයංක්‍රීය සැකයක් මත පමණක් account එක block නොකළ යුතුය.</p></div>
      <p className="mt-4 text-xs leading-5 text-slate-400">App එකෙන් පිටත සිදුකරන sales සඳහා payment/commission ලබා නොදේ. අදාළ sales app එක තුළ නිවැරදිව සටහන් කර නිල වාර්තාවෙන් තහවුරු කළ යුතුය.</p>
    </section>

    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="text-sm font-black text-white">Policy කියවීමේ ප්‍රධාන කරුණු</h2>
      <ul className="mt-4 space-y-3 text-xs leading-5 text-slate-300">
        <li>• Sales performance සහ attendance වගකීම් නිවැරදිව පවත්වා ගැනීම.</li>
        <li>• Customer, company සහ Dialog සම්බන්ධ තොරතුරු රහස්‍යභාවයෙන් සහ integrity සමඟ භාවිත කිරීම.</li>
        <li>• GPS, attendance, sales සහ employee records පිළිබඳ අසත්‍ය/වංචනික ක්‍රියා නොකිරීම.</li>
        <li>• Owner / Team Leader නිල ක්‍රමවේදයට අනුකූලව කටයුතු කිරීම.</li>
        <li>• නිල Jotform policy එක කියවා අවශ්‍ය acceptance එක සම්පූර්ණ කිරීම.</li>
      </ul>
    </section>

    <section className="overflow-hidden rounded-3xl border border-cyan-500/30 bg-white shadow-2xl">
      <div className="bg-slate-900 p-5 text-white">
        <div className="flex items-center gap-2 text-cyan-300"><CheckCircle2 className="h-4 w-4" /><span className="text-[10px] font-black uppercase tracking-[0.2em]">Official Policy</span></div>
        <h2 className="mt-1 text-lg font-black">Employee Performance &amp; Integrity Policy</h2>
        <p className="mt-1 text-xs text-slate-300">Policy form එක load නොවුණොත් Open Policy Form භාවිත කරන්න.</p>
      </div>
      <div className="bg-slate-100 p-2"><iframe title="Employee Performance & Integrity Policy" src={POLICY_FORM_URL} className="h-[1000px] w-full rounded-2xl border border-slate-200 bg-white" loading="lazy" /></div>
    </section>
  </div>
);

export default EmployeePerformanceIntegrityPolicyPage;
