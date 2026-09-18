import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronRight, GraduationCap, Play, Presentation, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type Product = 'sayuru' | 'govimithuru';
type Audience = 'team' | 'team_leader' | 'agent' | 'customer';

type Lesson = { title: string; body: string };

const modules: Record<Product, { name: string; ivr: string; app: string; lessons: Record<Audience, Lesson[]> }> = {
  sayuru: {
    name: 'Sayuru', ivr: '#828#', app: 'Sayuru App',
    lessons: {
      team: [
        { title: 'Sayuru සේවාව හඳුනාගනිමු', body: 'Customerට මුහුදු තත්ත්වය, කාලගුණ තොරතුරු සහ ආරක්ෂක දැනුම්දීම් ලබාගැනීමට ඇති සේවාවක් ලෙස සරලව පැහැදිලි කරන්න.' },
        { title: 'IVR #828#', body: 'Customerට #828# හරහා සේවාව ආරම්භ කළ හැකි බව පැහැදිලි කරන්න. IVR ආරම්භ කිරීම පමණක් Activation සාර්ථක වූ බව නොසලකන්න.' },
        { title: 'Sayuru App', body: 'App මඟින් සේවාව භාවිතා කරන ආකාරය Customerට පෙන්වන්න. App එකෙන් ලැබෙන තොරතුරු සහ නිවැරදි Activation ක්‍රියාවලිය පැහැදිලි කරන්න.' },
        { title: 'Registration සහ Activation', body: 'Dialog number එක, OTP Verification සහ අවශ්‍ය තොරතුරු නිවැරදිව ඇතුළත් කර Registration/Activation සම්පූර්ණ කරන ආකාරය පෙන්වන්න.' },
        { title: 'Pending → Verification', body: 'Sales record එක PENDING නම් එය Active/Verified ලෙස හදිසියේ වෙනස් නොකරන්න. අවශ්‍ය සාක්ෂි සහ Customer Activation තහවුරු කිරීමෙන් පසුව පමණක් Verify කරන්න.' },
        { title: 'Customerට කියන ආකාරය', body: '“මේ Sayuru සේවාවෙන් මුහුදු සහ කාලගුණ තොරතුරු ලබාගන්න පුළුවන්. #828# හරහා හෝ Sayuru App එකෙන් භාවිතා කරන්න පුළුවන්.”' },
        { title: 'නිවැරදි වැඩ කිරීම', body: 'Customerගේ තොරතුරු නිවැරදිව ගන්න. GPS/Attendance නීති පිළිපදින්න. False activation, duplicate entry හෝ shortcut භාවිතා නොකරන්න.' }
      ],
      team_leader: [
        { title: 'Team Leader ලෙස Sayuru', body: 'Agentලා Customerට Sayuru නිවැරදිව පැහැදිලි කරනවාද, Registration සහ Verification ක්‍රියාවලිය නිවැරදිද කියා බලන්න.' },
        { title: 'IVR #828# + Sayuru App', body: 'IVR සහ App දෙකම Customerට පැහැදිලි කර දීමට Agentලාට පුහුණුව දෙන්න.' },
        { title: 'Sales Quality', body: 'PENDING sale එකක් evidence නැතිව Verify නොකරන්න. Team එකේ quality errors ඉක්මනින් හඳුනාගෙන Ownerට report කරන්න.' },
        { title: 'Customer Coaching', body: 'Customerට තේරෙන සරල Sinhala භාවිතා කරන්න. අවශ්‍ය නම් App එකෙන් පෙන්වා දෙන්න.' }
      ],
      agent: [
        { title: 'Sayuru කියන්නේ මොකක්ද?', body: 'මුහුදු තත්ත්වය, කාලගුණ තොරතුරු සහ ආරක්ෂක දැනුම්දීම් සඳහා Customerට හඳුන්වාදෙන සේවාව.' },
        { title: 'IVR #828#', body: 'Customerට #828# භාවිතා කර සේවාව ආරම්භ කළ හැකි බව කියන්න.' },
        { title: 'Sayuru App', body: 'Customerට Sayuru App එකෙන් සේවාව භාවිතා කරන ආකාරය පෙන්වන්න.' },
        { title: 'Registration / Activation', body: 'Dialog number → OTP Verification → අවශ්‍ය තොරතුරු → සේවාව සක්‍රීය කිරීම යන පියවර නිවැරදිව කරන්න.' },
        { title: 'PENDING → Verified', body: 'Activation evidence ලැබෙන තුරු PENDING ලෙස තබන්න. False activation නොකරන්න.' },
        { title: 'Customerට සරලව කියන්න', body: '“Sayuru සේවාවෙන් මුහුදු සහ කාලගුණ තොරතුරු ලබාගන්න පුළුවන්. #828# හෝ Sayuru App එක භාවිතා කරන්න.”' }
      ],
      customer: [
        { title: 'Sayuru සේවාව', body: 'මුහුදු තත්ත්වය, කාලගුණ තොරතුරු සහ ආරක්ෂක දැනුම්දීම් ලබාගැනීමට භාවිතා කළ හැකි සේවාවකි.' },
        { title: 'IVR #828#', body: 'ඔබගේ Dialog number එකෙන් #828# භාවිතා කර Sayuru සේවාව ආරම්භ කළ හැක.' },
        { title: 'Sayuru App', body: 'Sayuru App එකෙන්ද සේවාව භාවිතා කළ හැක. App එකේ පෙන්වන පියවර අනුව ඉදිරියට යන්න.' },
        { title: 'ලියාපදිංචිය සහ Activation', body: 'Dialog mobile number එක ලබාදී OTP Verification සම්පූර්ණ කර අවශ්‍ය තොරතුරු ඇතුළත් කර සේවාව සක්‍රීය කරන්න.' },
        { title: 'උදව් අවශ්‍ය නම්', body: 'Registration හෝ Activation ගැටලුවක් ඇත්නම් ඔබට සේවාව හඳුන්වා දුන් Agentගෙන් සහාය ලබාගන්න.' }
      ]
    }
  },
  govimithuru: {
    name: 'Govi Mithuru', ivr: '#616#', app: 'Govi Mithuru App',
    lessons: {
      team: [
        { title: 'Govi Mithuru සේවාව හඳුනාගනිමු', body: 'ගොවීන්ට වගාව, කාලගුණය සහ වගා කටයුතු සඳහා ප්‍රයෝජනවත් තොරතුරු ලබාදෙන සේවාව ලෙස සරලව පැහැදිලි කරන්න.' },
        { title: 'IVR #616#', body: 'Customer/ගොවියාට #616# හරහා සේවාව ආරම්භ කළ හැකි බව පැහැදිලි කරන්න.' },
        { title: 'Govi Mithuru App', body: 'App මඟින් සේවාව භාවිතා කරන ආකාරය පෙන්වන්න සහ අවශ්‍ය Registration/Activation පියවර පැහැදිලි කරන්න.' },
        { title: 'Registration සහ Activation', body: 'Dialog number, OTP Verification සහ අවශ්‍ය තොරතුරු නිවැරදිව ඇතුළත් කර Activation සම්පූර්ණ කරන්න.' },
        { title: 'Verification Quality', body: 'PENDING record එකක් evidence නැතිව Verified නොකරන්න. Customerගේ සැබෑ Activation තහවුරු කර පසුව පමණක් Verify කරන්න.' },
        { title: 'Customerට කියන ආකාරය', body: '“Govi Mithuru සේවාවෙන් ගොවිතැනට අවශ්‍ය තොරතුරු ලබාගන්න පුළුවන්. #616# හරහා හෝ Govi Mithuru App එකෙන් භාවිතා කරන්න.”' }
      ],
      team_leader: [
        { title: 'Team Leader ලෙස Govi Mithuru', body: 'Agentලා ගොවීන්ට සේවාව නිවැරදිව පැහැදිලි කරනවාද සහ Activation quality හොඳද කියා බලන්න.' },
        { title: 'IVR #616# + App', body: '#616# IVR එකත් Govi Mithuru App එකත් දෙකම පෙන්වා දීමට Agentලා පුහුණු කරන්න.' },
        { title: 'Team Quality', body: 'False activation, duplicate entry සහ වැරදි Customer information වළක්වා Team එක guide කරන්න.' },
        { title: 'Customer Support', body: 'ගොවියාට තේරෙන සරල Sinhala භාවිතා කර App/IVR භාවිතය පෙන්වන්න.' }
      ],
      agent: [
        { title: 'Govi Mithuru කියන්නේ මොකක්ද?', body: 'ගොවීන්ට වගා කටයුතු සඳහා ප්‍රයෝජනවත් තොරතුරු ලබාගැනීමට භාවිතා කරන සේවාව.' },
        { title: 'IVR #616#', body: 'ගොවියාට #616# භාවිතා කර Govi Mithuru සේවාව ආරම්භ කළ හැකි බව කියන්න.' },
        { title: 'Govi Mithuru App', body: 'Govi Mithuru App එකෙන් සේවාව භාවිතා කරන ආකාරය පෙන්වන්න.' },
        { title: 'Registration / Activation', body: 'Dialog number → OTP Verification → අවශ්‍ය තොරතුරු → Activation යන පියවර නිවැරදිව කරන්න.' },
        { title: 'PENDING → Verified', body: 'සැබෑ Activation evidence තහවුරු වන තුරු PENDING record එක Verify නොකරන්න.' },
        { title: 'ගොවියාට සරලව කියන්න', body: '“Govi Mithuru සේවාවෙන් ගොවිතැනට අවශ්‍ය තොරතුරු ලබාගන්න පුළුවන්. #616# හෝ Govi Mithuru App එක භාවිතා කරන්න.”' }
      ],
      customer: [
        { title: 'Govi Mithuru සේවාව', body: 'ගොවිතැනට අවශ්‍ය ප්‍රයෝජනවත් තොරතුරු ලබාගැනීමට භාවිතා කළ හැකි සේවාවකි.' },
        { title: 'IVR #616#', body: 'ඔබගේ Dialog number එකෙන් #616# භාවිතා කර Govi Mithuru සේවාව ආරම්භ කළ හැක.' },
        { title: 'Govi Mithuru App', body: 'Govi Mithuru App එකෙන්ද සේවාව භාවිතා කළ හැක. App එකේ පෙන්වන පියවර අනුව ඉදිරියට යන්න.' },
        { title: 'ලියාපදිංචිය සහ Activation', body: 'Dialog mobile number එක ලබාදී OTP Verification සම්පූර්ණ කර අවශ්‍ය තොරතුරු ඇතුළත් කර සේවාව සක්‍රීය කරන්න.' },
        { title: 'උදව් අවශ්‍ය නම්', body: 'ගැටලුවක් ඇත්නම් ඔබට සේවාව හඳුන්වා දුන් Agentගෙන් සහාය ලබාගන්න.' }
      ]
    }
  }
};

const roleTitle: Record<Audience, string> = { team: 'Owner → Team / සියලුම කාර්ය මණ්ඩලය', team_leader: 'Team Leader Training', agent: 'Agent Training', customer: 'Customer Presentation' };

export const TrainingCenter: React.FC = () => {
  const { currentUser } = useAuth();
  const [product, setProduct] = useState<Product>('sayuru');
  const defaultAudience: Audience = currentUser?.role === 'owner' ? 'team' : currentUser?.role === 'team_leader' ? 'team_leader' : 'agent';
  const [audience, setAudience] = useState<Audience>(defaultAudience);
  const [slide, setSlide] = useState(0);
  const [started, setStarted] = useState(false);
  const lessons = modules[product].lessons[audience];
  const currentLesson = lessons[slide];
  const audienceDescription = useMemo(() => {
    if (audience === 'team') return 'Ownerට සියලුම Staff/Team Leaders/Agents සඳහා training presentation ලෙස භාවිතා කළ හැක.';
    if (audience === 'team_leader') return 'Team Leaderට Team control, Attendance, GPS, Sales quality, Verification, Payment සහ Customer coaching පුහුණුව.';
    if (audience === 'agent') return 'Field Agentට Customer සමඟ වැඩ කරන ආකාරය, IVR + App සහ නිවැරදි Activation/Verification ක්‍රියාවලිය.';
    return 'Customerට පමණක් පෙන්වන සරල Sinhala presentation එක. Internal sales, commission සහ employee information මෙහි නැත.';
  }, [audience]);

  if (!currentUser) return null;
  return <section className="space-y-4 sm:space-y-5">
    <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-950 p-4 shadow-xl sm:p-5 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-indigo-300"><GraduationCap className="h-6 w-6" /><span className="text-[10px] font-black uppercase tracking-[.2em]">DD WORLD TRAINING</span></div><h2 className="mt-2 text-2xl font-black text-white">Training & Presentation Center</h2><p className="mt-1 text-sm text-slate-400">Owner, Team Leader, Agent සහ Customer presentations එකම තැනක.</p></div><div className="rounded-2xl border border-indigo-400/20 bg-indigo-400/10 px-4 py-3 text-xs font-black text-indigo-200">Role: {currentUser.role.replace('_', ' ')}</div></div>
    </div>

    <div className="grid gap-3 sm:grid-cols-2"><button onClick={() => { setProduct('sayuru'); setSlide(0); setStarted(false); }} className={`rounded-2xl border p-4 text-left ${product === 'sayuru' ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-slate-800 bg-slate-900'}`}><p className="text-xs font-black text-emerald-400">PRODUCT 01</p><h3 className="mt-1 text-lg font-black text-white">Sayuru</h3><p className="text-xs text-slate-400">IVR #828# + Sayuru App</p></button><button onClick={() => { setProduct('govimithuru'); setSlide(0); setStarted(false); }} className={`rounded-2xl border p-4 text-left ${product === 'govimithuru' ? 'border-amber-400/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900'}`}><p className="text-xs font-black text-amber-400">PRODUCT 02</p><h3 className="mt-1 text-lg font-black text-white">Govi Mithuru</h3><p className="text-xs text-slate-400">IVR #616# + Govi Mithuru App</p></button></div>

    <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-900 p-1.5 sm:flex sm:gap-2 sm:overflow-x-auto sm:p-2">{(['team','team_leader','agent','customer'] as Audience[]).map(item => <button key={item} onClick={() => { setAudience(item); setSlide(0); setStarted(false); }} className={`rounded-xl px-2 py-3 text-center sm:whitespace-nowrap sm:px-4 text-xs font-black ${audience === item ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}><Users className="mr-2 inline h-4 w-4" />{roleTitle[item]}</button>)}</div>

    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-center gap-2 text-sm font-black text-white"><BookOpen className="h-5 w-5 text-indigo-400" />{roleTitle[audience]}</div><p className="mt-2 text-sm leading-6 text-slate-400">{audienceDescription}</p><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">IVR</p><p className="mt-1 text-lg font-black text-white">{modules[product].ivr}</p></div><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">APP</p><p className="mt-1 text-sm font-black text-white">{modules[product].app}</p></div><div className="rounded-2xl bg-slate-950 p-4"><p className="text-[10px] font-black text-slate-500">LESSONS</p><p className="mt-1 text-lg font-black text-white">{lessons.length}</p></div></div></div>

    <div className="overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-indigo-950/50 to-slate-950 p-6 md:p-10"><div className="flex items-center gap-2 text-indigo-300"><Presentation className="h-5 w-5" /><span className="text-xs font-black uppercase tracking-[.18em]">{modules[product].name} • {roleTitle[audience]}</span></div><div className="mt-8 min-h-[280px] md:min-h-[320px]"><p className="text-xs font-bold text-slate-500">SLIDE {slide + 1} / {lessons.length}</p><h3 className="mt-3 text-3xl font-black leading-tight text-white md:text-5xl">{currentLesson?.title}</h3><p className="mt-6 max-w-4xl whitespace-pre-wrap text-base leading-8 text-slate-300 md:text-lg">{currentLesson?.body}</p>{audience === 'customer' && <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100">මෙය Customerට පෙන්වන mode එකයි. Internal sales, commission, employee data හෝ management controls මෙහි නොපෙන්වයි.</div>}</div><div className="flex flex-wrap items-center justify-between gap-3"><button disabled={slide === 0} onClick={() => setSlide(s => Math.max(0, s - 1))} className="rounded-xl bg-slate-800 px-4 py-3 text-xs font-black text-white disabled:opacity-30"><ChevronLeft className="mr-1 inline h-4 w-4" />Previous</button><button onClick={() => setStarted(v => !v)} className="rounded-xl bg-indigo-600 px-5 py-3 text-xs font-black text-white"><Play className="mr-1 inline h-4 w-4" />{started ? 'Presentation Running' : 'Start Presentation'}</button><button disabled={slide === lessons.length - 1} onClick={() => setSlide(s => Math.min(lessons.length - 1, s + 1))} className="rounded-xl bg-slate-800 px-4 py-3 text-xs font-black text-white">Next<ChevronRight className="ml-1 inline h-4 w-4" /></button></div></div>

    <div className="grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">IVR + App</p><p className="mt-1 text-xs text-slate-500">දෙකම presentation එකේ ඇත.</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">Role අනුව Training</p><p className="mt-1 text-xs text-slate-500">Owner → Team Leader → Agent → Customer</p></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><CheckCircle2 className="h-5 w-5 text-emerald-400" /><p className="mt-2 text-sm font-black text-white">Field Sinhala</p><p className="mt-1 text-xs text-slate-500">Field Agentලාට තේරෙන සරල Sinhala.</p></div></div>
  </section>;
};
