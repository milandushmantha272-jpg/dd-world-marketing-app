import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  CalendarCheck, TrendingUp, MapPin, Clock, CheckCircle2, PlusCircle, Navigation, RefreshCw, LogOut,
  CalendarDays, Smartphone, Check, AlertCircle, Globe, Trophy, BookOpen, Target, Megaphone, Award,
  IdCard, Map, Radio, Share2, MessageSquare, Fingerprint, ShieldCheck, Phone, PhoneCall,
} from 'lucide-react';
import { IvrKeypadAndAppShareModal } from '../sales/IvrKeypadAndAppShareModal';
import { SriLankaGpsMapView } from '../common/SriLankaGpsMapModal';
import { getAttendanceSummary, getSalesSummary } from '../../utils/summaryUtils';
import { AutoMotivationBanner } from '../common/AutoMotivationBanner';
import { ProductKnowledgeCenter } from '../common/ProductKnowledgeCenter';
import { PerformanceTargetDashboard } from '../common/PerformanceTargetDashboard';
import { CompanyMessageCenter } from '../common/CompanyMessageCenter';
import { InteractiveChatBox } from '../common/InteractiveChatBox';
import { DialogPerformanceManager } from '../common/DialogPerformanceManager';
import { DigitalEmployeeIdCard } from '../common/DigitalEmployeeIdCard';
import { DayStartWorkAreaModal } from '../common/DayStartWorkAreaModal';
import { AgentQuickRepliesView } from '../common/AgentQuickRepliesView';
import { GamifiedLeaderboard } from '../common/GamifiedLeaderboard';
import { VirtualMeetingHub } from '../common/VirtualMeetingHub';
import { InAppWebViewModal } from '../common/InAppWebViewModal';
import { UniversalSmartLinkModal } from '../common/UniversalSmartLinkModal';
import { detectFakeGps } from '../../utils/antiCheatDetector';
import { Zap } from 'lucide-react';

type AgentTab = 'attendance' | 'sales' | 'ivr_keypad' | 'gps' | 'product_knowledge' | 'target_dashboard' | 'company_messages' | 'chat' | 'dialog_performance' | 'digital_id' | 'work_area' | 'quick_replies' | 'leaderboard' | 'meetings';

export const AgentDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { attendance, sales, addAttendanceRecord, addProductSale, updateUserGps, addSecurityAlert } = useData();
  const [showSmartLinkModal, setShowSmartLinkModal] = useState(false);
  const [showWebViewModal, setShowWebViewModal] = useState(false);
  const [showKeypadModal, setShowKeypadModal] = useState(false);
  const [webViewChannel, setWebViewChannel] = useState<'website' | 'facebook' | 'whatsapp' | 'dialog'>('website');
  const [activeTab, setActiveTab] = useState<AgentTab>('attendance');
  const [attStatus, setAttStatus] = useState<'present' | 'half_day'>('present');
  const [attMessage, setAttMessage] = useState<string | null>(null);
  const [productType, setProductType] = useState<'ගොවිමිතුරු' | 'සයුරු' | 'අනෙකුත්'>('ගොවිමිතුරු');
  const [channel, setChannel] = useState<'IVR' | 'APP'>('IVR');
  const [quantity, setQuantity] = useState<string>('1');
  const [saleNotes, setSaleNotes] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [gpsRefreshing, setGpsRefreshing] = useState(false);
  if (!currentUser) return null;
  const myAttendance = attendance.filter((a) => a.agentId === currentUser.id);
  const mySales = sales.filter((s) => s.agentId === currentUser.id);
  const attSummary = getAttendanceSummary(myAttendance);
  const salesSummary = getSalesSummary(mySales);
  const dateTodayStr = new Date().toISOString().split('T')[0];
  const todayAttRecord = myAttendance.find((a) => a.date === dateTodayStr);

  const handleCheckIn = () => {
    if (todayAttRecord?.checkInTime) { setAttMessage('⚠️ අද දින පැමිණීම (Check-In) දැනටමත් සටහන් කර ඇත.'); setTimeout(() => setAttMessage(null), 4000); return; }
    if (!('geolocation' in navigator)) { setAttMessage('⚠️ මෙම device එකේ GPS support නොමැත. Attendance සුරැකුණේ නැත.'); setTimeout(() => setAttMessage(null), 5000); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const fakeCheck = detectFakeGps(pos.coords);
      if (fakeCheck.isFake) {
        addSecurityAlert({ userId: currentUser.id, userName: currentUser.name, agentCode: currentUser.agentCode || '', type: 'GPS_SPOOFING', reason: `Mock Location / Fake GPS Detected during Check-In: ${fakeCheck.reason}`, severity: 'critical', coordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
        setAttMessage('⚠️ Fake GPS හඳුනාගන්නා ලදී. Check-In අවහිර කරන ලදී.'); setTimeout(() => setAttMessage(null), 5000); return;
      }
      updateUserGps(currentUser.id, { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      addAttendanceRecord({ agentId: currentUser.id, agentName: currentUser.name, agentCode: currentUser.agentCode || '', teamId: currentUser.teamId || '', teamName: currentUser.teamName || '', checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: attStatus });
      setAttMessage('✅ GPS verify කර Check-In සාර්ථකව සටහන් කරන ලදී.'); setTimeout(() => setAttMessage(null), 4000);
    }, () => { setAttMessage('⚠️ GPS ලබාගත නොහැක. GPS ON කරලා නැවත උත්සාහ කරන්න. Attendance සුරැකුණේ නැත.'); setTimeout(() => setAttMessage(null), 5000); }, { enableHighAccuracy: true });
  };

  const handleCheckOut = () => {
    if (todayAttRecord?.checkOutTime) { setAttMessage('⚠️ අද දින පිටවීම (Check-Out) දැනටමත් සටහන් කර ඇත.'); setTimeout(() => setAttMessage(null), 4000); return; }
    if (!todayAttRecord?.checkInTime) { setAttMessage('⚠️ මුලින් Check-In සාර්ථකව සටහන් කර තිබිය යුතුය.'); setTimeout(() => setAttMessage(null), 5000); return; }
    if (!('geolocation' in navigator)) { setAttMessage('⚠️ GPS support නොමැත. Check-Out සුරැකුණේ නැත.'); setTimeout(() => setAttMessage(null), 5000); return; }
    navigator.geolocation.getCurrentPosition((pos) => {
      const fakeCheck = detectFakeGps(pos.coords);
      if (fakeCheck.isFake) {
        addSecurityAlert({ userId: currentUser.id, userName: currentUser.name, agentCode: currentUser.agentCode || '', type: 'GPS_SPOOFING', reason: `Mock Location / Fake GPS Detected during Check-Out: ${fakeCheck.reason}`, severity: 'critical', coordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
        setAttMessage('⚠️ Fake GPS හඳුනාගන්නා ලදී. Check-Out අවහිර කරන ලදී.'); setTimeout(() => setAttMessage(null), 5000); return;
      }
      updateUserGps(currentUser.id, { latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      addAttendanceRecord({ agentId: currentUser.id, agentName: currentUser.name, agentCode: currentUser.agentCode || '', teamId: currentUser.teamId || '', teamName: currentUser.teamName || '', checkOutTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), status: 'completed' });
      setAttMessage('✅ GPS verify කර Check-Out සාර්ථකව සටහන් කරන ලදී.'); setTimeout(() => setAttMessage(null), 4000);
    }, () => { setAttMessage('⚠️ GPS verify කළ නොහැක. Check-Out සුරැකුණේ නැත.'); setTimeout(() => setAttMessage(null), 5000); }, { enableHighAccuracy: true });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = productType === 'ගොවිමිතුරු' ? '#616#' : productType === 'සයුරු' ? '#828#' : 'Other';
    const parsedQty = parseInt(quantity, 10);
    const finalQty = !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;
    addProductSale({ agentId: currentUser.id, agentName: currentUser.name, agentCode: currentUser.agentCode || '', teamId: currentUser.teamId || '', productType, channel, quantity: finalQty, productName: `${productType} (${code}) [${channel}]`, customerName: '', customerMobile: '', amount: 0, notes: saleNotes });
    setSaleSuccess(true); setSaleNotes(''); setQuantity('1'); setTimeout(() => setSaleSuccess(false), 3000);
  };

  const handleRefreshGps = () => {
    setGpsRefreshing(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const fakeCheck = detectFakeGps(pos.coords);
        if (fakeCheck.isFake) {
          addSecurityAlert({ userId: currentUser.id, userName: currentUser.name, agentCode: currentUser.agentCode || '', type: 'GPS_SPOOFING', reason: `Mock Location detected during GPS Refresh: ${fakeCheck.reason}`, severity: 'critical', coordinates: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } });
          alert('⚠️ GPS වංචාවක් (Mock Location Spoofing) හඳුනාගන්නා ලදී. ආරක්ෂක අනතුරු ඇඟවීමක් සටහන් විය.'); setGpsRefreshing(false); return;
        }
        updateUserGps(currentUser.id, { latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setGpsRefreshing(false);
      }, () => setGpsRefreshing(false), { enableHighAccuracy: true });
    } else setGpsRefreshing(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20"><div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-emerald-400 text-lg">{currentUser.name.substring(0, 2).toUpperCase()}</div></div><div><div className="flex items-center gap-2"><span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-extrabold uppercase">Official Agent Platform</span><span className="font-mono text-xs text-amber-400 font-bold">{currentUser.agentCode || 'Not Assigned'}</span></div><h1 className="text-xl font-black text-white mt-1">{currentUser.name}</h1><p className="text-xs text-slate-400">{currentUser.teamName || 'Not Assigned'} • {currentUser.mobile || 'No Phone'}</p></div></div><div className="flex items-center gap-2"><button onClick={() => setShowSmartLinkModal(true)} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"><Share2 className="w-3.5 h-3.5 text-emerald-400" /><span className="hidden sm:inline">Smart Link</span></button><button onClick={() => { setWebViewChannel('website'); setShowWebViewModal(true); }} className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-400" /><span className="hidden sm:inline">Corporate Web</span></button><button onClick={logout} className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /><span>Log Out</span></button></div></div>
      </div>
      <AutoMotivationBanner />
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto scrollbar-none">
        {([['attendance','📅 Attendance Mark',CalendarCheck],['sales','📈 Sales Mark',TrendingUp],['ivr_keypad','📞 #828# / #616# Keypad & App',Phone],['leaderboard','🏆 Leaderboard',Trophy],['meetings','🎥 Virtual Meetings',Radio],['target_dashboard','🎯 Targets & Rs.30 Rule',Target],['product_knowledge','🎓 Product Knowledge Center',BookOpen],['company_messages','📢 Messages',Megaphone],['chat','💬 Live Chat',MessageSquare],['dialog_performance','📊 Dialog Records',Award],['digital_id','🪪 Digital Employee ID',IdCard],['quick_replies','⚡ Quick Replies & Scripts',Zap],['work_area','📍 Day Start Work Area',Map],['gps','📍 My GPS Map',MapPin]] as const).map(([tab,label,Icon]) => <button key={tab} onClick={() => setActiveTab(tab)} className={`py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${activeTab === tab ? 'bg-emerald-500 text-slate-950 shadow-lg font-black' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'}`}><Icon className="w-4 h-4" /><span>{label}</span></button>)}
      </div>
      {activeTab === 'attendance' && <div className="space-y-6">{attMessage && <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-xl"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><span>{attMessage}</span></div>}<div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><h2 className="text-base font-black text-white flex items-center gap-2"><CalendarCheck className="w-5 h-5 text-emerald-400" /><span>දිනපතා පැමිණීම සටහන් කිරීම (Daily Attendance Mark)</span></h2><p className="text-xs text-slate-400 mt-0.5">අද දිනය: <strong className="text-emerald-400">{dateTodayStr}</strong></p></div><div className="flex items-center gap-2"><span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold"><Fingerprint className="w-3.5 h-3.5" /><span>Fingerprint: Active</span></span>{todayAttRecord?.checkInTime && <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-extrabold">Check-In Active ({todayAttRecord.checkInTime})</span>}</div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="space-y-1.5"><label className="text-xs font-bold text-slate-300">පැමිණීමේ තත්ත්වය (Status)</label><select value={attStatus} onChange={(e) => setAttStatus(e.target.value as any)} className="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 font-bold"><option value="present">සම්පූර්ණ දිනය (Full Day Present)</option><option value="half_day">අර්ධ දිනය (Half Day Present)</option></select></div><div className="flex items-end"><button type="button" onClick={handleCheckIn} disabled={Boolean(todayAttRecord?.checkInTime)} className="w-full py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs disabled:bg-slate-800 disabled:text-slate-500"><CheckCircle2 className="w-4 h-4 inline mr-2" />{todayAttRecord?.checkInTime ? 'Check-In සටහන් වී ඇත' : 'Check-In Mark කරන්න'}</button></div><div className="flex items-end"><button type="button" onClick={handleCheckOut} disabled={!todayAttRecord?.checkInTime || Boolean(todayAttRecord?.checkOutTime)} className="w-full py-3 px-4 rounded-xl bg-amber-500 text-slate-950 font-black text-xs disabled:bg-slate-800 disabled:text-slate-500"><Clock className="w-4 h-4 inline mr-2" />{todayAttRecord?.checkOutTime ? 'Check-Out සටහන් වී ඇත' : 'Check-Out Mark කරන්න'}</button></div></div></div><div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4"><h3 className="text-base font-black text-white">මාසික & සතිපතා පැමිණීම් සාරාංශය</h3><div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{[['සතිය 1',attSummary.week1Present],['සතිය 2',attSummary.week2Present],['සතිය 3',attSummary.week3Present],['සතිය 4',attSummary.week4Present],['මාසික එකතුව',attSummary.monthlyPresent]].map(([label,value]) => <div key={String(label)} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center"><span className="text-[10px] text-slate-400 font-bold uppercase block">{label}</span><span className="text-xl font-black text-emerald-400 mt-1 block">{value}</span></div>)}</div><div className="pt-4 border-t border-slate-800/80">{myAttendance.length === 0 ? <p className="text-xs text-slate-500 py-4 text-center">තවමත් පැමිණීම් සටහන් වී නැත.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-800 text-slate-400"><th className="pb-2">දිනය</th><th className="pb-2">Check-In</th><th className="pb-2">Check-Out</th><th className="pb-2 text-right">තත්ත්වය</th></tr></thead><tbody className="divide-y divide-slate-800/60">{myAttendance.slice().reverse().map((a,idx)=><tr key={a.id||idx}><td className="py-2.5">{a.date}</td><td className="py-2.5 text-emerald-400">{a.checkInTime||'-'}</td><td className="py-2.5 text-amber-400">{a.checkOutTime||'-'}</td><td className="py-2.5 text-right">{a.status}</td></tr>)}</tbody></table></div>}</div></div></div>}
      {activeTab === 'sales' && <div className="space-y-6">{saleSuccess && <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold"><CheckCircle2 className="w-5 h-5 inline mr-2" />Sale එක සාර්ථකව පද්ධතියට එක් කරන ලදී!</div>}<div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="p-5 rounded-3xl bg-slate-900 border-2 border-amber-500/50"><h3 className="text-base font-black text-white">දුරකථන Keypad IVR සක්‍රියකය</h3><p className="text-xs text-slate-300 mt-1">ගොවිමිතුරු (#616#) සහ සයුරු (#828#) සේවාවන්.</p><button type="button" onClick={() => setShowKeypadModal(true)} className="w-full mt-4 py-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs"><Phone className="w-4 h-4 inline mr-2" />#828# හා #616# Keypad එක විවෘත කරන්න</button></div><div className="p-5 rounded-3xl bg-slate-900 border-2 border-emerald-500/50"><h3 className="text-base font-black text-white">පාරිභෝගික App සක්‍රියක Link</h3><p className="text-xs text-slate-300 mt-1">WhatsApp, SMS හෝ QR Code මගින් Share කරන්න.</p><button type="button" onClick={() => setShowKeypadModal(true)} className="w-full mt-4 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs"><Share2 className="w-4 h-4 inline mr-2" />Play Store Link Share & QR Scanner</button></div></div><div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-5"><h2 className="text-base font-black text-white">දිනපතා අලෙවිය සටහන් කිරීම</h2><form onSubmit={handleProductSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4"><select value={productType} onChange={(e)=>setProductType(e.target.value as any)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-100 font-bold"><option value="ගොවිමිතුරු">ගොවිමිතුරු (#616#)</option><option value="සයුරු">සයුරු (#828#)</option><option value="අනෙකුත්">අනෙකුත්</option></select><select value={channel} onChange={(e)=>setChannel(e.target.value as any)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-100 font-bold"><option value="IVR">IVR Dial</option><option value="APP">App Signup</option></select><input type="number" min="1" value={quantity} onChange={(e)=>setQuantity(e.target.value)} className="px-4 py-2.5 rounded-xl bg-slate-800 text-xs text-slate-100 font-bold" /><button type="submit" className="py-2.5 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs"><PlusCircle className="w-4 h-4 inline mr-2" />Sale Mark කරන්න</button><input type="text" value={saleNotes} onChange={(e)=>setSaleNotes(e.target.value)} placeholder="Optional notes" className="md:col-span-4 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-100" /></form></div><div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl"><h3 className="text-base font-black text-white">මාසික & සතිපතා අලෙවි සාරාංශය</h3><div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">{[['සතිය 1',salesSummary.week1Quantity],['සතිය 2',salesSummary.week2Quantity],['සතිය 3',salesSummary.week3Quantity],['සතිය 4',salesSummary.week4Quantity],['මාසික එකතුව',salesSummary.monthlyQuantity]].map(([label,value])=><div key={String(label)} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center"><span className="text-[10px] text-slate-400 block">{label}</span><span className="text-xl font-black text-emerald-400">{value}</span></div>)}</div><div className="pt-4 mt-4 border-t border-slate-800">{mySales.length===0?<p className="text-xs text-slate-500 text-center py-4">තවමත් අලෙවි සටහන් වී නැත.</p>:<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-slate-800 text-slate-400"><th className="pb-2">දිනය</th><th className="pb-2">නිෂ්පාදනය</th><th className="pb-2">මාර්ගය</th><th className="pb-2">ප්‍රමාණය</th></tr></thead><tbody>{mySales.slice().reverse().map((s,idx)=><tr key={s.id||idx}><td className="py-2.5">{s.date||s.timestamp?.split('T')[0]}</td><td className="py-2.5 font-bold">{s.productType}</td><td className="py-2.5 text-emerald-400">{s.channel}</td><td className="py-2.5 text-amber-400">{s.quantity}</td></tr>)}</tbody></table></div>}</div></div></div>}
      {activeTab === 'gps' && <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4"><div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><h2 className="text-base font-black text-white flex items-center gap-2"><MapPin className="w-5 h-5 text-emerald-400" />මගේ සජීවී පිහිටීම (My Live GPS Location)</h2><p className="text-xs text-slate-400">පද්ධතිය මගින් GPS ස්ථානය සටහන් කරගනී.</p></div><button onClick={handleRefreshGps} disabled={gpsRefreshing} className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"><RefreshCw className={`w-3.5 h-3.5 inline mr-1 ${gpsRefreshing?'animate-spin':''}`} />{gpsRefreshing?'Updating...':'Refresh Location'}</button></div><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs"><div><span className="text-[10px] text-slate-400 block">මාණ්ඩලිකයා</span><span className="font-bold text-white">{currentUser.name} ({currentUser.agentCode || 'Not Assigned'})</span></div><div><span className="text-[10px] text-slate-400 block">Latitude / Longitude</span><span className="font-mono text-emerald-400 font-bold">{currentUser.latitude != null && currentUser.longitude != null ? `${currentUser.latitude.toFixed(4)}, ${currentUser.longitude.toFixed(4)}` : 'Location unavailable'}</span></div><div><span className="text-[10px] text-slate-400 block">දිස්ත්‍රික්කය</span><span className="font-bold text-amber-400">{currentUser.district || 'Not Assigned'}</span></div></div><div className="rounded-2xl overflow-hidden border border-slate-800"><SriLankaGpsMapView users={[currentUser]} currentUser={currentUser} height="400px" /></div></div>}
      {activeTab === 'product_knowledge' && <ProductKnowledgeCenter />}
      {activeTab === 'target_dashboard' && <PerformanceTargetDashboard />}
      {activeTab === 'company_messages' && <CompanyMessageCenter />}
      {activeTab === 'chat' && <div className="mt-6 space-y-4"><InteractiveChatBox teamId={currentUser?.teamId} /></div>}
      {activeTab === 'dialog_performance' && <DialogPerformanceManager />}
      {activeTab === 'digital_id' && <DigitalEmployeeIdCard />}
      {activeTab === 'quick_replies' && <AgentQuickRepliesView />}
      {activeTab === 'work_area' && <DayStartWorkAreaModal onClose={() => setActiveTab('attendance')} />}
      {activeTab === 'leaderboard' && <GamifiedLeaderboard />}
      {activeTab === 'meetings' && <VirtualMeetingHub />}
      {activeTab === 'ivr_keypad' && <IvrKeypadAndAppShareModal currentUser={currentUser} isOpen={true} onClose={() => setActiveTab('sales')} />}
      <IvrKeypadAndAppShareModal currentUser={currentUser} isOpen={showKeypadModal} onClose={() => setShowKeypadModal(false)} />
      <UniversalSmartLinkModal isOpen={showSmartLinkModal} onClose={() => setShowSmartLinkModal(false)} />
      <InAppWebViewModal isOpen={showWebViewModal} onClose={() => setShowWebViewModal(false)} defaultChannel={webViewChannel} />
    </div>
  );
};