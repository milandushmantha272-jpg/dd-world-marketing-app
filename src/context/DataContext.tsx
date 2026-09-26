import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { User, UserRole, Team, AttendanceRecord, ProductSale, IvrEntry, LeaveRequest, ChatMessage, Meeting, KnowledgeArticle, EmployeeVerification, MonthlyProductTargets, TeamProductTargets, AgentProductTarget, CompanyWeeklyReport, VaultFile, MarketingPost, WebAiChatMessage, SystemDoctorLog, DailyJobRoleReport, CallSession, SmsLogRecord, LocationRecord, LocationTrackingConfig, MotivationBannerMessage, CompanyMessage, DialogPerformanceRecord, TrainingProgressRecord, QuizResultRecord, WorkAreaRecord, EmployeeIdAuditLog, ColdStorageArchive, SecurityAlert } from '../types';

export const isOwnerDoc = (user: any, targetId?: string): boolean => {
  if (!user && !targetId) return false;
  const id = user?.id || targetId;
  const role = user?.role;
  const email = String(user?.email || '').trim().toLowerCase();
  return id === 'owner-1' || targetId === 'owner-1' || role === 'owner' || role === 'MASTER_LEADER' || email === 'milandushmantha272@gmail.com' || email === 'owner@ddworld.local';
};

interface DataContextType {
  users: User[]; teams: Team[]; attendance: AttendanceRecord[]; sales: ProductSale[]; ivrEntries: IvrEntry[]; leaves: LeaveRequest[]; messages: ChatMessage[]; meetings: Meeting[]; securityAlerts: SecurityAlert[]; coldArchives: ColdStorageArchive[]; knowledge: KnowledgeArticle[]; verifications: EmployeeVerification[]; monthlyTargets: MonthlyProductTargets; teamTargets: TeamProductTargets[]; agentTargets: AgentProductTarget[]; companyWeeklyReports: CompanyWeeklyReport[]; vaultFiles: VaultFile[]; marketingPosts: MarketingPost[]; webAiMessages: WebAiChatMessage[]; systemDoctorLogs: SystemDoctorLog[]; smsLogs: SmsLogRecord[]; activeCall: CallSession | null; locationLogs: LocationRecord[]; locationConfig: LocationTrackingConfig; motivationBanners: MotivationBannerMessage[]; companyMessages: CompanyMessage[]; dialogPerformanceRecords: DialogPerformanceRecord[]; trainingProgress: TrainingProgressRecord[]; quizResults: QuizResultRecord[]; workAreas: WorkAreaRecord[]; employeeIdAuditLogs: EmployeeIdAuditLog[];
  dataError: string | null; retryData: () => void;
  sendMessage: (msg: { senderId:string; senderName:string; senderRole:UserRole; receiverId:string; receiverName:string; receiverRole:UserRole; content:string }) => void;
  [key: string]: any;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const EMPTY_TARGETS: MonthlyProductTargets = {};

const mapRow = (row: any, teamMap: Map<string, any>) => {
  const team = row.team_id ? teamMap.get(row.team_id) : undefined;
  return { ...row, id: row.id, firebaseUid: undefined, authUserId: row.auth_user_id, agentCode: row.agent_code, teamId: row.team_id, teamName: team?.name || row.team_name, teamLeaderId: team?.leader_id || row.team_leader_id, employmentStatus: row.employment_status, idApprovalStatus: row.id_approval_status, isLoggedIn: Boolean(row.is_logged_in), isAppDownloaded: Boolean(row.is_app_downloaded), lastLoginAt: row.last_login_at, appVersion: row.app_version, createdAt: row.created_at, joinedDate: row.created_at?.slice?.(0, 10) };
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [ivrEntries] = useState<IvrEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meetings] = useState<Meeting[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [coldArchives] = useState<ColdStorageArchive[]>([]);
  const [knowledge] = useState<KnowledgeArticle[]>([]);
  const [verifications] = useState<EmployeeVerification[]>([]);
  const [monthlyTargets] = useState<MonthlyProductTargets>(EMPTY_TARGETS);
  const [teamTargets] = useState<TeamProductTargets[]>([]);
  const [agentTargets] = useState<AgentProductTarget[]>([]);
  const [companyWeeklyReports] = useState<CompanyWeeklyReport[]>([]);
  const [vaultFiles] = useState<VaultFile[]>([]);
  const [marketingPosts] = useState<MarketingPost[]>([]);
  const [webAiMessages] = useState<WebAiChatMessage[]>([]);
  const [systemDoctorLogs] = useState<SystemDoctorLog[]>([]);
  const [smsLogs] = useState<SmsLogRecord[]>([]);
  const [activeCall] = useState<CallSession | null>(null);
  const [locationLogs] = useState<LocationRecord[]>([]);
  const [locationConfig] = useState<LocationTrackingConfig>({});
  const [motivationBanners] = useState<MotivationBannerMessage[]>([]);
  const [companyMessages] = useState<CompanyMessage[]>([]);
  const [dialogPerformanceRecords] = useState<DialogPerformanceRecord[]>([]);
  const [trainingProgress] = useState<TrainingProgressRecord[]>([]);
  const [quizResults] = useState<QuizResultRecord[]>([]);
  const [workAreas] = useState<WorkAreaRecord[]>([]);
  const [employeeIdAuditLogs] = useState<EmployeeIdAuditLog[]>([]);
  const [dataError, setDataError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);
  const retryData = useCallback(() => { setDataError(null); setRetryToken(v => v + 1); }, []);

  const refreshCore = useCallback(async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user) return;
    const [u,t,a,s,m,l,sa] = await Promise.all([
      supabase.from('users').select('*'), supabase.from('teams').select('*'), supabase.from('attendance').select('*'),
      supabase.from('sales').select('*'), supabase.from('messages').select('*'), supabase.from('leaves').select('*'), supabase.from('security_alerts').select('*')
    ]);
    const firstError = [u,t,a,s,m,l,sa].find(x => x.error)?.error;
    if (firstError) throw firstError;
    const teamRows = t.data || [];
    const teamMap = new Map(teamRows.map((r:any) => [r.id, r]));
    setUsers((u.data || []).map((r:any) => mapRow(r, teamMap)));
    setTeams(teamRows.map((r:any) => ({ ...r, leaderId:r.leader_id, createdAt:r.created_at })));
    setAttendance((a.data || []).map((r:any) => ({ ...r, userId:r.user_id, gpsLocation:r.gps_location, checkInTime:r.check_in_time, checkOutTime:r.check_out_time })));
    setSales((s.data || []).map((r:any) => ({ ...r, agentId:r.agent_id, agentCode:r.agent_code, agentName:r.agent_name, productType:r.product_type, productName:r.product_name, saleDate:r.sale_date, verificationStatus:r.verification_status, activationMethod:r.activation_method, dialCode:r.dial_code, appShareChannel:r.app_share_channel, customerName:r.customer_name, customerMobile:r.customer_mobile, saleTime:r.sale_time, verifiedAt:r.verified_at, verifiedBy:r.verified_by, verificationNote:r.verification_note })));
    setMessages((m.data || []).map((r:any) => ({ ...r, senderId:r.sender_id, receiverId:r.receiver_id, timestamp:r.timestamp })));
    setLeaves((l.data || []).map((r:any) => ({ ...r, userId:r.user_id, startDate:r.start_date, endDate:r.end_date })));
    setSecurityAlerts((sa.data || []).map((r:any) => ({ ...r, userId:r.user_id, timestamp:r.timestamp })));
  }, []);

  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      try {
        setDataError(null);
        await refreshCore();
      } catch (error:any) {
        if (active) {
          setDataError(error?.message ? `Supabase data error: ${error.message}` : 'Unable to load Supabase data.');
        }
      }
    };

    // Do not open realtime/database subscriptions while the app is logged out.
    // The login + TEST MODE screen must remain usable even when Supabase is
    // unavailable or slow. Realtime starts only after an authenticated session.
    const startForSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active || !data.session?.user) return;

        await load();
        if (!active) return;

        channel = supabase.channel('dd-world-core-data')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => void load())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'security_alerts' }, () => void load())
          .subscribe();
      } catch (error:any) {
        // A logged-out user must never be blocked by a data/realtime error.
        if (active && error?.message) console.warn('Deferred Supabase data startup:', error.message);
      }
    };

    void startForSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED')) {
        void startForSession();
      }
      if (event === 'SIGNED_OUT' || !session) {
        setDataError(null);
        setUsers([]);
        setTeams([]);
        setAttendance([]);
        setSales([]);
        setMessages([]);
        setLeaves([]);
        setSecurityAlerts([]);
        if (channel) {
          void supabase.removeChannel(channel);
          channel = null;
        }
      }
    });

    void retryToken;

    return () => {
      active = false;
      authSubscription.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refreshCore, retryToken]);

  const ownerGuard = async () => {
    const { data: session } = await supabase.auth.getSession();
    const email = String(session.session?.user?.email || '').trim().toLowerCase();
    if (email !== 'milandushmantha272@gmail.com') throw new Error('Owner authorization required.');
  };

  const addAgent = async (input:any) => { try { await ownerGuard(); const {error}=await supabase.from('users').insert({id:input.id || `agent-${input.agentCode || Date.now()}`,name:input.name,email:input.email || null,role:'agent',agent_code:input.agentCode || null,phone:input.phone || input.mobile || null,team_id:input.teamId || null,status:input.status || 'active',employment_status:input.employmentStatus || 'ACTIVE',id_approval_status:input.idApprovalStatus || 'APPROVED'}); if(error)throw error; await refreshCore(); return {success:true,message:'Agent added successfully.'}; } catch(error:any){return {success:false,message:error?.message || 'Unable to add agent.'};} };
  const addTeamLeader = async (input:any) => { try { await ownerGuard(); const team=teams.find((t:any)=>t.id===input.teamId || t.name===input.teamName); const {data,error}=await supabase.from('users').insert({id:input.id || `team-leader-${Date.now()}`,name:input.name,email:input.email || null,role:'team_leader',agent_code:input.code || input.agentCode || null,phone:input.phone || input.mobile || null,team_id:team?.id || input.teamId || null,status:'active',employment_status:'ACTIVE',id_approval_status:'APPROVED'}).select().single(); if(error)throw error; if(data&&team?.id){const r=await supabase.from('teams').update({leader_id:data.id});if(r.error)throw r.error;} await refreshCore(); return {success:true,message:'Team Leader added successfully.'}; } catch(error:any){return {success:false,message:error?.message || 'Unable to add Team Leader.'};} };
  const updateAgentCode = async (id:string,code:string) => { try {await ownerGuard();const {error}=await supabase.from('users').update({agent_code:code.trim()}).eq('id',id);if(error)throw error;await refreshCore();return {success:true,message:'Agent Code updated.'};}catch(error:any){return {success:false,message:error?.message || 'Unable to update Agent Code.'};} };
  const updateEmploymentStatus = async (id:string,status:any) => { try {await ownerGuard();const normalized=status==='BLOCKED'?{status:'blocked',employment_status:'INACTIVE',id_approval_status:'REJECTED'}:status==='SUSPENDED'?{status:'suspended',employment_status:'SUSPENDED',id_approval_status:'APPROVED'}:status==='EXITED'?{status:'exited',employment_status:'EXITED',id_approval_status:'REJECTED'}:{status:'active',employment_status:'ACTIVE',id_approval_status:'APPROVED'};const {error}=await supabase.from('users').update(normalized).eq('id',id).neq('role','owner');if(error)throw error;await refreshCore();return {success:true,message:`Status updated to ${status}.`};}catch(error:any){setDataError(error?.message || 'Unable to update employee status.');return {success:false,message:error?.message || 'Unable to update employee status.'};} };
  const deleteUser = (id:string) => { void (async()=>{try{await ownerGuard();const {error}=await supabase.from('users').delete().eq('id',id).neq('role','owner');if(error)throw error;await refreshCore();}catch(error:any){setDataError(error?.message || 'Unable to delete employee.');}})(); return {success:true,message:'Employee deletion requested.'}; };
  const deleteAgent = (id:string) => deleteUser(id);
  const changeUserTeam = async (id:string,teamId:string|null) => {try{await ownerGuard();const {error}=await supabase.from('users').update({team_id:teamId}).eq('id',id).neq('role','owner');if(error)throw error;await refreshCore();const team=teamId?teams.find((t:any)=>t.id===teamId):null;return {success:true,message:team?`Moved to ${team.name}.`:'Team assignment removed.'};}catch(error:any){return {success:false,message:error?.message || 'Unable to change team.'};}};
  const changeUserRole = async (id:string,role:UserRole) => {try{await ownerGuard();if(id==='owner-1'||role==='owner')throw new Error('Owner role is protected.');const {error}=await supabase.from('users').update({role}).eq('id',id);if(error)throw error;await refreshCore();return {success:true,message:`Role changed to ${role}.`};}catch(error:any){return {success:false,message:error?.message || 'Unable to change role.'};}};
  const updateUserGps = async (id:string, patch:any) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const authUserId = session.session?.user?.id || '';
      const authEmail = String(session.session?.user?.email || '').trim().toLowerCase();
      if (!authUserId) throw new Error('Authentication required.');
      if (authEmail !== 'milandushmantha272@gmail.com') {
        const { data: self, error: selfError } = await supabase
          .from('users')
          .select('id,auth_user_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();
        if (selfError) throw selfError;
        if (!self || self.id !== id) throw new Error('Only the Owner or the employee themselves can update GPS.');
      }
      const dbPatch:any = {};
      if (patch?.latitude != null) dbPatch.latitude = Number(patch.latitude);
      if (patch?.longitude != null) dbPatch.longitude = Number(patch.longitude);
      if (patch?.district) dbPatch.district = patch.district;
      if (patch?.accuracy != null) dbPatch.gps_accuracy = Number(patch.accuracy);
      if (Object.keys(dbPatch).length) {
        const { error } = await supabase.from('users').update(dbPatch).eq('id', id);
        if (error) throw error;
        await refreshCore();
      }
    } catch (error:any) {
      console.warn('GPS update:', error?.message || error);
    }
  };

  const updateUserAppStatus = async (id:string,patch:any) => {try{const {data:session}=await supabase.auth.getSession();const authEmail=String(session.session?.user?.email || '').trim().toLowerCase();if(authEmail !== 'milandushmantha272@gmail.com'){const {data:self,error:selfError}=await supabase.from('users').select('id,auth_user_id,role').eq('auth_user_id',session.session?.user?.id || '').maybeSingle();if(selfError)throw selfError;if(!self || self.id !== id)throw new Error('Only the Owner or the employee themselves can update app/login tracking.');}const dbPatch:any={};if('isLoggedIn' in patch)dbPatch.is_logged_in=Boolean(patch.isLoggedIn);if('isAppDownloaded' in patch)dbPatch.is_app_downloaded=Boolean(patch.isAppDownloaded);if('lastLoginAt' in patch)dbPatch.last_login_at=patch.lastLoginAt || null;if('appVersion' in patch)dbPatch.app_version=patch.appVersion || null;if(Object.keys(dbPatch).length){const {error}=await supabase.from('users').update(dbPatch).eq('id',id);if(error)throw error;await refreshCore();}}catch(error:any){console.warn('App/login tracking update:',error?.message || error);}};

  // Record employee attendance in Supabase. Check-in creates today's row;
  // check-out updates that same row rather than creating a duplicate.
  const addAttendanceRecord = async (input:any) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Authentication required.');
      const { data: me, error: meError } = await supabase
        .from('users')
        .select('id, role, team_id, auth_user_id')
        .eq('auth_user_id', auth.user.id)
        .maybeSingle();
      if (meError) throw meError;
      if (!me) throw new Error('Employee profile not found.');
      if (me.id !== input.agentId && me.role !== 'owner') {
        throw new Error('You can only mark your own attendance.');
      }

      const date = input.date || new Date().toLocaleDateString('en-CA');
      const { data: existing, error: lookupError } = await supabase
        .from('attendance')
        .select('id, check_in_time, check_out_time')
        .eq('user_id', input.agentId)
        .eq('date', date)
        .maybeSingle();
      if (lookupError) throw lookupError;

      const patch:any = {};
      if (input.checkInTime) {
        if (existing?.check_in_time) throw new Error('Today\'s check-in is already recorded.');
        Object.assign(patch, {
          user_id: input.agentId,
          agent_id: input.agentId,
          agent_name: input.agentName || me.id,
          agent_code: input.agentCode || null,
          team_id: input.teamId || me.team_id || null,
          team_name: input.teamName || null,
          date,
          status: input.status || 'present',
          check_in_time: input.checkInTime,
        });
      } else if (input.checkOutTime) {
        if (!existing?.id || !existing.check_in_time) throw new Error('Check in before checking out.');
        if (existing.check_out_time) throw new Error('Today\'s check-out is already recorded.');
        patch.check_out_time = input.checkOutTime;
        patch.status = input.status || 'completed';
      } else {
        throw new Error('Attendance action is missing.');
      }

      const result = input.checkInTime
        ? await supabase.from('attendance').insert(patch)
        : await supabase.from('attendance').update(patch).eq('id', existing.id);
      if (result.error) throw result.error;
      await refreshCore();
      return { success: true };
    } catch (error:any) {
      const message = error?.message || 'Unable to save attendance.';
      setDataError(message);
      return { success: false, message };
    }
  };

  const addProductSale = async (input:any) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Authentication required.');
      const { data: me, error: meError } = await supabase.from('users').select('*').eq('auth_user_id', auth.user.id).maybeSingle();
      if (meError) throw meError;
      if (!me) throw new Error('Employee profile not found.');
      const isOwner = me.role === 'owner' || String(auth.user.email || '').toLowerCase() === 'milandushmantha272@gmail.com';
      const isSelf = me.id === input.agentId;
      if (!isOwner && !isSelf) throw new Error('Sales activation is only allowed for your own account.');
      const channel = input.channel || (input.activationMethod === 'APP_LINK_SHARE' ? 'APP' : 'IVR');
      const productType = input.productType || (input.dialCode === '828' ? 'සයුරු' : input.dialCode === '616' ? 'ගොවිමිතුරු' : 'අනෙකුත්');
      const activationMethod = input.activationMethod || 'MANUAL';
      const dialCode = input.dialCode || null;
      if (activationMethod === 'KEYPAD_DIAL' && dialCode !== '828' && dialCode !== '616') throw new Error('Invalid IVR activation code.');
      const id = input.id || crypto.randomUUID();
      const idempotencyKey = input.idempotencyKey || `${id}`;
      const verificationStatus = input.status || 'PENDING';
      const row = {
        id, agent_id: input.agentId, agent_code: input.agentCode || me.agent_code || null, agent_name: input.agentName || me.name,
        team_id: input.teamId || me.team_id || null, product_type: productType, product_name: input.productName || null,
        channel, quantity: Number(input.quantity || 1), msisdn: input.msisdn || null, customer_name: input.customerName || null,
        customer_mobile: input.customerMobile || null, latitude: input.latitude ?? null, longitude: input.longitude ?? null,
        district: input.district || null, location: input.location || null, sale_date: input.saleDate || new Date().toISOString().slice(0,10),
        sale_time: input.time || new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}), status: input.status || verificationStatus,
        verification_status: verificationStatus, amount: Number(input.amount || 0), notes: input.notes || null,
        activation_method: activationMethod, dial_code: dialCode, app_share_channel: input.appShareChannel || null,
        idempotency_key: idempotencyKey
      };
      const { error } = await supabase.from('sales').insert(row);
      if (error) throw error;
      await refreshCore();
      return { success:true, id, status:verificationStatus };
    } catch (error:any) {
      setDataError(error?.message || 'Unable to create sale.');
      return { success:false, message:error?.message || 'Unable to create sale.' };
    }
  };

  const updateProductSaleVerification = async (id:string,status:string,verifiedBy?:string,verificationNote?:string) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error('Authentication required.');
      const { data: me, error: meError } = await supabase.from('users').select('*').eq('auth_user_id', auth.user.id).maybeSingle();
      if (meError) throw meError;
      if (!me) throw new Error('Employee profile not found.');
      const { data: sale, error: saleError } = await supabase.from('sales').select('*').eq('id',id).maybeSingle();
      if (saleError) throw saleError;
      if (!sale) throw new Error('Sale not found.');
      const isOwner = me.role === 'owner' || String(auth.user.email || '').trim().toLowerCase() === 'milandushmantha272@gmail.com';
      const isSelf = me.id === sale.agent_id;
      const requestedStatus = String(status || '').trim().toUpperCase();
      const selfReportStatuses = ['PENDING', 'REVIEW_REQUIRED'];
      const finalStatuses = ['SALE_CONFIRMED', 'COMPLETED', 'REJECTED', 'REVIEW_REQUIRED'];
      if (!isOwner && !(isSelf && selfReportStatuses.includes(requestedStatus))) {
        throw new Error('Only the Owner can finalize or reject a sale. Employees may only submit their own sale for review.');
      }
      if (isOwner && !finalStatuses.includes(requestedStatus)) {
        throw new Error('Invalid final verification status.');
      }
      if (isOwner && ['SALE_CONFIRMED', 'COMPLETED'].includes(requestedStatus) && !String(verificationNote || '').toLowerCase().includes('dialog official report reference:')) {
        throw new Error('A Dialog official report reference is required before confirming a sale.');
      }
      const finalStatus = requestedStatus === 'COMPLETED' ? 'SALE_CONFIRMED' : requestedStatus;
      const patch:any = {
        verification_status: finalStatus,
        status: finalStatus,
        verification_note: verificationNote || null,
      };
      if (isOwner) {
        patch.verified_at = new Date().toISOString();
        patch.verified_by = me.name;
      }
      const { error } = await supabase.from('sales').update(patch).eq('id',id);
      if (error) throw error;
      await refreshCore();
      return true;
    } catch (error:any) { setDataError(error?.message || 'Unable to verify sale.'); return false; }
  };

  const sendMessage = (msg:any) => { void supabase.from('messages').insert({sender_id:msg.senderId,receiver_id:msg.receiverId,message:msg.content,timestamp:new Date().toISOString(),read:false}).then(({error})=>{if(error)setDataError(`Supabase message write failed: ${error.message}`);}); };

  const value:any = {
    users,teams,attendance,sales,ivrEntries,leaves,messages,meetings,securityAlerts,coldArchives,knowledge,verifications,monthlyTargets,teamTargets,agentTargets,companyWeeklyReports,vaultFiles,marketingPosts,webAiMessages,systemDoctorLogs,smsLogs,activeCall,locationLogs,locationConfig,motivationBanners,companyMessages,dialogPerformanceRecords,trainingProgress,quizResults,workAreas,employeeIdAuditLogs,dataError,retryData,sendMessage,
    addAttendanceRecord,\n    addVaultFile:async()=>{},deleteVaultFile:async()=>{},addMarketingPost:async()=>{},deleteMarketingPost:async()=>{},sendWebAiMessage:async()=>{},runSystemDoctorAutoHeal:async()=>{},getDailyJobRoleReports:async()=>[],
    addAgent,addTeamLeader,updateAgentCode,deleteAgent,updateEmploymentStatus,deleteUser,changeUserTeam,changeUserRole,updateUserGps,
    updateLeaveStatus:async()=>{},createMeeting:async()=>{},cancelMeeting:async()=>{},addProductSale,updateProductSaleVerification,startCall:async()=>{},updateUserAppStatus,acceptCall:async()=>{},rejectCall:async()=>{},endCall:async()=>{}
  };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
export const useData = () => { const context=useContext(DataContext); if(!context) throw new Error('useData must be used within DataProvider'); return context; };