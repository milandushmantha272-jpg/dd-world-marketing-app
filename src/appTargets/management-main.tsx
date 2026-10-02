import React,{useState}from'react';
import{createRoot}from'react-dom/client';
import'../index.css';
import{Providers,TargetShell}from'./shared';
import{useAuth}from'../context/AuthContext';
import{OwnerDashboard}from'../components/owner/OwnerDashboard';
import{TeamLeaderDashboard}from'../components/leader/TeamLeaderDashboard';
import{MonthlyTargetPlanPage}from'../components/owner/pages/MonthlyTargetPlanPage';
import{AttendancePage}from'../components/common/AttendancePage';
import{IvrAndAppActivationsHub}from'../components/owner/IvrAndAppActivationsHub';
import{SalesSummaryPage}from'../components/common/SalesSummaryPage';
import{MessageRoomPage}from'../components/common/MessageRoomPage';
import{MonthEndPresentationPage}from'../components/common/MonthEndPresentationPage';
import{DataRetentionCenter}from'../components/owner/DataRetentionCenter';
import{AnnualArchivePage}from'../components/common/AnnualArchivePage';
import{OwnerCareerManagementPage}from'../components/owner/OwnerCareerManagementPage';
import{OwnerUserAccessManagementPage}from'../components/owner/OwnerUserAccessManagementPage';
import{AppDownloadStatusMonitor}from'../components/owner/AppDownloadStatusMonitor';
import{OwnerCommissionControl}from'../components/owner/OwnerCommissionControl';
import{Home,Target,CalendarCheck,BarChart3,Users,FileText,ShieldCheck,Smartphone,MessageSquare,Presentation,Database,Settings,LogOut,Wallet}from'lucide-react';

type Tab='dashboard'|'targets'|'attendance'|'sales'|'teams'|'reports'|'employees'|'devices'|'messages'|'presentation'|'payments'|'history'|'settings';
const ownerTabs:{id:Tab;label:string;icon:any}[]=[
{id:'dashboard',label:'Dashboard',icon:Home},{id:'targets',label:'Target Plan',icon:Target},{id:'attendance',label:'Attendance',icon:CalendarCheck},{id:'sales',label:'Sales / Activation',icon:BarChart3},{id:'teams',label:'Teams',icon:Users},{id:'reports',label:'Reports',icon:FileText},{id:'employees',label:'Employee Access',icon:ShieldCheck},{id:'devices',label:'App / Device',icon:Smartphone},{id:'messages',label:'Messages / Meetings',icon:MessageSquare},{id:'presentation',label:'Presentation',icon:Presentation},{id:'payments',label:'Payments',icon:Wallet},{id:'history',label:'History / Archive',icon:Database},{id:'settings',label:'Settings',icon:Settings}];
const leaderTabs:{id:Tab;label:string;icon:any}[]=[
{id:'dashboard',label:'Dashboard',icon:Home},{id:'targets',label:'Target / Performance',icon:Target},{id:'attendance',label:'Attendance',icon:CalendarCheck},{id:'sales',label:'Team Sales',icon:BarChart3},{id:'reports',label:'Reports',icon:FileText},{id:'messages',label:'Messages / Meetings',icon:MessageSquare},{id:'settings',label:'Settings',icon:Settings}];

const SettingsPage=()=>{const{currentUser,logout}=useAuth();return <section className="space-y-4"><div className="rounded-3xl border border-slate-200 bg-white p-5"><div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-500">DD WORLD CONTROL</div><h2 className="mt-1 text-2xl font-black">Settings & Security</h2><p className="mt-2 text-sm text-slate-500">Signed in as {currentUser?.name||currentUser?.email||'User'} • Role: {currentUser?.role}</p></div><div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4"><b>Authorization</b><p className="mt-1 text-xs text-slate-500">Access is controlled by the installed-app target and Supabase role/status checks.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><b>Account session</b><p className="mt-1 text-xs text-slate-500">Use logout to end this authenticated session on this device.</p><button onClick={()=>void logout()} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white"><LogOut className="mr-1 inline h-4 w-4"/>Log out</button></div></div></section>};

export const ManagementAppShell:React.FC=()=>{
 const{currentUser}=useAuth(); const[tab,setTab]=useState<Tab>('dashboard');
 if(!currentUser)return null;
 const isOwner=currentUser.role==='owner'; const tabs=isOwner?ownerTabs:leaderTabs;
 const render=()=>{
  if(tab==='dashboard')return isOwner?<OwnerDashboard hideNavigation/>:<TeamLeaderDashboard/>;
  if(tab==='targets')return isOwner?<MonthlyTargetPlanPage/>:<TeamLeaderDashboard/>;
  if(tab==='attendance')return <AttendancePage/>;
  if(tab==='sales')return isOwner?<IvrAndAppActivationsHub currentUser={currentUser}/>:<SalesSummaryPage/>;
  if(tab==='teams')return isOwner?<OwnerCareerManagementPage/>:<TeamLeaderDashboard/>;
  if(tab==='reports')return <SalesSummaryPage/>;
  if(tab==='employees')return isOwner?<OwnerUserAccessManagementPage/>:<TeamLeaderDashboard/>;
  if(tab==='devices')return isOwner?<AppDownloadStatusMonitor/>:<TeamLeaderDashboard/>;
  if(tab==='messages')return <MessageRoomPage/>;
  if(tab==='presentation')return <MonthEndPresentationPage/>;
  if(tab==='payments')return <OwnerCommissionControl/>;
  if(tab==='history')return isOwner?<><DataRetentionCenter/><AnnualArchivePage role="owner"/></>:<AnnualArchivePage role="dialog_officer"/>;
  return <SettingsPage/>;
 };
 return <div className="min-h-screen bg-[#f5f8fc] text-[#14213d] pb-24">
  <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 shadow-sm"><div className="mx-auto max-w-7xl flex items-center justify-between gap-3"><div><h1 className="text-lg font-black">DD WORLD Management App</h1><p className="text-[11px] text-slate-500">{isOwner?'Owner Control & Corporate Management':`Team-scoped Management • ${currentUser.teamName||'Assigned Team'}`}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase">{currentUser.role.replace(/_/g,' ')}</span></div></header>
  <div className="mx-auto max-w-7xl px-3 pt-3"><div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">{tabs.map(({id,label,icon:Icon})=><button key={id} onClick={()=>setTab(id)} className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-black flex items-center gap-1.5 ${tab===id?'border-slate-900 bg-slate-900 text-white':'border-slate-200 bg-white text-slate-600'}`}><Icon className="h-4 w-4"/>{label}</button>)}</div></div>
  <main className="mx-auto w-full max-w-7xl px-3 py-4">{render()}</main>
 </div>;
};
createRoot(document.getElementById('root')!).render(<Providers><TargetShell target="management"><ManagementAppShell/></TargetShell></Providers>);
