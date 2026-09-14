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
const empty = <T,>(): T[] => [];

const mapRow = (row: any) => ({
  ...row,
  id: row.id,
  firebaseUid: undefined,
  authUserId: row.auth_user_id,
  teamId: row.team_id,
  employmentStatus: row.employment_status,
  idApprovalStatus: row.id_approval_status,
  createdAt: row.created_at,
  joinedDate: row.created_at?.slice?.(0, 10),
});

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [ivrEntries, setIvrEntries] = useState<IvrEntry[]>([]);
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

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!active || !session.session?.user) return;
      setDataError(null);
      try {
        const [u,t,a,s,m,l,sa] = await Promise.all([
          supabase.from('users').select('*'), supabase.from('teams').select('*'), supabase.from('attendance').select('*'),
          supabase.from('sales').select('*'), supabase.from('messages').select('*'), supabase.from('leaves').select('*'), supabase.from('security_alerts').select('*')
        ]);
        const firstError = [u,t,a,s,m,l,sa].find(x => x.error)?.error;
        if (firstError) throw firstError;
        if (!active) return;
        setUsers((u.data || []).map(mapRow));
        setTeams((t.data || []).map((r:any) => ({ ...r, leaderId:r.leader_id, createdAt:r.created_at })));
        setAttendance((a.data || []).map((r:any) => ({ ...r, userId:r.user_id, gpsLocation:r.gps_location, checkInTime:r.check_in_time, checkOutTime:r.check_out_time })));
        setSales((s.data || []).map((r:any) => ({ ...r, agentId:r.agent_id, productName:r.product_name, saleDate:r.sale_date })));
        setMessages((m.data || []).map((r:any) => ({ ...r, senderId:r.sender_id, receiverId:r.receiver_id, timestamp:r.timestamp })));
        setLeaves((l.data || []).map((r:any) => ({ ...r, userId:r.user_id, startDate:r.start_date, endDate:r.end_date })));
        setSecurityAlerts((sa.data || []).map((r:any) => ({ ...r, userId:r.user_id, timestamp:r.timestamp })));
      } catch (error:any) {
        if (active) setDataError(error?.message ? `Supabase data error: ${error.message}` : 'Unable to load Supabase data.');
      }
    };
    void load();
    const channel = supabase.channel('dd-world-core-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaves' }, () => void load())
      .subscribe();
    void retryToken;
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [retryToken]);

  const sendMessage = (msg: { senderId:string; senderName:string; senderRole:UserRole; receiverId:string; receiverName:string; receiverRole:UserRole; content:string }) => {
    void supabase.from('messages').insert({ sender_id: msg.senderId, receiver_id: msg.receiverId, message: msg.content, timestamp: new Date().toISOString(), read: false })
      .then(({ error }) => { if (error) setDataError(`Supabase message write failed: ${error.message}`); });
  };

  const value = {
    users, teams, attendance, sales, ivrEntries, leaves, messages, meetings,
    securityAlerts, coldArchives, knowledge, verifications, monthlyTargets, teamTargets, agentTargets,
    companyWeeklyReports, vaultFiles, marketingPosts, webAiMessages, systemDoctorLogs, smsLogs, activeCall,
    locationLogs, locationConfig, motivationBanners, companyMessages, dialogPerformanceRecords, trainingProgress,
    quizResults, workAreas, employeeIdAuditLogs, dataError, retryData, sendMessage,
    addVaultFile: async () => {}, deleteVaultFile: async () => {}, addMarketingPost: async () => {}, deleteMarketingPost: async () => {},
    sendWebAiMessage: async () => {}, runSystemDoctorAutoHeal: async () => {}, getDailyJobRoleReports: async () => [],
    addAgent: async () => {}, addTeamLeader: async () => {}, updateAgentCode: async () => {}, deleteAgent: async () => {},
    updateLeaveStatus: async () => {}, createMeeting: async () => {}, cancelMeeting: async () => {}, addProductSale: async () => {},
    startCall: async () => {}, updateUserAppStatus: async () => {}, acceptCall: async () => {}, rejectCall: async () => {}, endCall: async () => {},
  } as DataContextType;

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};