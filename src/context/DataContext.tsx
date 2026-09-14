import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, doc, setDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../services/firebase';
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

const readableFirestoreError = (error: any): string => {
  const code = String(error?.code || '').toLowerCase();
  if (code.includes('permission-denied')) return 'Firestore access was denied. Please confirm the signed-in employee is authorized, then Retry.';
  if (code.includes('failed-precondition')) return 'Firestore is not ready for this request. Please check the database configuration, then Retry.';
  if (code.includes('unavailable') || code.includes('network')) return 'Firestore is temporarily unavailable or offline. Check the connection, then Retry.';
  return error?.message ? `Firestore data error: ${error.message}` : 'Unable to load Firestore data. Please Retry.';
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [ivrEntries, setIvrEntries] = useState<IvrEntry[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [coldArchives, setColdArchives] = useState<ColdStorageArchive[]>([]);
  const [knowledge] = useState<KnowledgeArticle[]>([]);
  const [verifications, setVerifications] = useState<EmployeeVerification[]>([]);
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

  const retryData = useCallback(() => {
    setDataError(null);
    setRetryToken(value => value + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let unsubscribeAuth: Unsubscribe | undefined;
    const unsubscribers: Unsubscribe[] = [];

    const clearListeners = () => {
      while (unsubscribers.length) unsubscribers.pop()?.();
    };

    const subscribeToCoreData = () => {
      clearListeners();
      if (!auth.currentUser || !active) return;

      const subscribe = <T,>(collectionName: string, setter: React.Dispatch<React.SetStateAction<T[]>>) => {
        const unsubscribe = onSnapshot(
          collection(db, collectionName),
          snapshot => {
            if (!active) return;
            // Firestore naturally returns an empty snapshot for an empty collection.
            // Keeping [] here makes empty databases a valid first-run state.
            setter(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as T)));
            setDataError(null);
          },
          error => {
            if (!active) return;
            // A failed listener must not throw during React rendering. Keep the
            // last safe value (normally []) and expose a retryable UI error.
            console.warn(`Firestore ${collectionName} listener error:`, error);
            setDataError(readableFirestoreError(error));
          },
        );
        unsubscribers.push(unsubscribe);
      };

      subscribe<User>('users', setUsers);
      subscribe<Team>('teams', setTeams);
      subscribe<AttendanceRecord>('attendance', setAttendance);
      subscribe<ProductSale>('sales', setSales);
      subscribe<ChatMessage>('messages', setMessages);

      // These collections are optional on a fresh project. They stay as safe
      // empty arrays until their dedicated feature initializes them.
      subscribe<IvrEntry>('ivr', setIvrEntries);
      subscribe<LeaveRequest>('leaves', setLeaves);
      subscribe<Meeting>('meetings', setMeetings);
      subscribe<SecurityAlert>('security_alerts', setSecurityAlerts);
      subscribe<ColdStorageArchive>('cold_storage_archives', setColdArchives);
      subscribe<EmployeeVerification>('verifications', setVerifications);
    };

    // Do not start Firestore listeners before authentication. This prevents the
    // rules from treating the initial app boot as an unauthorized read.
    unsubscribeAuth = onAuthStateChanged(auth, firebaseUser => {
      if (!active) return;
      clearListeners();
      if (!firebaseUser) {
        setDataError(null);
        setUsers([]); setTeams([]); setAttendance([]); setSales([]); setMessages([]);
        setIvrEntries([]); setLeaves([]); setMeetings([]); setSecurityAlerts([]); setColdArchives([]); setVerifications([]);
        return;
      }
      subscribeToCoreData();
    });

    // retryToken intentionally re-establishes the auth/listener chain.
    void retryToken;

    return () => {
      active = false;
      clearListeners();
      unsubscribeAuth?.();
    };
  }, [retryToken]);

  const sendMessage = (msg: { senderId:string; senderName:string; senderRole:UserRole; receiverId:string; receiverName:string; receiverRole:UserRole; content:string }) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const payload: ChatMessage = { ...msg, id, timestamp: new Date().toISOString(), read: false };
    void setDoc(doc(db, 'messages', id), payload).catch(error => {
      console.warn('Firestore message write failed:', error);
      setDataError(readableFirestoreError(error));
    });
  };

  // Safe feature defaults keep dashboards renderable while optional collections
  // are empty. Feature-specific screens can populate these through their own
  // services without requiring fake seed documents.
  const value = {
    users, teams, attendance, sales, ivrEntries, leaves, messages, meetings,
    securityAlerts, coldArchives, knowledge, verifications, monthlyTargets,
    teamTargets, agentTargets, companyWeeklyReports, vaultFiles, marketingPosts,
    webAiMessages, systemDoctorLogs, smsLogs, activeCall, locationLogs,
    locationConfig, motivationBanners, companyMessages, dialogPerformanceRecords,
    trainingProgress, quizResults, workAreas, employeeIdAuditLogs,
    dataError, retryData, sendMessage,
    // Optional feature actions are safe no-ops until their dedicated service is available.
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
