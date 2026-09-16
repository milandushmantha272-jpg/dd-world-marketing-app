import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Play, Presentation, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Product = 'sayuru' | 'govimithuru';
type Audience = 'team' | 'team_leader' | 'agent' | 'customer';

const modules: Record<Product, { name: string; ivr: string; app: string; color: string; slides: string[] }> = {
  sayuru: {
    name: 'SAYURU', ivr: '#828# / 828', app: 'Sayuru App', color: 'emerald',
    slides: ['What is Sayuru?', 'Who should use Sayuru?', 'Sayuru benefits', 'IVR activation — #828#', 'Sayuru App activation', 'Customer registration / activation flow', 'How to explain the service to a customer', 'Activation pending → verification', 'Common customer questions', 'Security, privacy and correct customer information', 'Final customer call-to-action']
  },
  govimithuru: {
    name: 'GOVI MITHURU', ivr: '#616# / 616', app: 'Govi Mithuru App', color: 'amber',
    slides: ['What is Govi Mithuru?', 'Who should use Govi Mithuru?', 'Farmer benefits', 'IVR — #616#', 'Govi Mithuru App', 'Language / crop / location based service flow', 'How to explain the service to a farmer', 'Activation / registration confirmation', 'Common farmer questions', 'Security, privacy and correct customer information', 'Final customer call-to-action']
  }
};

const roleTitle: Record<Audience, string> = { team: 'Owner → Team / All Staff', team_leader: 'Team Leader Training', agent: 'Agent Training', customer: 'Customer Presentation' };

export const TrainingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [product, setProduct] = useState<Product>('sayuru');
  const [audience, setAudience] = useState<Audience>(currentUser?.role === 'owner' ? 'team' : currentUser?.role === 'team_leader' ? 'team_leader' : 'agent');
  const [slide, setSlide] = useState(0);
  const [started, setStarted] = useState(false);
  const content = modules[product];
  const audienceDescription = useMemo(() => {
    if (audience === 'team') return 'Owner can use this as an all-team training presentation or send the training notice through Message Room.';
    if (audience === 'team_leader') return 'Team Leaders learn team control, attendance, GPS, sales verification, reports, payments and customer coaching.';
    if (audience === 'agent') return 'Agents learn the complete Sayuru / Govi Mithuru IVR + App workflow and how to present it correctly.';
    return 'Customer-facing mode: simple product explanation, benefits, IVR, App and activation steps without internal management information.';
  }, [audience]);

  if (!currentUser) return null;
  return <section className="space-y-5">
    <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-950 p-5 shadow-xl md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-indigo-300"><GraduationCap className="h-6 w-6" /><span className="text-[10px] font-black uppercase tracking-[.2em]">DD WORLD TRAINING</span></div><h2 className="mt-2 text-2xl font-black text-white">Training & Presentation Center</h2><p className="mt-1 text-sm text-slate-400">One place for Owner, Team Leader, Agent and Customer presentations.</p></div><div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-xs font-black text-indigo-200">Role: {currentUser.role.replace('_', ' ')}</div></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2"><button onClick={() => { setProduct('sayuru'); setSlide(0); setStarted(false); }} className={`rounded-2xl border p-4 text-left ${product === 'sayuru' ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'}`}><p className="text-xs font-black text-emerald-400">PRODUCT 01</p><h3 className="mt-1 text-lg font-black text-white">Sayuru</h3><p className="text-xs text-slate-400">IVR #828# + App</p></button><button onClick={() => { setProduct('govimithuru'); setSlide(0); setStarted(false); }} className={`rounded-2xl border p-4 text-left ${product === 'govimithuru' ? 'border-amber-400/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900'}`}><p className="text-xs font-black text-amber-400">PRODUCT 02</p><h3 className="mt-1 text-lg font-black text-white">Govi Mithuru</h3><p className="text-xs text-slate-400">IVR #616# + App</p></button></div>

    <div className="flex gap-2 overflow-x-auto rounded-2xl bg-slate-900 p-2">{(['team','team_leader','agent','customer'] as Audience[]).map(item => <button key={item} onClick={() => { setAudience(item); setSlide(0); setStarted(false); }} className={`whitespace-nowrap rounded-xl px-4 py-3 text-xs font-black ${audience === item ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Users className="mr-2 inline h-4 w-4" />{roleTitle[item]}</button>)}</div>

    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><BookOpen className="h-5 w-5 text-indigo-400" />{roleTitle[audience]}</div><p className="mt-2 text-sm leading-6 text-slate-400">{audienceDescription}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">IVR</p><p className="mt-1 text-lg font-black text-white">{content.ivr}</p></div><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">APP</p><p className="mt-1 text-sm font-black text-white">{content.app}</p></div><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">LESSONS</p><p className="mt-1 text-lg font-black text-white">{content.slides.length}</p></div></div></div>

    <div className="overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 p-6 md:p-10"><div className="flex items-center gap-2 text-indigo-300"><Presentation className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[.18em]">{content.name} • {roleTitle[audience]}</span></div><div className="mt-8 min-h-[230px] md:min-h-[280px]"><p className="text-xs font-bold text-slate-500">SLIDE {slide + 1} / {content.slides.length}</p><h3 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{content.slides[slide]}</h3>{audience === 'customer' && <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">Customer mode shows only service information. Internal sales targets, commissions, employee data and management controls are not displayed.</div>}</div><div className="flex flex-wrap items-center justify-between gap-3"><button disabled={slide === 0} onClick={() => setSlide(s => Math.max(0, s - 1))} className="rounded-xl bg-slate-800 px-4 py-3 text-xs font-black text-white disabled:opacity-30"><ChevronLeft className="mr-1 inline h-4 w-4" />Previous</button><button onClick={() => setStarted(v => !v)} className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white"><Play className="mr-1 inline h-4 w-4" />{started ? 'Presentation Running' : 'Start Presentation'}</button><button disabled={slide === content.slides.length - 1} onClick={() => setSlide(s => Math.min(content.slides.length - 1, s + 1))} className="rounded-xl bg-slate-800 px-4 py-3 text-xs font-black text-white disabled:opacity-30">Next<ChevronRight className="ml-1 inline h-4 w-4" /></button></div></div>

    <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">Complete product details</p><p className="mt-1 text-xs text-slate-500">IVR + App + activation flow</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">Team-wise training</p><p className="mt-1 text-xs text-slate-500">Owner → Team Leader → Agent</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">Customer presentation</p><p className="mt-1 text-xs text-slate-500">Clean customer-facing mode</p></div></div>
  </section>;
};
