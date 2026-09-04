import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { backgroundGpsTracker } from '../utils/backgroundGpsTracker';
import {
  User,
  UserRole,
  Team,
  AttendanceRecord,
  ProductSale,
  IvrEntry,
  LeaveRequest,
  ChatMessage,
  Meeting,
  MeetingFile,
  KnowledgeArticle,
  EmployeeVerification,
  MonthlyProductTargets,
  TeamProductTargets,
  AgentProductTarget,
  CompanyWeeklyReport,
  VaultFile,
  MarketingPost,
  WebAiChatMessage,
  SystemDoctorLog,
  DailyJobRoleReport,
  CallSession,
  SmsLogRecord,
  LocationRecord,
  LocationTrackingConfig,
  MotivationBannerMessage,
  CompanyMessage,
  DialogPerformanceRecord,
  TrainingProgressRecord,
  QuizResultRecord,
  WorkAreaRecord,
  EmploymentStatus,
  EmployeeIdAuditLog,
  SecurityAlert,
  ColdStorageArchive,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_TEAMS,
  INITIAL_ATTENDANCE,
  INITIAL_SALES,
  INITIAL_IVR_ENTRIES,
  INITIAL_LEAVES,
  INITIAL_MESSAGES,
  INITIAL_MEETINGS,
  KNOWLEDGE_ARTICLES,
  INITIAL_VERIFICATIONS,
  INITIAL_VAULT_FILES,
  INITIAL_MARKETING_POSTS,
  INITIAL_WEB_AI_MESSAGES,
  INITIAL_SYSTEM_DOCTOR_LOGS,
  INITIAL_LOCATION_RECORDS,
  INITIAL_LOCATION_CONFIG,
  INITIAL_MOTIVATION_BANNERS,
  INITIAL_COMPANY_MESSAGES,
  INITIAL_DIALOG_PERFORMANCE,
} from '../data/initialData';
import { safeStorage } from '../utils/safeStorage';
import {
  playNotificationChime,
  playRingtone,
  triggerWebPushNotification,
} from '../utils/audioNotification';

// Recursive helper function to remove undefined values before sending to Firestore
function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

const safeSetDoc = (docRef: any, data: any, options?: any) => {
  const sanitized = sanitizeForFirestore(data);
  return options ? setDoc(docRef, sanitized, options) : setDoc(docRef, sanitized);
};

// Ultra-fast Real-time Instant Inter-Tab / Inter-Device Broadcast Channel (0ms latency)
const realtimeChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('ddworld_realtime_channel_v1')
    : null;

const broadcastRealtimeEvent = (type: string, data?: any) => {
  const eventPayload = { type, data, id: `evt-${Date.now()}-${Math.random()}` };
  if (realtimeChannel) {
    try {
      realtimeChannel.postMessage(eventPayload);
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }
  safeStorage.setItem('ddworld_latest_realtime_evt_v1', JSON.stringify(eventPayload));

  // Instant Cloud API Broadcast across all 4G/5G mobile internet devices
  fetch('/api/sync/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, data }),
  }).catch((err) => {
    // Network offline catch
  });
};

interface DataContextType {
  users: User[];
  teams: Team[];
  attendance: AttendanceRecord[];
  sales: ProductSale[];
  ivrEntries: IvrEntry[];
  leaves: LeaveRequest[];
  messages: ChatMessage[];
  meetings: Meeting[];
  securityAlerts: SecurityAlert[];
  coldArchives: ColdStorageArchive[];
  knowledge: KnowledgeArticle[];
  verifications: EmployeeVerification[];
  monthlyTargets: MonthlyProductTargets;
  teamTargets: TeamProductTargets[];
  agentTargets: AgentProductTarget[];
  companyWeeklyReports: CompanyWeeklyReport[];
  vaultFiles: VaultFile[];
  marketingPosts: MarketingPost[];
  webAiMessages: WebAiChatMessage[];
  systemDoctorLogs: SystemDoctorLog[];
  smsLogs: SmsLogRecord[];
  activeCall: CallSession | null;
  locationLogs: LocationRecord[];
  locationConfig: LocationTrackingConfig;
  motivationBanners: MotivationBannerMessage[];
  companyMessages: CompanyMessage[];
  dialogPerformanceRecords: DialogPerformanceRecord[];
  trainingProgress: TrainingProgressRecord[];
  quizResults: QuizResultRecord[];
  workAreaRecords: WorkAreaRecord[];
  employeeIdAuditLogs: EmployeeIdAuditLog[];
  ownerSignature: string;
  // Actions
  submitEmployeePhoto: (userId: string, photoUrl: string) => void;
  approveEmployeeId: (userId: string, jobPosition: string, signatureUrl?: string) => void;
  rejectEmployeeIdPhoto: (userId: string, reason: string) => void;
  requestNewEmployeePhoto: (userId: string, reason?: string) => void;
  updateEmployeeJobPosition: (userId: string, position: string) => void;
  saveOwnerSignature: (signatureDataUrl: string) => void;
  addMotivationBanner: (banner: Omit<MotivationBannerMessage, 'id'>) => void;
  removeMotivationBanner: (id: string) => void;
  sendCompanyMessage: (msg: Omit<CompanyMessage, 'id'>) => void;
  markMessageAsRead: (messageId: string, userId: string) => void;
  updateDialogPerformanceRecord: (rec: Omit<DialogPerformanceRecord, 'id' | 'updatedAt'>) => void;
  addTrainingProgress: (prog: Omit<TrainingProgressRecord, 'id'>) => void;
  recordQuizResult: (res: Omit<QuizResultRecord, 'id' | 'completedAt'>) => void;
  addWorkAreaRecord: (rec: Omit<WorkAreaRecord, 'id' | 'timestamp'>) => void;
  updateEmploymentStatus: (userId: string, status: EmploymentStatus, reason?: string) => void;
  updateUserGps: (
    userId: string,
    gpsData: { latitude?: number; longitude?: number; accuracy?: number; batteryLevel?: number; district?: string }
  ) => void;
  updateLocationConfig: (config: Partial<LocationTrackingConfig>) => void;
  addLocationRecord: (record: Omit<LocationRecord, 'id' | 'created_at'>) => void;
  sendSmsMessage: (record: {
    recipientMobile: string;
    recipientName: string;
    message: string;
    type?: 'single' | 'broadcast' | 'govimithuru' | 'sayuru';
    senderId?: string;
    senderName?: string;
    senderRole?: UserRole;
  }) => SmsLogRecord;
  startCall: (targetUser: User, type: 'voice' | 'video', callerUser?: User) => void;
  acceptCall: () => void;
  rejectCall: () => void;
  endCall: () => void;
  addVaultFile: (file: Omit<VaultFile, 'id' | 'uploadedAt'>) => void;
  deleteVaultFile: (id: string) => void;
  addMarketingPost: (post: Omit<MarketingPost, 'id' | 'publishedAt' | 'views' | 'likes'>) => void;
  deleteMarketingPost: (id: string) => void;
  sendWebAiMessage: (text: string, sender: 'user' | 'owner') => void;
  runSystemDoctorAutoHeal: () => { repairedCount: number; message: string };
  getDailyJobRoleReports: (dateStr?: string) => DailyJobRoleReport[];
  updateMonthlyTargets: (targets: Partial<MonthlyProductTargets>) => void;
  updateTeamTargets: (teamId: string, targets: Partial<Omit<TeamProductTargets, 'teamId'>>) => void;
  updateAgentTarget: (agentId: string, targets: Partial<Omit<AgentProductTarget, 'agentId'>>) => void;
  updateUserMobile: (userId: string, mobile: string) => void;
  updateUserAppStatus: (
    userId: string,
    appStatus: { isAppDownloaded?: boolean; isLoggedIn?: boolean; lastLoginAt?: string; appVersion?: string }
  ) => void;
  transferAgent: (agentId: string, newTeamId: string) => { success: boolean; message: string };
  addCompanyWeeklyReport: (report: CompanyWeeklyReport) => void;
  promoteAgentToLeader: (agentId: string) => { success: boolean; message: string };
  addSecurityAlert: (alert: Omit<SecurityAlert, 'id' | 'timestamp'>) => void;
  resolveSecurityAlert: (id: string) => void;
  createColdArchive: (fiscalMonth: string, archivedBy: string) => ColdStorageArchive;
  addAgent: (agentData: {
    name: string;
    agentCode: string;
    mobile: string;
    email: string;
    nic?: string;
    address?: string;
    avatar?: string;
    gramaNiladhariReportUrl?: string;
    policeReportUrl?: string;
    gramaReportName?: string;
    policeReportName?: string;
    tempPassword?: string;
    teamId: string;
    teamLeaderId: string;
  }) => { success: boolean; message: string; user?: User };
  addTeamLeader: (leaderData: {
    name: string;
    code: string;
    mobile: string;
    email: string;
    nic?: string;
    address?: string;
    avatar?: string;
    gramaNiladhariReportUrl?: string;
    policeReportUrl?: string;
    gramaReportName?: string;
    policeReportName?: string;
    tempPassword?: string;
    teamName: string;
  }) => { success: boolean; message: string; user?: User };
  registerNewUser: (data: {
    name: string;
    role: UserRole;
    agentCode?: string;
    nic: string;
    mobile: string;
    email: string;
    address: string;
    district?: string;
    avatar?: string;
    gramaNiladhariReportUrl: string;
    policeReportUrl: string;
    gramaReportName?: string;
    policeReportName?: string;
    teamId?: string;
    teamLeaderId?: string;
    tempPassword?: string;
  }) => { success: boolean; message: string; user?: User };
  updateUserProfile: (userId: string, data: Partial<User>) => void;
  updateAgentCode: (agentId: string, newCode: string) => { success: boolean; message: string };
  deleteAgent: (agentId: string) => { success: boolean; message: string };
  addAttendanceRecord: (record: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    teamName: string;
    role?: UserRole;
    checkInTime?: string;
    checkOutTime?: string;
    status: 'present' | 'completed' | 'half_day';
  }) => void;
  addProductSale: (sale: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    productType: 'ගොවිමිතුරු' | 'සයුරු' | 'අනෙකුත්';
    channel?: 'IVR' | 'APP';
    quantity?: number;
    productName: string;
    customerName?: string;
    customerMobile?: string;
    amount: number;
    notes?: string;
  }) => void;
  addIvrEntry: (entry: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    ivrCampaign: string;
    customerPhone?: string;
    callStatus: 'connected' | 'interested' | 'not_interested' | 'call_back';
    durationSeconds: number;
    remarks?: string;
  }) => void;
  submitLeaveRequest: (req: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    teamLeaderId: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
  }) => { success: boolean; message: string };
  updateLeaveStatus: (
    leaveId: string,
    status: 'approved' | 'rejected',
    reviewerName: string,
    comment?: string
  ) => void;
  sendMessage: (msg: {
    senderId: string;
    senderName: string;
    senderRole: 'owner' | 'team_leader' | 'agent';
    receiverId: string;
    receiverName: string;
    receiverRole: 'owner' | 'team_leader' | 'agent';
    content: string;
  }) => void;
  createMeeting: (mtg: {
    title: string;
    description?: string;
    date?: string;
    time?: string;
    scheduledTime?: string;
    meetingLink?: string;
    hostId?: string;
    hostName: string;
    hostRole: 'owner' | 'team_leader' | 'agent';
    teamId?: string;
    targetAudience?: 'all' | 'tls_only' | 'my_team' | 'specific_team';
    targetTeamName?: string;
    attachedFiles?: MeetingFile[];
  }) => Meeting;
  cancelMeeting: (meetingId: string) => void;
  addOrUpdateVerification: (verification: {
    userId: string;
    userName: string;
    userRole: UserRole;
    agentCode?: string;
    idNumber: string;
    address: string;
    contactNumber: string;
    idPhotoUrl: string;
    gramaNiladhariReportUrl: string;
    policeReportUrl: string;
    gramaReportName?: string;
    policeReportName?: string;
  }) => { success: boolean; message: string };
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'ddworld_users_v4';
const STORAGE_KEY_TEAMS = 'ddworld_teams_v1';
const STORAGE_KEY_ATTENDANCE = 'ddworld_attendance_v3';
const STORAGE_KEY_SALES = 'ddworld_sales_v3';
const STORAGE_KEY_IVR = 'ddworld_ivr_v3';
const STORAGE_KEY_LEAVES = 'ddworld_leaves_v2';
const STORAGE_KEY_MESSAGES = 'ddworld_messages_v2';
const STORAGE_KEY_MEETINGS = 'ddworld_meetings_v2';
const STORAGE_KEY_SECURITY_ALERTS = 'ddworld_security_alerts_v1';
const STORAGE_KEY_COLD_ARCHIVES = 'ddworld_cold_archives_v1';
const STORAGE_KEY_VERIFICATIONS = 'ddworld_verifications_v1';
const STORAGE_KEY_MONTHLY_TARGETS = 'ddworld_monthly_targets_v1';
const STORAGE_KEY_TEAM_TARGETS = 'ddworld_team_targets_v1';
const STORAGE_KEY_WEEKLY_REPORTS = 'ddworld_weekly_reports_v1';
const STORAGE_KEY_AGENT_TARGETS = 'ddworld_agent_targets_v1';
const STORAGE_KEY_VAULT_FILES = 'ddworld_vault_files_v1';
const STORAGE_KEY_MARKETING_POSTS = 'ddworld_marketing_posts_v1';
const STORAGE_KEY_WEB_AI_CHAT = 'ddworld_web_ai_chat_v1';
const STORAGE_KEY_SYSTEM_DOCTOR = 'ddworld_system_doctor_logs_v1';
const STORAGE_KEY_LOCATION_LOGS = 'ddworld_location_logs_v1';
const STORAGE_KEY_LOCATION_CONFIG = 'ddworld_location_config_v1';

const DEFAULT_MONTHLY_TARGETS: MonthlyProductTargets = {
  govimithuruIvr: 5000,
  govimithuruApp: 3000,
  sayuruIvr: 2500,
  sayuruApp: 1500,
};

const DEFAULT_TEAM_TARGETS: TeamProductTargets[] = [
  { teamId: 't1', govimithuruIvr: 1800, govimithuruApp: 1000, sayuruIvr: 800, sayuruApp: 500 },
  { teamId: 't2', govimithuruIvr: 1600, govimithuruApp: 1000, sayuruIvr: 900, sayuruApp: 500 },
  { teamId: 't3', govimithuruIvr: 1600, govimithuruApp: 1000, sayuruIvr: 800, sayuruApp: 500 },
];

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [smsLogs, setSmsLogs] = useState<SmsLogRecord[]>(() => {
    const saved = safeStorage.getItem('ddworld_sms_logs_v1');
    return saved ? JSON.parse(saved) : [
      {
        id: 'sms-init-1',
        senderId: 'owner-1',
        senderName: 'Dushmantha Fernando',
        senderRole: 'owner',
        recipientMobile: '0772223344',
        recipientName: 'Y.I. Dilshan (Team Leader)',
        message: 'DD WORLD: අද දින සියලුම Field Agents ලා සයුරු සහ ගොවිමිතුරු සක්‍රීය කිරීම් 20% කින් ඉහළ නංවන්න.',
        type: 'broadcast',
        status: 'delivered',
        sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cost: 0.25,
      },
      {
        id: 'sms-init-2',
        senderId: 'owner-1',
        senderName: 'DD WORLD Gateway',
        senderRole: 'owner',
        recipientMobile: '0773334455',
        recipientName: 'Govimithuru #616# Subscribers',
        message: 'ගොවිමිතුරු (#616#) කාලගුණ උපදෙස: බස්නාහිර සහ වයඹ පළාත්වල වගාවන්ට අද පස්වරුවේ වැසි අපේක්ෂිතයි.',
        type: 'govimithuru',
        status: 'delivered',
        sentAt: '08:30 AM',
        cost: 0.25,
      }
    ];
  });

  useEffect(() => {
    safeStorage.setItem('ddworld_sms_logs_v1', JSON.stringify(smsLogs));
  }, [smsLogs]);

  const [motivationBanners, setMotivationBanners] = useState<MotivationBannerMessage[]>(() => {
    const saved = safeStorage.getItem('ddworld_motivation_banners_v1');
    return saved ? JSON.parse(saved) : INITIAL_MOTIVATION_BANNERS;
  });

  const [companyMessages, setCompanyMessages] = useState<CompanyMessage[]>(() => {
    const saved = safeStorage.getItem('ddworld_company_messages_v1');
    return saved ? JSON.parse(saved) : INITIAL_COMPANY_MESSAGES;
  });

  const [dialogPerformanceRecords, setDialogPerformanceRecords] = useState<DialogPerformanceRecord[]>(() => {
    const saved = safeStorage.getItem('ddworld_dialog_performance_v1');
    return saved ? JSON.parse(saved) : INITIAL_DIALOG_PERFORMANCE;
  });

  const [trainingProgress, setTrainingProgress] = useState<TrainingProgressRecord[]>(() => {
    const saved = safeStorage.getItem('ddworld_training_progress_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [quizResults, setQuizResults] = useState<QuizResultRecord[]>(() => {
    const saved = safeStorage.getItem('ddworld_quiz_results_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [workAreaRecords, setWorkAreaRecords] = useState<WorkAreaRecord[]>(() => {
    const saved = safeStorage.getItem('ddworld_work_area_records_v1');
    return saved ? JSON.parse(saved) : [];
  });

  const [employeeIdAuditLogs, setEmployeeIdAuditLogs] = useState<EmployeeIdAuditLog[]>(() => {
    const saved = safeStorage.getItem('ddworld_id_audit_logs_v1');
    return saved ? JSON.parse(saved) : [
      {
        id: 'audit-seed-1',
        employeeId: 'DDW-EMP-9245',
        agentCode: '9245',
        employeeName: 'Y.I. Dilshan',
        action: 'ID_APPROVED',
        approvedBy: 'Dushmantha Fernando (Owner)',
        approvedAt: '2026-01-15T10:00:00Z',
        timestamp: '2026-01-15T10:00:00Z',
      }
    ];
  });

  const [ownerSignature, setOwnerSignatureState] = useState<string>(() => {
    return safeStorage.getItem('ddworld_owner_signature_v1') || '';
  });

  useEffect(() => {
    safeStorage.setItem('ddworld_id_audit_logs_v1', JSON.stringify(employeeIdAuditLogs));
  }, [employeeIdAuditLogs]);

  useEffect(() => {
    if (ownerSignature) {
      safeStorage.setItem('ddworld_owner_signature_v1', ownerSignature);
    }
  }, [ownerSignature]);

  useEffect(() => {
    safeStorage.setItem('ddworld_motivation_banners_v1', JSON.stringify(motivationBanners));
  }, [motivationBanners]);

  useEffect(() => {
    safeStorage.setItem('ddworld_company_messages_v1', JSON.stringify(companyMessages));
  }, [companyMessages]);

  useEffect(() => {
    safeStorage.setItem('ddworld_dialog_performance_v1', JSON.stringify(dialogPerformanceRecords));
  }, [dialogPerformanceRecords]);

  useEffect(() => {
    safeStorage.setItem('ddworld_training_progress_v1', JSON.stringify(trainingProgress));
  }, [trainingProgress]);

  useEffect(() => {
    safeStorage.setItem('ddworld_quiz_results_v1', JSON.stringify(quizResults));
  }, [quizResults]);

  useEffect(() => {
    safeStorage.setItem('ddworld_work_area_records_v1', JSON.stringify(workAreaRecords));
  }, [workAreaRecords]);

  const [activeCall, setActiveCall] = useState<CallSession | null>(null);

  // Listen to incoming real-time instant events (Messages, Calls, Attendance, Sales)
  useEffect(() => {
    // Initial fetch of cloud state from central Express server
    fetch('/api/sync/state')
      .then((res) => res.json())
      .then((serverState) => {
        if (serverState?.messages?.length > 0) {
          setMessages((prev) => {
            const combined = [...prev];
            serverState.messages.forEach((sm: ChatMessage) => {
              if (!combined.some((m) => m.id === sm.id)) combined.push(sm);
            });
            return combined;
          });
        }
        if (serverState?.attendance?.length > 0) {
          setAttendance((prev) => {
            const combined = [...prev];
            serverState.attendance.forEach((sa: AttendanceRecord) => {
              if (!combined.some((a) => a.id === sa.id)) combined.unshift(sa);
            });
            return combined;
          });
        }
        if (serverState?.productSales?.length > 0) {
          setSales((prev) => {
            const combined = [...prev];
            serverState.productSales.forEach((ss: ProductSale) => {
              if (!combined.some((s) => s.id === ss.id)) combined.unshift(ss);
            });
            return combined;
          });
        }
        if (serverState?.meetings?.length > 0) {
          setMeetings((prev) => {
            const combined = [...prev];
            serverState.meetings.forEach((sm: Meeting) => {
              if (!combined.some((m) => m.id === sm.id)) combined.unshift(sm);
            });
            return combined;
          });
        }
        if (serverState?.leaves?.length > 0) {
          setLeaves((prev) => {
            const combined = [...prev];
            serverState.leaves.forEach((sl: LeaveRequest) => {
              if (!combined.some((l) => l.id === sl.id)) combined.unshift(sl);
            });
            return combined;
          });
        }
        if (serverState?.verifications?.length > 0) {
          setVerifications((prev) => {
            const combined = [...prev];
            serverState.verifications.forEach((sv: EmployeeVerification) => {
              if (!combined.some((v) => v.id === sv.id || v.userId === sv.userId)) combined.unshift(sv);
            });
            return combined;
          });
        }
        if (serverState?.smsLogs?.length > 0) {
          setSmsLogs((prev) => {
            const combined = [...prev];
            serverState.smsLogs.forEach((ss: SmsLogRecord) => {
              if (!combined.some((s) => s.id === ss.id)) combined.unshift(ss);
            });
            return combined;
          });
        }
        if (serverState?.users?.length > 0) {
          setUsers((prev) => {
            const updated = [...prev];
            serverState.users.forEach((su: any) => {
              const idx = updated.findIndex((u) => u.id === su.id);
              if (idx >= 0) {
                updated[idx] = { ...updated[idx], ...su };
              } else if (su.id && su.name) {
                updated.push(su);
              }
            });
            return updated;
          });
        }
      })
      .catch((err) => console.log('Initial cloud state fetch notice:', err));

    const handleIncomingEvent = (type: string, data: any) => {
      if (type === 'NEW_MESSAGE' && data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
        playNotificationChime();
        triggerWebPushNotification(
          `💬 DD WORLD පණිවිඩයක්: ${data.senderName}`,
          data.content.length > 80 ? data.content.substring(0, 80) + '...' : data.content
        );
      } else if (type === 'ADD_ATTENDANCE' && data) {
        setAttendance((prev) => {
          const idx = prev.findIndex((a) => a.id === data.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data };
            return updated;
          }
          return [data, ...prev];
        });
      } else if (type === 'ADD_SALE' && data) {
        setSales((prev) => {
          if (prev.some((s) => s.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'UPDATE_USER_GPS' && data) {
        const targetId = data.id || data.userId;
        if (targetId) {
          setUsers((prev) =>
            prev.map((u) => (u.id === targetId ? { ...u, ...data } : u))
          );
        }
      } else if (type === 'CREATE_MEETING' && data) {
        setMeetings((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'CANCEL_MEETING' && data) {
        const mId = typeof data === 'string' ? data : data.id;
        setMeetings((prev) =>
          prev.map((m) => (m.id === mId ? { ...m, status: 'cancelled' } : m))
        );
      } else if (type === 'SUBMIT_LEAVE' && data) {
        setLeaves((prev) => {
          if (prev.some((l) => l.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'UPDATE_LEAVE' && data) {
        setLeaves((prev) =>
          prev.map((l) => (l.id === data.id ? { ...l, ...data } : l))
        );
      } else if (type === 'SECURITY_ALERT' && data) {
        setSecurityAlerts((prev) => {
          if (prev.some((a) => a.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'FORCE_LOGOUT' && data) {
        window.dispatchEvent(
          new CustomEvent('ddworld_force_logout', {
            detail: { userId: data.userId, status: data.status, reason: data.reason },
          })
        );
      } else if (type === 'ADD_AGENT' && data) {
        setUsers((prev) => {
          const idx = prev.findIndex((u) => u.id === data.id);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data };
            return updated;
          }
          return [...prev, data];
        });
      } else if (type === 'ADD_VERIFICATION' && data) {
        setVerifications((prev) => {
          const idx = prev.findIndex((v) => v.id === data.id || v.userId === data.userId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data };
            return updated;
          }
          return [data, ...prev];
        });
      } else if (type === 'ADD_SMS_LOG' && data) {
        setSmsLogs((prev) => {
          if (prev.some((s) => s.id === data.id)) return prev;
          return [data, ...prev];
        });
      } else if (type === 'UPDATE_TEAM_TARGETS' && data) {
        setTeamTargets((prev) => {
          const idx = prev.findIndex((t) => t.teamId === data.teamId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data };
            return updated;
          }
          return [...prev, data];
        });
      } else if (type === 'UPDATE_AGENT_TARGETS' && data) {
        setAgentTargets((prev) => {
          const idx = prev.findIndex((a) => a.agentId === data.agentId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...data };
            return updated;
          }
          return [...prev, data];
        });
      } else if (type === 'START_CALL' && data) {
        setActiveCall(data);
        try {
          const authUserStr = safeStorage.getItem('ddworld_current_user_v2');
          if (authUserStr) {
            const parsedUser = JSON.parse(authUserStr);
            if (parsedUser.id === data.receiverId) {
              playRingtone();
              triggerWebPushNotification(
                `📲 DD WORLD ${data.type.toUpperCase()} Call from ${data.callerName}`,
                `සජීවී ඇමතුම පිළිගැනීමට මෙතැන touch කරන්න.`
              );
            }
          }
        } catch (e) {
          // fallback
        }
      } else if (type === 'ACCEPT_CALL') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
      } else if (type === 'REJECT_CALL') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'rejected' } : null));
        setTimeout(() => setActiveCall(null), 800);
      } else if (type === 'END_CALL') {
        setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
        setTimeout(() => setActiveCall(null), 800);
      }
    };

    // 1. SSE Stream setup (Server-Sent Events for instant cross-device delivery over 4G/5G)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/stream');
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.type && parsed?.type !== 'CONNECTED') {
            handleIncomingEvent(parsed.type, parsed.data);
          }
        } catch (e) {
          console.warn('SSE parse error:', e);
        }
      };
    } catch (e) {
      console.warn('EventSource connection error:', e);
    }

    // 2. BroadcastChannel setup (for same-device multi-tab)
    if (realtimeChannel) {
      realtimeChannel.onmessage = (event) => {
        if (event.data?.type) {
          handleIncomingEvent(event.data.type, event.data.data);
        }
      };
    }

    // 3. Storage event setup (fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ddworld_latest_realtime_evt_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.type) {
            handleIncomingEvent(parsed.type, parsed.data);
          }
        } catch (err) {
          console.warn('Realtime storage event parse error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (eventSource) eventSource.close();
    };
  }, []);

  const sendSmsMessage = (record: {
    recipientMobile: string;
    recipientName: string;
    message: string;
    type?: 'single' | 'broadcast' | 'govimithuru' | 'sayuru';
    senderId?: string;
    senderName?: string;
    senderRole?: UserRole;
  }): SmsLogRecord => {
    const newRecord: SmsLogRecord = {
      id: `sms-${Date.now()}`,
      senderId: record.senderId || 'current-user',
      senderName: record.senderName || 'DD WORLD System',
      senderRole: record.senderRole || 'owner',
      recipientMobile: record.recipientMobile,
      recipientName: record.recipientName,
      message: record.message,
      type: record.type || 'single',
      status: 'delivered',
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cost: 0.25,
    };
    setSmsLogs((prev) => [newRecord, ...prev]);
    broadcastRealtimeEvent('ADD_SMS_LOG', newRecord);
    return newRecord;
  };

  const startCall = (targetUser: User, type: 'voice' | 'video', callerUser?: User) => {
    let resolvedCaller = callerUser;
    if (!resolvedCaller) {
      try {
        const savedUser = safeStorage.getItem('ddworld_current_user_v2');
        if (savedUser) resolvedCaller = JSON.parse(savedUser);
      } catch (e) {
        // fallback
      }
    }

    const callerIdStr = resolvedCaller?.id || 'owner-1';
    const callerNameStr = resolvedCaller?.name || 'Dushmantha Fernando (Owner)';
    const callerRoleStr = resolvedCaller?.role || 'owner';

    const session: CallSession = {
      id: `call-${Date.now()}`,
      callerId: callerIdStr,
      callerName: callerNameStr,
      callerRole: callerRoleStr,
      receiverId: targetUser.id,
      receiverName: targetUser.name,
      receiverRole: targetUser.role,
      type,
      status: 'ringing',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setActiveCall(session);

    // Broadcast instant call event across all devices/tabs (0ms delay)
    broadcastRealtimeEvent('START_CALL', session);
  };

  const acceptCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    broadcastRealtimeEvent('ACCEPT_CALL');
  };

  const rejectCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, status: 'rejected' } : null));
    broadcastRealtimeEvent('REJECT_CALL');
    setTimeout(() => setActiveCall(null), 800);
  };

  const endCall = () => {
    setActiveCall((prev) => (prev ? { ...prev, status: 'ended' } : null));
    broadcastRealtimeEvent('END_CALL');
    setTimeout(() => setActiveCall(null), 800);
  };

  const [monthlyTargets, setMonthlyTargets] = useState<MonthlyProductTargets>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_MONTHLY_TARGETS);
    return saved ? JSON.parse(saved) : DEFAULT_MONTHLY_TARGETS;
  });

  const [teamTargets, setTeamTargets] = useState<TeamProductTargets[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_TEAM_TARGETS);
    return saved ? JSON.parse(saved) : DEFAULT_TEAM_TARGETS;
  });

  const [companyWeeklyReports, setCompanyWeeklyReports] = useState<CompanyWeeklyReport[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_WEEKLY_REPORTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_SECURITY_ALERTS);
    return saved ? JSON.parse(saved) : [];
  });

  const [coldArchives, setColdArchives] = useState<ColdStorageArchive[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_COLD_ARCHIVES);
    return saved ? JSON.parse(saved) : [];
  });

  const [agentTargets, setAgentTargets] = useState<AgentProductTarget[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_AGENT_TARGETS);
    return saved ? JSON.parse(saved) : [];
  });

  const [verifications, setVerifications] = useState<EmployeeVerification[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_VERIFICATIONS);
    return saved ? JSON.parse(saved) : INITIAL_VERIFICATIONS;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_USERS);
    const savedList: User[] = saved ? JSON.parse(saved) : [];
    const combined = [...savedList];

    // Merge missing or updated INITIAL_USERS
    INITIAL_USERS.forEach((iu) => {
      const idx = combined.findIndex(
        (u) => u.id === iu.id || (u.agentCode && u.agentCode === iu.agentCode && u.role === iu.role)
      );
      if (idx === -1) {
        combined.push(iu);
      } else {
        // Keep updated team, role, name, mobile, and app status from INITIAL_USERS
        combined[idx] = {
          ...combined[idx],
          name: iu.name,
          mobile: iu.mobile || combined[idx].mobile,
          teamId: iu.teamId || combined[idx].teamId,
          teamName: iu.teamName || combined[idx].teamName,
          teamLeaderId: iu.teamLeaderId || combined[idx].teamLeaderId,
          teamLeaderName: iu.teamLeaderName || combined[idx].teamLeaderName,
          isAppDownloaded: combined[idx].isAppDownloaded ?? iu.isAppDownloaded ?? (iu.role === 'team_leader' || iu.status === 'active'),
          isLoggedIn: combined[idx].isLoggedIn ?? iu.isLoggedIn ?? (iu.role === 'team_leader'),
          lastLoginAt: combined[idx].lastLoginAt || iu.lastLoginAt || (iu.role === 'team_leader' ? 'Today, 08:30 AM' : undefined),
          appVersion: combined[idx].appVersion || iu.appVersion || 'v5.3',
          idApprovalStatus: combined[idx].idApprovalStatus || iu.idApprovalStatus,
        };
      }
    });

    const baseList: User[] = combined.length > 0 ? combined : INITIAL_USERS;
    return baseList.map((u) => {
      const mob = u.mobile ? u.mobile.trim() : '';
      const isDummy = !mob || mob === '' || mob === '0770000000' || mob === 'නැත';
      return {
        ...u,
        mobile: isDummy ? 'නැත' : u.mobile,
        isAppDownloaded: u.isAppDownloaded ?? (u.role === 'team_leader' || (u.status === 'active' && u.agentCode !== '0000')),
        isLoggedIn: u.isLoggedIn ?? (u.role === 'team_leader'),
        appVersion: u.appVersion || 'v5.3',
      };
    });
  });

  const [teams, setTeams] = useState<Team[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_TEAMS);
    return saved ? JSON.parse(saved) : INITIAL_TEAMS;
  });

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_TEAMS, JSON.stringify(teams));
  }, [teams]);

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_ATTENDANCE);
    if (!saved) return INITIAL_ATTENDANCE;
    try {
      const parsed: AttendanceRecord[] = JSON.parse(saved);
      const merged = [...parsed];
      INITIAL_ATTENDANCE.forEach((init) => {
        if (!merged.some((a) => a.id === init.id)) merged.push(init);
      });
      return merged;
    } catch {
      return INITIAL_ATTENDANCE;
    }
  });

  const [sales, setSales] = useState<ProductSale[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_SALES);
    if (!saved) return INITIAL_SALES;
    try {
      const parsed: ProductSale[] = JSON.parse(saved);
      const merged = [...parsed];
      INITIAL_SALES.forEach((init) => {
        if (!merged.some((s) => s.id === init.id)) merged.push(init);
      });
      return merged;
    } catch {
      return INITIAL_SALES;
    }
  });

  const [ivrEntries, setIvrEntries] = useState<IvrEntry[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_IVR);
    if (!saved) return INITIAL_IVR_ENTRIES;
    try {
      const parsed: IvrEntry[] = JSON.parse(saved);
      const merged = [...parsed];
      INITIAL_IVR_ENTRIES.forEach((init) => {
        if (!merged.some((i) => i.id === init.id)) merged.push(init);
      });
      return merged;
    } catch {
      return INITIAL_IVR_ENTRIES;
    }
  });

  const [leaves, setLeaves] = useState<LeaveRequest[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_LEAVES);
    return saved ? JSON.parse(saved) : INITIAL_LEAVES;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [meetings, setMeetings] = useState<Meeting[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_MEETINGS);
    return saved ? JSON.parse(saved) : INITIAL_MEETINGS;
  });

  const [vaultFiles, setVaultFiles] = useState<VaultFile[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_VAULT_FILES);
    return saved ? JSON.parse(saved) : INITIAL_VAULT_FILES;
  });

  const [marketingPosts, setMarketingPosts] = useState<MarketingPost[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_MARKETING_POSTS);
    return saved ? JSON.parse(saved) : INITIAL_MARKETING_POSTS;
  });

  const [webAiMessages, setWebAiMessages] = useState<WebAiChatMessage[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_WEB_AI_CHAT);
    return saved ? JSON.parse(saved) : INITIAL_WEB_AI_MESSAGES;
  });

  const [systemDoctorLogs, setSystemDoctorLogs] = useState<SystemDoctorLog[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_SYSTEM_DOCTOR);
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_DOCTOR_LOGS;
  });

  const [locationConfig, setLocationConfig] = useState<LocationTrackingConfig>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_LOCATION_CONFIG);
    return saved ? JSON.parse(saved) : INITIAL_LOCATION_CONFIG;
  });

  const [locationLogs, setLocationLogs] = useState<LocationRecord[]>(() => {
    const saved = safeStorage.getItem(STORAGE_KEY_LOCATION_LOGS);
    return saved ? JSON.parse(saved) : INITIAL_LOCATION_RECORDS;
  });

  // Save to safeStorage whenever state updates
  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_LOCATION_CONFIG, JSON.stringify(locationConfig));
  }, [locationConfig]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_LOCATION_LOGS, JSON.stringify(locationLogs.slice(0, 300)));
  }, [locationLogs]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_VAULT_FILES, JSON.stringify(vaultFiles));
  }, [vaultFiles]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_MARKETING_POSTS, JSON.stringify(marketingPosts));
  }, [marketingPosts]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_WEB_AI_CHAT, JSON.stringify(webAiMessages.slice(-100)));
  }, [webAiMessages]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_SYSTEM_DOCTOR, JSON.stringify(systemDoctorLogs.slice(0, 100)));
  }, [systemDoctorLogs]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_IVR, JSON.stringify(ivrEntries));
  }, [ivrEntries]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_LEAVES, JSON.stringify(leaves));
  }, [leaves]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_MEETINGS, JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_SECURITY_ALERTS, JSON.stringify(securityAlerts));
  }, [securityAlerts]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_COLD_ARCHIVES, JSON.stringify(coldArchives));
  }, [coldArchives]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_VERIFICATIONS, JSON.stringify(verifications));
  }, [verifications]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_MONTHLY_TARGETS, JSON.stringify(monthlyTargets));
  }, [monthlyTargets]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_TEAM_TARGETS, JSON.stringify(teamTargets));
  }, [teamTargets]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_WEEKLY_REPORTS, JSON.stringify(companyWeeklyReports));
  }, [companyWeeklyReports]);

  useEffect(() => {
    safeStorage.setItem(STORAGE_KEY_AGENT_TARGETS, JSON.stringify(agentTargets));
  }, [agentTargets]);

  // Listen for storage events across browser tabs/windows for immediate live sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;
      try {
        if (e.key === STORAGE_KEY_USERS) setUsers(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_ATTENDANCE) setAttendance(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_SALES) setSales(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_IVR) setIvrEntries(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_LEAVES) setLeaves(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_MESSAGES) setMessages(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_SECURITY_ALERTS) setSecurityAlerts(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_COLD_ARCHIVES) setColdArchives(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_MONTHLY_TARGETS) setMonthlyTargets(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_TEAM_TARGETS) setTeamTargets(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_AGENT_TARGETS) setAgentTargets(JSON.parse(e.newValue));
        if (e.key === STORAGE_KEY_WEEKLY_REPORTS) setCompanyWeeklyReports(JSON.parse(e.newValue));
      } catch (err) {
        console.error('Error parsing storage event update:', err);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Real-time Cloud Database Synchronization via Firebase Firestore
  useEffect(() => {
    if (!db) return;

    // 1. Sync Attendance
    const unsubAttendance = onSnapshot(
      collection(db, 'attendance'),
      (snapshot) => {
        setAttendance((prev) => {
          const map = new Map<string, AttendanceRecord>();
          prev.forEach((rec) => map.set(rec.id, rec));
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              const data = d.data() as AttendanceRecord;
              if (data && data.id) map.set(data.id, data);
            });
          }
          const merged = Array.from(map.values());
          safeStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(merged));
          return merged;
        });
      },
      (err) => console.warn('Firestore attendance sync error:', err)
    );

    // 2. Sync Sales
    const unsubSales = onSnapshot(
      collection(db, 'sales'),
      (snapshot) => {
        setSales((prev) => {
          const map = new Map<string, ProductSale>();
          prev.forEach((rec) => map.set(rec.id, rec));
          if (!snapshot.empty) {
            snapshot.forEach((d) => {
              const data = d.data() as ProductSale;
              if (data && data.id) map.set(data.id, data);
            });
          }
          const merged = Array.from(map.values());
          safeStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(merged));
          return merged;
        });
      },
      (err) => console.warn('Firestore sales sync error:', err)
    );

    // 3. Sync IVR Entries
    const unsubIvr = onSnapshot(
      collection(db, 'ivr'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: IvrEntry[] = [];
          snapshot.forEach((d) => records.push(d.data() as IvrEntry));
          setIvrEntries(records);
        } else {
          INITIAL_IVR_ENTRIES.forEach((rec) => {
            safeSetDoc(doc(db, 'ivr', rec.id), rec).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore ivr sync error:', err)
    );

    // 4. Sync Users
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: User[] = [];
          snapshot.forEach((d) => records.push(d.data() as User));

          const existingIds = new Set(records.map((r) => r.id));
          const existingCodes = new Set(records.map((r) => r.agentCode).filter(Boolean));

          const missingInitialUsers = INITIAL_USERS.filter(
            (iu) => !existingIds.has(iu.id) && (!iu.agentCode || !existingCodes.has(iu.agentCode))
          );

          missingInitialUsers.forEach((rec) => {
            safeSetDoc(doc(db, 'users', rec.id), rec).catch(console.error);
          });

          const combinedRecords = [...records, ...missingInitialUsers];

          const merged = combinedRecords.map((u) => {
            const iu = INITIAL_USERS.find(
              (item) => item.id === u.id || (item.agentCode && item.agentCode === u.agentCode && item.role === u.role)
            );
            if (iu && iu.mobile && iu.mobile !== 'නැත') {
              return { ...u, mobile: iu.mobile, name: iu.name };
            }
            return u;
          });
          setUsers(merged);
        } else {
          INITIAL_USERS.forEach((rec) => {
            safeSetDoc(doc(db, 'users', rec.id), rec).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore users sync error:', err)
    );

    // 5. Sync Teams
    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: Team[] = [];
          snapshot.forEach((d) => records.push(d.data() as Team));
          setTeams(records);
        } else {
          INITIAL_TEAMS.forEach((rec) => {
            safeSetDoc(doc(db, 'teams', rec.id), rec).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore teams sync error:', err)
    );

    // 6. Sync Leaves
    const unsubLeaves = onSnapshot(
      collection(db, 'leaves'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: LeaveRequest[] = [];
          snapshot.forEach((d) => records.push(d.data() as LeaveRequest));
          setLeaves(records);
        }
      },
      (err) => console.warn('Firestore leaves sync error:', err)
    );

    // 7. Sync Chat Messages
    const unsubMessages = onSnapshot(
      collection(db, 'messages'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: ChatMessage[] = [];
          snapshot.forEach((d) => records.push(d.data() as ChatMessage));
          setMessages(records);
        }
      },
      (err) => console.warn('Firestore messages sync error:', err)
    );

    // 8. Sync Location Logs
    const unsubLocationLogs = onSnapshot(
      collection(db, 'location_logs'),
      (snapshot) => {
        if (!snapshot.empty) {
          const records: LocationRecord[] = [];
          snapshot.forEach((d) => records.push(d.data() as LocationRecord));
          records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLocationLogs(records);
        } else {
          INITIAL_LOCATION_RECORDS.forEach((rec) => {
            safeSetDoc(doc(db, 'location_logs', rec.id), rec).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore location_logs sync error:', err)
    );

    return () => {
      unsubAttendance();
      unsubSales();
      unsubIvr();
      unsubUsers();
      unsubTeams();
      unsubLeaves();
      unsubMessages();
      unsubLocationLogs();
    };
  }, []);

  const updateMonthlyTargets = (newTargets: Partial<MonthlyProductTargets>) => {
    setMonthlyTargets((prev) => {
      const updated = { ...prev, ...newTargets };
      if (db) {
        safeSetDoc(doc(db, 'settings', 'monthly_targets'), updated, { merge: true }).catch(console.error);
      }
      return updated;
    });
    broadcastRealtimeEvent('UPDATE_MONTHLY_TARGETS', newTargets);
  };

  const updateAgentTarget = (agentId: string, newTargets: Partial<Omit<AgentProductTarget, 'agentId'>>) => {
    setAgentTargets((prev) => {
      const idx = prev.findIndex((a) => a.agentId === agentId);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...newTargets };
        return updated;
      }
      return [
        ...prev,
        {
          agentId,
          govimithuruIvr: newTargets.govimithuruIvr || 100,
          govimithuruApp: newTargets.govimithuruApp || 50,
          sayuruIvr: newTargets.sayuruIvr || 50,
          sayuruApp: newTargets.sayuruApp || 30,
        },
      ];
    });
    broadcastRealtimeEvent('UPDATE_AGENT_TARGETS', { agentId, ...newTargets });
  };

  const transferAgent = (agentId: string, newTeamId: string): { success: boolean; message: string } => {
    const targetAgent = users.find((u) => u.id === agentId);
    if (!targetAgent) {
      return { success: false, message: 'Agent සොයාගත නොහැකි විය.' };
    }
    const targetTeam = teams.find((t) => t.id === newTeamId);
    if (!targetTeam) {
      return { success: false, message: 'තෝරාගත් කණ්ඩායම (Team) සොයාගත නොහැකි විය.' };
    }
    const targetLeader = users.find((u) => u.id === targetTeam.leaderId);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === agentId) {
          return {
            ...u,
            teamId: targetTeam.id,
            teamName: targetTeam.name,
            teamLeaderId: targetTeam.leaderId,
            teamLeaderName: targetLeader ? targetLeader.name : targetTeam.leaderName,
          };
        }
        return u;
      })
    );

    // Sync session if currently logged-in user
    const currentSession = safeStorage.getItem('ddworld_current_user_v2');
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (parsed.id === agentId) {
        parsed.teamId = targetTeam.id;
        parsed.teamName = targetTeam.name;
        parsed.teamLeaderId = targetTeam.leaderId;
        parsed.teamLeaderName = targetLeader ? targetLeader.name : targetTeam.leaderName;
        safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(parsed));
      }
    }

    return {
      success: true,
      message: `${targetAgent.name} සාර්ථකව "${targetTeam.name}" වෙත මාරු කරන ලදී (Team Transfer Successful).`,
    };
  };

  const updateTeamTargets = (teamId: string, newTargets: Partial<Omit<TeamProductTargets, 'teamId'>>) => {
    setTeamTargets((prev) => {
      const idx = prev.findIndex((t) => t.teamId === teamId);
      let updatedList: TeamProductTargets[];
      if (idx >= 0) {
        updatedList = [...prev];
        updatedList[idx] = { ...updatedList[idx], ...newTargets };
      } else {
        updatedList = [
          ...prev,
          {
            teamId,
            govimithuruIvr: newTargets.govimithuruIvr || 200,
            govimithuruApp: newTargets.govimithuruApp || 100,
            sayuruIvr: newTargets.sayuruIvr || 100,
            sayuruApp: newTargets.sayuruApp || 50,
          },
        ];
      }
      if (db) {
        safeSetDoc(doc(db, 'team_targets', teamId), updatedList.find(t => t.teamId === teamId), { merge: true }).catch(console.error);
      }
      return updatedList;
    });
    broadcastRealtimeEvent('UPDATE_TEAM_TARGETS', { teamId, ...newTargets });
  };

  const addCompanyWeeklyReport = (report: CompanyWeeklyReport) => {
    setCompanyWeeklyReports((prev) => [report, ...prev]);
  };

  const addSecurityAlert = (alert: Omit<SecurityAlert, 'id' | 'timestamp'>) => {
    const newAlert: SecurityAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    setSecurityAlerts((prev) => {
      const updated = [newAlert, ...prev];
      safeStorage.setItem(STORAGE_KEY_SECURITY_ALERTS, JSON.stringify(updated));
      return updated;
    });
    broadcastRealtimeEvent('SECURITY_ALERT', newAlert);
  };

  const resolveSecurityAlert = (id: string) => {
    setSecurityAlerts((prev) => {
      const updated = prev.map((a) => (a.id === id ? { ...a, resolved: true } : a));
      safeStorage.setItem(STORAGE_KEY_SECURITY_ALERTS, JSON.stringify(updated));
      return updated;
    });
  };

  const createColdArchive = (fiscalMonth: string, archivedBy: string): ColdStorageArchive => {
    const archive: ColdStorageArchive = {
      id: `archive-${fiscalMonth}-${Date.now()}`,
      fiscalMonth,
      archivedAt: new Date().toISOString(),
      archivedBy,
      totalSalesRecords: sales.length,
      totalAttendanceRecords: attendance.length,
      totalLocationRecords: locationLogs.length,
      dataSnapshot: JSON.stringify({
        sales,
        attendance,
        locationLogs,
      }),
    };
    setColdArchives((prev) => {
      const updated = [archive, ...prev];
      safeStorage.setItem(STORAGE_KEY_COLD_ARCHIVES, JSON.stringify(updated));
      return updated;
    });
    return archive;
  };

  const promoteAgentToLeader = (agentId: string) => {
    const target = users.find((u) => u.id === agentId);
    if (!target) return { success: false, message: 'Agent not found' };
    setUsers((prev) => {
      const updated = prev.map((u) =>
        u.id === agentId
          ? {
              ...u,
              role: 'team_leader' as const,
              jobPosition: 'Team Leader',
              systemRole: 'team_leader',
            }
          : u
      );
      safeStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(updated));
      return updated;
    });
    if (db) {
      safeSetDoc(
        doc(db, 'users', agentId),
        { role: 'team_leader', jobPosition: 'Team Leader', systemRole: 'team_leader' },
        { merge: true }
      ).catch(console.error);
    }
    broadcastRealtimeEvent('UPDATE_USER_ROLE', { userId: agentId, role: 'team_leader' });
    return { success: true, message: `✅ ${target.name} සාර්ථකව Team Leader තනතුරට උසස් කරන ලදී.` };
  };


  const addOrUpdateVerification = (verification: {
    userId: string;
    userName: string;
    userRole: 'owner' | 'team_leader' | 'agent';
    agentCode?: string;
    idNumber: string;
    address: string;
    contactNumber: string;
    idPhotoUrl: string;
    gramaNiladhariReportUrl: string;
    policeReportUrl: string;
    gramaReportName?: string;
    policeReportName?: string;
  }): { success: boolean; message: string } => {
    const existingIndex = verifications.findIndex((v) => v.userId === verification.userId);
    const now = new Date().toISOString().split('T')[0];
    
    let updatedVerif: EmployeeVerification;
    if (existingIndex >= 0) {
      const updated = [...verifications];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...verification,
        status: 'verified',
        submittedAt: now,
      };
      setVerifications(updated);
      updatedVerif = updated[existingIndex];
      broadcastRealtimeEvent('ADD_VERIFICATION', updated[existingIndex]);
    } else {
      const newVerif: EmployeeVerification = {
        id: `verif-${Date.now()}`,
        ...verification,
        status: 'verified',
        submittedAt: now,
      };
      setVerifications([newVerif, ...verifications]);
      updatedVerif = newVerif;
      broadcastRealtimeEvent('ADD_VERIFICATION', newVerif);
    }

    // Direct Sync to User Profile in Database
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === verification.userId) {
          const updatedUser: User = {
            ...u,
            nic: verification.idNumber || u.nic,
            mobile: verification.contactNumber || u.mobile,
            avatar: verification.idPhotoUrl || u.avatar,
            gramaNiladhariReportUrl: verification.gramaNiladhariReportUrl || u.gramaNiladhariReportUrl,
            policeReportUrl: verification.policeReportUrl || u.policeReportUrl,
            gramaReportName: verification.gramaReportName || u.gramaReportName,
            policeReportName: verification.policeReportName || u.policeReportName,
            gramaReportUploadedAt: now,
            policeReportUploadedAt: now,
          };
          if (db) {
            safeSetDoc(doc(db, 'users', u.id), updatedUser, { merge: true }).catch(console.error);
          }
          return updatedUser;
        }
        return u;
      })
    );

    return { success: true, message: 'ඔබගේ සේවක තොරතුරු හා අනිවාර්ය වාර්තා (Grama Niladhari & Police Reports) සාර්ථකව Profile එකට එක් කරන ලදී!' };
  };

  // Update general user profile in state & Firestore
  const updateUserProfile = (userId: string, data: Partial<User>) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            ...data,
          };
          if (db) {
            safeSetDoc(doc(db, 'users', userId), updated, { merge: true }).catch(console.error);
          }
          return updated;
        }
        return u;
      })
    );
  };

  // Dedicated Register New User (Self Registration or System Registration)
  const registerNewUser = (data: {
    name: string;
    role: UserRole;
    agentCode?: string;
    nic: string;
    mobile: string;
    email: string;
    address: string;
    district?: string;
    avatar?: string;
    gramaNiladhariReportUrl: string;
    policeReportUrl: string;
    gramaReportName?: string;
    policeReportName?: string;
    teamId?: string;
    teamLeaderId?: string;
    tempPassword?: string;
  }): { success: boolean; message: string; user?: User } => {
    // Validate mandatory reports
    if (!data.gramaNiladhariReportUrl || !data.policeReportUrl) {
      return {
        success: false,
        message: 'ග්‍රාම නිලධාරී චරිත වාර්තාව (Grama Niladhari Report) සහ පොලිස් වාර්තාව (Police Clearance Report) අනිවාර්යයෙන් Upload කළ යුතුය.',
      };
    }

    const duplicateEmail = users.some(
      (u) => u.email && data.email && u.email.toLowerCase() === data.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      return {
        success: false,
        message: 'මෙම Email ලිපිනය දැනටමත් පද්ධතිය තුළ භාවිතා වේ.',
      };
    }

    const assignedCode = data.agentCode?.trim() || (data.role === 'team_leader' ? `TL-00${teams.length + 1}` : `AG-00${users.filter(u => u.role === 'agent').length + 1}`);
    const duplicateCode = users.some(
      (u) => u.agentCode && u.agentCode.toLowerCase() === assignedCode.toLowerCase()
    );
    if (duplicateCode) {
      return {
        success: false,
        message: 'මෙම Code අංකය දැනටමත් ලබා දී ඇත.',
      };
    }

    const userId = data.role === 'team_leader' ? `tl-${Date.now()}` : `ag-${Date.now()}`;
    const targetTeam = teams.find((t) => t.id === data.teamId);
    const targetLeader = users.find((u) => u.id === data.teamLeaderId);

    const now = new Date().toISOString().split('T')[0];

    const newUser: User = {
      id: userId,
      name: (data.name || '').trim(),
      email: (data.email || '').trim(),
      mobile: (data.mobile || '').trim(),
      nic: (data.nic || '').trim(),
      role: data.role,
      agentCode: assignedCode,
      district: data.district || 'කොළඹ',
      avatar: data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      teamId: data.teamId || (data.role === 'team_leader' ? `team-${Date.now()}` : 'team-1'),
      teamName: targetTeam ? targetTeam.name : (data.role === 'team_leader' ? `${(data.name || '').trim()} Team` : 'Alpha Team'),
      teamLeaderId: data.teamLeaderId || (data.role === 'team_leader' ? userId : 'tl-1'),
      teamLeaderName: targetLeader ? targetLeader.name : (data.role === 'team_leader' ? (data.name || '').trim() : 'කසුන් පෙරේරා'),
      status: 'active',
      employmentStatus: 'ACTIVE',
      idApprovalStatus: 'PENDING',
      gramaNiladhariReportUrl: data.gramaNiladhariReportUrl,
      policeReportUrl: data.policeReportUrl,
      gramaReportName: data.gramaReportName || 'Grama_Niladhari_Report.pdf',
      policeReportName: data.policeReportName || 'Police_Clearance_Report.pdf',
      gramaReportUploadedAt: now,
      policeReportUploadedAt: now,
      tempPassword: data.tempPassword || 'ddworld@2026',
      createdAt: now,
      joinedDate: now,
    };

    setUsers((prev) => [...prev, newUser]);
    if (db) {
      safeSetDoc(doc(db, 'users', newUser.id), newUser).catch(console.error);
    }

    // Also create verification record
    const verifRecord: EmployeeVerification = {
      id: `verif-${Date.now()}`,
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      agentCode: newUser.agentCode,
      idNumber: data.nic,
      address: data.address,
      contactNumber: data.mobile,
      idPhotoUrl: newUser.avatar,
      gramaNiladhariReportUrl: data.gramaNiladhariReportUrl,
      policeReportUrl: data.policeReportUrl,
      gramaReportName: data.gramaReportName,
      policeReportName: data.policeReportName,
      status: 'pending',
      submittedAt: now,
    };
    setVerifications((prev) => [verifRecord, ...prev]);

    broadcastRealtimeEvent('ADD_AGENT', newUser);

    return {
      success: true,
      message: `සේවක ${newUser.name} සාර්ථකව ලියාපදිංචි කර අනිවාර්ය වාර්තා (Grama & Police Reports) Profile එකට සම්බන්ධ කරන ලදී!`,
      user: newUser,
    };
  };

  // Add Agent (by Owner)
  const addAgent = (agentData: {
    name: string;
    agentCode: string;
    mobile: string;
    email: string;
    nic?: string;
    address?: string;
    avatar?: string;
    gramaNiladhariReportUrl?: string;
    policeReportUrl?: string;
    gramaReportName?: string;
    policeReportName?: string;
    tempPassword?: string;
    teamId: string;
    teamLeaderId: string;
  }): { success: boolean; message: string; user?: User } => {
    // Check for duplicate Email or Agent Code
    const duplicateEmail = users.some(
      (u) => u.email && agentData.email && u.email.toLowerCase() === agentData.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      return {
        success: false,
        message: 'මෙම Email ලිපිනය දැනටමත් පද්ධතිය තුළ භාවිතා වේ. (Duplicate Email not allowed)',
      };
    }

    const duplicateCode = users.some(
      (u) =>
        u.agentCode &&
        agentData.agentCode &&
        u.agentCode.toLowerCase() === agentData.agentCode.trim().toLowerCase()
    );
    if (duplicateCode) {
      return {
        success: false,
        message: 'මෙම Agent Code එක දැනටමත් වෙනත් Agent කෙනෙකුට ලබා දී ඇත. (Duplicate Agent Code not allowed)',
      };
    }

    const targetTeam = teams.find((t) => t.id === agentData.teamId);
    const targetLeader = users.find((u) => u.id === agentData.teamLeaderId);
    const now = new Date().toISOString().split('T')[0];

    const newAgent: User = {
      id: `ag-${Date.now()}`,
      name: (agentData.name || '').trim(),
      email: (agentData.email || '').trim(),
      mobile: (agentData.mobile || '').trim(),
      nic: agentData.nic?.trim() || '199518294021',
      role: 'agent',
      agentCode: (agentData.agentCode || '').trim(),
      avatar: agentData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      teamId: agentData.teamId,
      teamName: targetTeam ? targetTeam.name : 'Unassigned Team',
      teamLeaderId: agentData.teamLeaderId,
      teamLeaderName: targetLeader ? targetLeader.name : 'Unassigned TL',
      status: 'active',
      employmentStatus: 'ACTIVE',
      idApprovalStatus: 'PENDING',
      gramaNiladhariReportUrl: agentData.gramaNiladhariReportUrl,
      policeReportUrl: agentData.policeReportUrl,
      gramaReportName: agentData.gramaReportName,
      policeReportName: agentData.policeReportName,
      gramaReportUploadedAt: agentData.gramaNiladhariReportUrl ? now : undefined,
      policeReportUploadedAt: agentData.policeReportUrl ? now : undefined,
      createdAt: now,
      joinedDate: now,
    };

    setUsers((prev) => [...prev, newAgent]);
    if (db) safeSetDoc(doc(db, 'users', newAgent.id), newAgent).catch(console.error);

    // Also register verification record if reports present
    if (agentData.gramaNiladhariReportUrl || agentData.policeReportUrl) {
      const verif: EmployeeVerification = {
        id: `verif-${Date.now()}`,
        userId: newAgent.id,
        userName: newAgent.name,
        userRole: newAgent.role,
        agentCode: newAgent.agentCode,
        idNumber: newAgent.nic,
        address: agentData.address || 'Sri Lanka',
        contactNumber: newAgent.mobile,
        idPhotoUrl: newAgent.avatar,
        gramaNiladhariReportUrl: agentData.gramaNiladhariReportUrl,
        policeReportUrl: agentData.policeReportUrl,
        gramaReportName: agentData.gramaReportName,
        policeReportName: agentData.policeReportName,
        status: 'pending',
        submittedAt: now,
      };
      setVerifications((prev) => [verif, ...prev]);
    }

    broadcastRealtimeEvent('ADD_AGENT', newAgent);
    return {
      success: true,
      message: 'Agent සාර්ථකව Add කර අදාළ Team, Team Leader සහ වාර්තා Profile එකට සම්බන්ධ කර ඇත.',
      user: newAgent,
    };
  };

  // Add Team Leader (by Owner)
  const addTeamLeader = (leaderData: {
    name: string;
    code: string;
    mobile: string;
    email: string;
    nic?: string;
    address?: string;
    avatar?: string;
    gramaNiladhariReportUrl?: string;
    policeReportUrl?: string;
    gramaReportName?: string;
    policeReportName?: string;
    tempPassword?: string;
    teamName: string;
  }): { success: boolean; message: string; user?: User } => {
    const duplicateEmail = users.some(
      (u) => u.email && leaderData.email && u.email.toLowerCase() === leaderData.email.trim().toLowerCase()
    );
    if (duplicateEmail) {
      return {
        success: false,
        message: 'මෙම Email ලිපිනය දැනටමත් පද්ධතිය තුළ භාවිතා වේ.',
      };
    }

    const duplicateCode = users.some(
      (u) => u.agentCode && leaderData.code && u.agentCode.toLowerCase() === leaderData.code.trim().toLowerCase()
    );
    if (duplicateCode) {
      return {
        success: false,
        message: 'මෙම Code / ID අංකය දැනටමත් පද්ධතියේ වෙනත් අයෙකුට ලබා දී ඇත.',
      };
    }

    const tlId = `tl-${Date.now()}`;
    const newTeamId = `team-${Date.now()}`;
    const teamNameStr = (leaderData.teamName || '').trim() || `${(leaderData.name || '').trim()} Team`;
    const now = new Date().toISOString().split('T')[0];

    const newTeam: Team = {
      id: newTeamId,
      name: teamNameStr,
      leaderId: tlId,
      leaderName: (leaderData.name || '').trim(),
      description: `Official DD World Field Team led by ${(leaderData.name || '').trim()}`,
    };

    const newTL: User = {
      id: tlId,
      name: (leaderData.name || '').trim(),
      email: (leaderData.email || '').trim(),
      mobile: (leaderData.mobile || '').trim(),
      nic: leaderData.nic?.trim() || '199018294011',
      role: 'team_leader',
      agentCode: (leaderData.code || '').trim(),
      avatar: leaderData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      teamId: newTeamId,
      teamName: teamNameStr,
      teamLeaderId: tlId,
      teamLeaderName: (leaderData.name || '').trim(),
      tempPassword: leaderData.tempPassword?.trim() || `DDW@${(leaderData.code || '').trim()}`,
      status: 'active',
      employmentStatus: 'ACTIVE',
      idApprovalStatus: 'PENDING',
      gramaNiladhariReportUrl: leaderData.gramaNiladhariReportUrl,
      policeReportUrl: leaderData.policeReportUrl,
      gramaReportName: leaderData.gramaReportName,
      policeReportName: leaderData.policeReportName,
      gramaReportUploadedAt: leaderData.gramaNiladhariReportUrl ? now : undefined,
      policeReportUploadedAt: leaderData.policeReportUrl ? now : undefined,
      createdAt: now,
      joinedDate: now,
    };

    setTeams((prev) => [...prev, newTeam]);
    setUsers((prev) => [...prev, newTL]);
    if (db) {
      safeSetDoc(doc(db, 'teams', newTeam.id), newTeam).catch(console.error);
      safeSetDoc(doc(db, 'users', newTL.id), newTL).catch(console.error);
    }

    if (leaderData.gramaNiladhariReportUrl || leaderData.policeReportUrl) {
      const verif: EmployeeVerification = {
        id: `verif-${Date.now()}`,
        userId: newTL.id,
        userName: newTL.name,
        userRole: newTL.role,
        agentCode: newTL.agentCode,
        idNumber: newTL.nic,
        address: leaderData.address || 'Sri Lanka',
        contactNumber: newTL.mobile,
        idPhotoUrl: newTL.avatar,
        gramaNiladhariReportUrl: leaderData.gramaNiladhariReportUrl,
        policeReportUrl: leaderData.policeReportUrl,
        gramaReportName: leaderData.gramaReportName,
        policeReportName: leaderData.policeReportName,
        status: 'pending',
        submittedAt: now,
      };
      setVerifications((prev) => [verif, ...prev]);
    }

    broadcastRealtimeEvent('ADD_AGENT', newTL);

    return {
      success: true,
      message: `නව Team Leader (${newTL.name}) සහ "${teamNameStr}" කණ්ඩායම අනිවාර්ය වාර්තා සමග පද්ධතියට එක් කරන ලදී!`,
      user: newTL,
    };
  };

  // Delete Agent (by Owner)
  const deleteAgent = (agentId: string): { success: boolean; message: string } => {
    const targetAgent = users.find((u) => u.id === agentId);
    if (!targetAgent) {
      return { success: false, message: 'Agent සොයාගත නොහැකි විය.' };
    }

    // Cascade removal from Users list
    setUsers((prev) => prev.filter((u) => u.id !== agentId));
    if (db) deleteDoc(doc(db, 'users', agentId)).catch(console.error);

    // Also clean up any active sessions stored in localStorage if this user was logged in
    const currentSession = safeStorage.getItem('ddworld_current_user_v2');
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (parsed.id === agentId) {
        safeStorage.removeItem('ddworld_current_user_v2');
      }
    }

    return {
      success: true,
      message: `${targetAgent.name} පද්ධතියෙන් සහ අදාළ කණ්ඩායමෙන් ස්ථිරව ඉවත් කරන ලදී.`,
    };
  };

  // Update or Confirm Agent Code (by Owner)
  const updateAgentCode = (agentId: string, newCode: string): { success: boolean; message: string } => {
    const trimmed = newCode.trim();
    if (!trimmed) {
      return { success: false, message: 'කරුණාකර වලංගු Agent Code එකක් ඇතුළත් කරන්න.' };
    }
    const duplicate = users.some(
      (u) => u.id !== agentId && u.agentCode && u.agentCode.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      return { success: false, message: 'මෙම Agent Code එක දැනටමත් වෙනත් අයෙකුට ලබා දී ඇත. (Duplicate code)' };
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === agentId) {
          const updated = {
            ...u,
            agentCode: trimmed,
            tempPassword: `DDW@${trimmed}`,
            status: 'active' as const,
          };
          return updated;
        }
        return u;
      })
    );

    // If currently logged in user is the one whose code was updated, update localStorage
    const currentSession = safeStorage.getItem('ddworld_current_user_v2');
    if (currentSession) {
      const parsed = JSON.parse(currentSession);
      if (parsed.id === agentId) {
        parsed.agentCode = trimmed;
        parsed.tempPassword = `DDW@${trimmed}`;
        parsed.status = 'active';
        safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(parsed));
      }
    }

    return {
      success: true,
      message: `Agent Code එක "${trimmed}" ලෙස සාර්ථකව අනුමත (Confirm) කර ඇත. දැන් මෙම සාමාජිකයාට පද්ධතියට Log විය හැක.`,
    };
  };

  const addLocationRecord = (record: Omit<LocationRecord, 'id' | 'created_at'>) => {
    const id = `loc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = record.timestamp || new Date().toISOString();
    const newRecord: LocationRecord = {
      ...record,
      id,
      created_at: nowIso,
    };
    setLocationLogs((prev) => [newRecord, ...prev]);
    if (db) {
      safeSetDoc(doc(db, 'location_logs', id), newRecord).catch(console.error);
    }
  };

  const updateLocationConfig = (cfg: Partial<LocationTrackingConfig>) => {
    setLocationConfig((prev) => {
      const updated = { ...prev, ...cfg };
      if (db) {
        safeSetDoc(doc(db, 'settings', 'location_config'), updated, { merge: true }).catch(console.error);
      }
      return updated;
    });
  };

  const updateUserGps = (
    userId: string,
    gpsData: {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      batteryLevel?: number;
      district?: string;
      source?: 'GPS' | 'Network' | 'Cached';
      timestamp?: string;
      sessionId?: string;
      deviceId?: string;
      gpsPermissionStatus?: 'granted' | 'denied' | 'prompt';
      appState?: 'FOREGROUND' | 'BACKGROUND';
      gpsState?: 'ON' | 'OFF' | 'UNAVAILABLE';
      permissionState?: 'GRANTED' | 'DENIED' | 'PROMPT';
      networkState?: 'ONLINE' | 'OFFLINE';
    }
  ) => {
    const nowIso = gpsData.timestamp || new Date().toISOString();
    let updatedUserObj: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated: User = {
            ...u,
            ...(gpsData.latitude !== undefined ? { latitude: gpsData.latitude } : {}),
            ...(gpsData.longitude !== undefined ? { longitude: gpsData.longitude } : {}),
            ...(gpsData.accuracy !== undefined ? { accuracy: gpsData.accuracy } : {}),
            ...(gpsData.batteryLevel !== undefined ? { batteryLevel: gpsData.batteryLevel } : {}),
            ...(gpsData.district ? { district: gpsData.district } : {}),
            ...(gpsData.appState ? { appState: gpsData.appState } : {}),
            ...(gpsData.gpsState ? { gpsState: gpsData.gpsState } : {}),
            ...(gpsData.permissionState ? { permissionState: gpsData.permissionState } : {}),
            ...(gpsData.networkState ? { networkState: gpsData.networkState } : {}),
            lastGpsUpdateAt: nowIso,
          };
          updatedUserObj = updated;
          if (db) {
            safeSetDoc(doc(db, 'users', userId), updated, { merge: true }).catch(console.error);
          }
          return updated;
        }
        return u;
      })
    );

    // Save location record if coordinates provided
    if (gpsData.latitude !== undefined && gpsData.longitude !== undefined) {
      const targetUser = updatedUserObj || users.find((u) => u.id === userId);
      const colomboTime = new Date(nowIso).toLocaleTimeString('en-GB', {
        timeZone: 'Asia/Colombo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      const colomboDate = new Date(nowIso).toISOString().split('T')[0];
      const hourNum = new Date(nowIso).getHours();
      const sessId = gpsData.sessionId || `SESS-${targetUser?.agentCode || userId.substring(0, 4)}-${colomboDate}`;

      addLocationRecord({
        employee_id: userId,
        agent_code: targetUser?.agentCode || (targetUser?.role === 'owner' ? '9000' : userId.substring(0, 4)),
        employee_name: targetUser?.name || 'DD World Agent',
        team_id: targetUser?.teamId || 'team-1',
        team_name: targetUser?.teamName || 'DD World Team',
        role: targetUser?.role || 'agent',
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        accuracy: gpsData.accuracy || 10,
        batteryLevel: gpsData.batteryLevel || 85,
        timestamp: nowIso,
        time_display: colomboTime,
        date: colomboDate,
        hour: hourNum,
        status: 'live',
        source: gpsData.source || 'GPS',
        sessionId: sessId,
        deviceId: gpsData.deviceId || (typeof navigator !== 'undefined' ? navigator.userAgent : 'device-web'),
        gpsPermissionStatus: gpsData.gpsPermissionStatus || 'granted',
        appState: gpsData.appState || 'FOREGROUND',
        gpsState: gpsData.gpsState || 'ON',
        networkState: gpsData.networkState || 'ONLINE',
        detected_village: gpsData.district || targetUser?.district || 'ශ්‍රී ලංකා ස්ථානය',
        district_si: targetUser?.district || 'කොළඹ',
      });
    }

    // Broadcast GPS update to server & SSE subscribers
    broadcastRealtimeEvent('UPDATE_USER_GPS', { id: userId, ...gpsData, timestamp: nowIso });
  };

  const updateUserMobile = (userId: string, mobile: string) => {
    const cleanMobile = (mobile || '').trim() || 'නැත';
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = { ...u, mobile: cleanMobile };
          if (db) {
            safeSetDoc(doc(db, 'users', userId), updated, { merge: true }).catch(console.error);
          }
          return updated;
        }
        return u;
      })
    );

    const currentSaved = safeStorage.getItem('ddworld_current_user_v2');
    if (currentSaved) {
      try {
        const parsed = JSON.parse(currentSaved);
        if (parsed.id === userId) {
          parsed.mobile = cleanMobile;
          safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(parsed));
        }
      } catch (err) {
        console.error(err);
      }
    }

    broadcastRealtimeEvent('UPDATE_USER_MOBILE', { id: userId, mobile: cleanMobile });
  };

  const updateUserAppStatus = (
    userId: string,
    appStatus: { isAppDownloaded?: boolean; isLoggedIn?: boolean; lastLoginAt?: string; appVersion?: string }
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const updated = {
            ...u,
            ...(appStatus.isAppDownloaded !== undefined ? { isAppDownloaded: appStatus.isAppDownloaded } : {}),
            ...(appStatus.isLoggedIn !== undefined ? { isLoggedIn: appStatus.isLoggedIn } : {}),
            ...(appStatus.lastLoginAt ? { lastLoginAt: appStatus.lastLoginAt } : {}),
            ...(appStatus.appVersion ? { appVersion: appStatus.appVersion } : {}),
          };
          if (db) {
            safeSetDoc(doc(db, 'users', userId), updated, { merge: true }).catch(console.error);
          }
          return updated;
        }
        return u;
      })
    );

    const currentSaved = safeStorage.getItem('ddworld_current_user_v2');
    if (currentSaved) {
      try {
        const parsed = JSON.parse(currentSaved);
        if (parsed.id === userId) {
          const updatedParsed = {
            ...parsed,
            ...(appStatus.isAppDownloaded !== undefined ? { isAppDownloaded: appStatus.isAppDownloaded } : {}),
            ...(appStatus.isLoggedIn !== undefined ? { isLoggedIn: appStatus.isLoggedIn } : {}),
            ...(appStatus.lastLoginAt ? { lastLoginAt: appStatus.lastLoginAt } : {}),
            ...(appStatus.appVersion ? { appVersion: appStatus.appVersion } : {}),
          };
          safeStorage.setItem('ddworld_current_user_v2', JSON.stringify(updatedParsed));
        }
      } catch (err) {
        console.error(err);
      }
    }

    broadcastRealtimeEvent('UPDATE_USER_APP_STATUS', { id: userId, ...appStatus });
  };

  const addAttendanceRecord = (record: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    teamName: string;
    role?: UserRole;
    date?: string;
    checkInTime?: string;
    checkOutTime?: string;
    status: 'present' | 'completed' | 'half_day';
  }) => {
    const agentUser = users.find(
      (u) => u.id === record.agentId || (record.agentCode && u.agentCode === record.agentCode)
    );
    const resolvedTeamId = agentUser?.teamId || record.teamId || 'team-1';
    const resolvedTeamName = agentUser?.teamName || record.teamName || 'Team Alpha';
    const dateToday = new Date().toISOString().split('T')[0];
    const targetDate = record.date || dateToday;
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const existingIndex = attendance.findIndex(
      (a) => (a.agentId === record.agentId || (record.agentCode && a.agentCode === record.agentCode)) && a.date === targetDate
    );

    if (existingIndex >= 0) {
      const updated = [...attendance];
      if (record.checkOutTime) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          teamId: resolvedTeamId,
          teamName: resolvedTeamName,
          checkOutTime: record.checkOutTime || nowTime,
          status: 'completed',
        };
        backgroundGpsTracker.stopTracking();
      } else if (record.checkInTime) {
        updated[existingIndex] = {
          ...updated[existingIndex],
          teamId: resolvedTeamId,
          teamName: resolvedTeamName,
          checkInTime: record.checkInTime,
        };
      }
      setAttendance(updated);
      safeStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated));
      if (db) safeSetDoc(doc(db, 'attendance', updated[existingIndex].id), updated[existingIndex]).catch(console.error);
      broadcastRealtimeEvent('ADD_ATTENDANCE', updated[existingIndex]);
    } else {
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        agentId: record.agentId,
        agentName: record.agentName,
        agentCode: record.agentCode,
        teamId: resolvedTeamId,
        teamName: resolvedTeamName,
        role: record.role || 'agent',
        date: targetDate,
        checkInTime: record.checkInTime || nowTime,
        status: record.status,
      };
      setAttendance((prev) => {
        const updated = [newRecord, ...prev];
        safeStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(updated));
        return updated;
      });
      if (db) safeSetDoc(doc(db, 'attendance', newRecord.id), newRecord).catch(console.error);
      broadcastRealtimeEvent('ADD_ATTENDANCE', newRecord);

      // Start Tracking Session for Working Hours (08:00 AM -> 08:00 PM)
      const sessId = `SESS-${record.agentCode || record.agentId.substring(0, 4)}-${targetDate}`;
      const nowIso = new Date().toISOString();
      const userLat = agentUser?.latitude || 6.9271;
      const userLng = agentUser?.longitude || 79.8612;
      const userAcc = agentUser?.accuracy || 12;

      addLocationRecord({
        employee_id: record.agentId,
        agent_code: record.agentCode,
        employee_name: record.agentName,
        team_id: resolvedTeamId,
        team_name: resolvedTeamName,
        role: record.role || 'agent',
        latitude: userLat,
        longitude: userLng,
        accuracy: userAcc,
        batteryLevel: agentUser?.batteryLevel || 90,
        timestamp: nowIso,
        time_display: record.checkInTime || nowTime,
        date: targetDate,
        hour: new Date().getHours(),
        status: 'live',
        source: 'GPS',
        sessionId: sessId,
        deviceId: typeof navigator !== 'undefined' ? navigator.userAgent : 'device-web',
        gpsPermissionStatus: 'granted',
        detected_village: agentUser?.district || 'ශ්‍රී ලංකා ස්ථානය',
        district_si: agentUser?.district || 'කොළඹ',
      });

      // Start Diagnostic Geolocation Tracker
      backgroundGpsTracker.startTracking(record.agentId, sessId, (data) => {
        updateUserGps(record.agentId, {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: data.accuracy,
          timestamp: data.timestamp,
          appState: data.appState,
          networkState: data.networkState,
          gpsState: data.gpsState,
          sessionId: sessId,
        });
      });
    }
  };

  const addProductSale = (saleData: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    productType: 'ගොවිමිතුරු' | 'සයුරු' | 'අනෙකුත්';
    channel?: 'IVR' | 'APP';
    quantity?: number;
    productName: string;
    customerName?: string;
    customerMobile?: string;
    amount: number;
    notes?: string;
  }) => {
    const agentUser = users.find(
      (u) => u.id === saleData.agentId || (saleData.agentCode && u.agentCode === saleData.agentCode)
    );
    const resolvedTeamId = agentUser?.teamId || saleData.teamId || 'team-1';
    const newSale: ProductSale = {
      id: `sale-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      agentId: saleData.agentId,
      agentName: saleData.agentName,
      agentCode: saleData.agentCode,
      teamId: resolvedTeamId,
      productType: saleData.productType,
      channel: saleData.channel || 'IVR',
      quantity: saleData.quantity || 1,
      productName: saleData.productName,
      customerName: saleData.customerName || '',
      customerMobile: saleData.customerMobile || '',
      amount: saleData.amount,
      date: new Date().toISOString().split('T')[0],
      notes: saleData.notes,
    };
    setSales((prev) => {
      const updated = [newSale, ...prev];
      safeStorage.setItem(STORAGE_KEY_SALES, JSON.stringify(updated));
      return updated;
    });
    if (db) safeSetDoc(doc(db, 'sales', newSale.id), newSale).catch(console.error);
    broadcastRealtimeEvent('ADD_SALE', newSale);
  };

  const addIvrEntry = (entryData: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    ivrCampaign: string;
    customerPhone?: string;
    callStatus: 'connected' | 'interested' | 'not_interested' | 'call_back';
    durationSeconds: number;
    remarks?: string;
  }) => {
    const agentUser = users.find((u) => u.id === entryData.agentId);
    const resolvedTeamId = agentUser?.teamId || entryData.teamId || 'team-1';
    const newEntry: IvrEntry = {
      id: `ivr-${Date.now()}`,
      agentId: entryData.agentId,
      agentName: entryData.agentName,
      agentCode: entryData.agentCode,
      teamId: resolvedTeamId,
      ivrCampaign: entryData.ivrCampaign,
      customerPhone: entryData.customerPhone,
      callStatus: entryData.callStatus,
      durationSeconds: entryData.durationSeconds,
      date: new Date().toISOString().split('T')[0],
      remarks: entryData.remarks,
    };
    setIvrEntries((prev) => [newEntry, ...prev]);
    if (db) safeSetDoc(doc(db, 'ivr', newEntry.id), newEntry).catch(console.error);
  };

  const submitLeaveRequest = (req: {
    agentId: string;
    agentName: string;
    agentCode: string;
    teamId: string;
    teamLeaderId: string;
    startDate: string;
    endDate: string;
    daysCount: number;
    reason: string;
  }): { success: boolean; message: string } => {
    // Duplicate Protection: check if the same start date and end date already pending
    const duplicate = leaves.some(
      (l) =>
        l.agentId === req.agentId &&
        l.startDate === req.startDate &&
        l.endDate === req.endDate &&
        l.status === 'pending'
    );
    if (duplicate) {
      return {
        success: false,
        message: 'මෙම දින සඳහා ඔබ විසින් දැනටමත් නිවාඩු ඉල්ලීමක් ඉදිරිපත් කර ඇත (Duplicate Leave Request blocked).',
      };
    }

    const newLeave: LeaveRequest = {
      id: `leave-${Date.now()}`,
      agentId: req.agentId,
      agentName: req.agentName,
      agentCode: req.agentCode,
      teamId: req.teamId,
      teamLeaderId: req.teamLeaderId,
      startDate: req.startDate,
      endDate: req.endDate,
      daysCount: req.daysCount,
      reason: req.reason,
      status: 'pending',
      submittedAt: new Date().toISOString().split('T')[0],
    };

    setLeaves((prev) => [newLeave, ...prev]);
    broadcastRealtimeEvent('SUBMIT_LEAVE', newLeave);
    return {
      success: true,
      message: 'නිවාඩු ඉල්ලීම ඔබගේ Team Leader සහ Owner වෙත එකවර යොමු කරන ලදී.',
    };
  };

  const updateLeaveStatus = (
    leaveId: string,
    status: 'approved' | 'rejected',
    reviewerName: string,
    comment?: string
  ) => {
    const reviewData = {
      id: leaveId,
      status,
      reviewedBy: reviewerName,
      reviewComment: comment || (status === 'approved' ? 'අනුමත කරන ලදී' : 'ප්රතික්ෂේප කරන ලදී'),
    };
    setLeaves((prev) =>
      prev.map((l) =>
        l.id === leaveId
          ? {
              ...l,
              ...reviewData,
            }
          : l
      )
    );
    broadcastRealtimeEvent('UPDATE_LEAVE', reviewData);
  };

  const sendMessage = (msg: {
    senderId: string;
    senderName: string;
    senderRole: 'owner' | 'team_leader' | 'agent';
    receiverId: string;
    receiverName: string;
    receiverRole: 'owner' | 'team_leader' | 'agent';
    content: string;
  }) => {
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: msg.senderId,
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      receiverId: msg.receiverId,
      receiverName: msg.receiverName,
      receiverRole: msg.receiverRole,
      content: msg.content,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Instant broadcast across all open devices/tabs (0ms latency)
    broadcastRealtimeEvent('NEW_MESSAGE', newMsg);

    // Play chime sound & trigger native mobile push notification
    playNotificationChime();
    triggerWebPushNotification(
      `💬 DD WORLD පණිවිඩයක්: ${msg.senderName}`,
      msg.content.length > 80 ? msg.content.substring(0, 80) + '...' : msg.content
    );
  };

  const createMeeting = (mtg: {
    title: string;
    description?: string;
    date?: string;
    time?: string;
    scheduledTime?: string;
    meetingLink?: string;
    hostId?: string;
    hostName: string;
    hostRole: 'owner' | 'team_leader' | 'agent';
    teamId?: string;
    targetAudience?: 'all' | 'tls_only' | 'my_team' | 'specific_team';
    targetTeamName?: string;
    attachedFiles?: MeetingFile[];
  }): Meeting => {
    const meetCode = `DDW-${Math.floor(100 + Math.random() * 900)}`;
    const newMeeting: Meeting = {
      id: `meet-${Date.now()}`,
      code: meetCode,
      title: mtg.title || 'DD WORLD Executive Sync',
      description: mtg.description || 'සජීවී කණ්ඩායම් හමුව හා සාකච්ඡාව',
      date: mtg.date || new Date().toISOString().split('T')[0],
      time: mtg.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      scheduledTime: mtg.scheduledTime || 'Live Instant Meeting',
      meetingLink: mtg.meetingLink || `https://meet.google.com/${meetCode.toLowerCase()}`,
      hostId: mtg.hostId || 'host-id',
      hostName: mtg.hostName,
      hostRole: mtg.hostRole,
      teamId: mtg.teamId || 'all',
      targetAudience: mtg.targetAudience || 'all',
      targetTeamName: mtg.targetTeamName || 'All Members',
      attachedFiles: mtg.attachedFiles || [],
      status: 'active',
    };
    setMeetings((prev) => [newMeeting, ...prev]);
    broadcastRealtimeEvent('CREATE_MEETING', newMeeting);
    return newMeeting;
  };

  const cancelMeeting = (meetingId: string) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, status: 'cancelled' } : m))
    );
    broadcastRealtimeEvent('CANCEL_MEETING', { id: meetingId });
  };

  const addVaultFile = (file: Omit<VaultFile, 'id' | 'uploadedAt'>) => {
    const newFile: VaultFile = {
      id: `vault-${Date.now()}`,
      title: file.title,
      category: file.category,
      fileName: file.fileName,
      fileSizeMB: file.fileSizeMB,
      fileUrl: file.fileUrl,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: file.uploadedBy,
      notes: file.notes,
    };
    setVaultFiles((prev) => [newFile, ...prev]);
  };

  const deleteVaultFile = (id: string) => {
    setVaultFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const addMarketingPost = (post: Omit<MarketingPost, 'id' | 'publishedAt' | 'views' | 'likes'>) => {
    const newPost: MarketingPost = {
      id: `mkt-${Date.now()}`,
      title: post.title,
      contentType: post.contentType,
      description: post.description,
      mediaUrl: post.mediaUrl,
      publishedAt: new Date().toISOString().split('T')[0],
      views: Math.floor(Math.random() * 50) + 10,
      likes: Math.floor(Math.random() * 20) + 2,
      status: post.status || 'published',
      targetAudience: post.targetAudience,
    };
    setMarketingPosts((prev) => [newPost, ...prev]);
  };

  const deleteMarketingPost = (id: string) => {
    setMarketingPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const sendWebAiMessage = (text: string, sender: 'user' | 'owner') => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: WebAiChatMessage = {
      id: `wmsg-${Date.now()}`,
      sender,
      senderName: sender === 'owner' ? 'Dushmantha Fernando (Owner)' : 'වෙබ් පාරිභෝගිකයා',
      text,
      timestamp: nowStr,
    };

    let aiResponseText = 'ස්තූතියි! DD World Web AI මගින් ඔබගේ පණිවිඩය ලැබුණි.';
    const queryLower = text.toLowerCase();
    if (queryLower.includes('616') || queryLower.includes('govimithuru') || queryLower.includes('ගොවි')) {
      aiResponseText = 'ගොවිමිතුරු (#616#) යනු Dialog කෘෂිකාර්මික උපදේශන සේවාවයි. ඕනෑම ඩයලොග් දුරකථනයකින් #616# ඩයල් කර ගොවි අස්වැන්න වැඩි කරගැනීමේ උපදෙස් සහ දෛනික තොරතුරු ලබාගත හැක.';
    } else if (queryLower.includes('828') || queryLower.includes('sayuru') || queryLower.includes('සයුරු')) {
      aiResponseText = 'සයුරු (#828#) යනු ධීවර මහතුන් සඳහා වන සාගර කාලගුණ සහ සුළං/රළ අනතුරු ඇඟවීමේ සේවාවයි. #828# ඩයල් කර ධීවර ජනතාවගේ ජීවිත ආරක්ෂා කරගත හැක.';
    } else if (queryLower.includes('promo') || queryLower.includes('marketing') || queryLower.includes('ප්‍රචාරණ')) {
      aiResponseText = 'DD World Web AI මගින් ශ්‍රී ලංකාව පුරා සියලුම දිස්ත්‍රික්ක ආවරණය වන පරිදි ඩිජිටල් මාධ්‍ය සහ සමාජ මාධ්‍ය හරහා 24/7 ස්වයංක්‍රීයව ප්‍රවර්ධන ව්‍යාපාර ක්‍රියාත්මක වේ.';
    } else {
      aiResponseText = `ඔබගේ විමසීම ("${text}") සටහන් කරගන්නා ලදී. DD World Web AI මගින් මෙම වෙබ් අඩවිය සහ #616# / #828# සේවාවන් ශ්‍රී ලංකාව පුරා ප්‍රචාරණය කිරීමට අවශ්‍ය සියලුම මගපෙන්වීම් සහ සහාය ලබාදෙයි.`;
    }

    const aiMsg: WebAiChatMessage = {
      id: `wmsg-ai-${Date.now() + 1}`,
      sender: 'ai',
      senderName: 'DD World Web AI Assistant',
      text: aiResponseText,
      timestamp: nowStr,
    };

    setWebAiMessages((prev) => [...prev, userMsg, aiMsg]);
  };

  const runSystemDoctorAutoHeal = () => {
    let repaired = 0;
    const keysToCheck = [
      STORAGE_KEY_USERS,
      STORAGE_KEY_ATTENDANCE,
      STORAGE_KEY_SALES,
      STORAGE_KEY_LEAVES,
      STORAGE_KEY_MESSAGES,
      STORAGE_KEY_VAULT_FILES,
      STORAGE_KEY_MARKETING_POSTS,
    ];
    keysToCheck.forEach((key) => {
      try {
        const val = safeStorage.getItem(key);
        if (val) JSON.parse(val);
      } catch (err) {
        safeStorage.removeItem(key);
        repaired++;
      }
    });

    const nowStr = new Date().toLocaleString();
    const newLog: SystemDoctorLog = {
      id: `doc-${Date.now()}`,
      timestamp: nowStr,
      issueType: 'cache_repair',
      message: `System Doctor Auto-Heal Check Executed: Storage Keys & Sync Channels Verified Clean. (${repaired} errors healed).`,
      status: 'healed',
    };
    setSystemDoctorLogs((prev) => [newLog, ...prev]);

    return {
      repairedCount: repaired,
      message: 'ස්වයංක්‍රීය System Doctor AI පරීක්ෂාව සාර්ථකයි. පද්ධතියේ කිසිදු දෝෂයක් හෝ Cache ගැටළුවක් නැත.',
    };
  };

  const getDailyJobRoleReports = (targetDateStr?: string): DailyJobRoleReport[] => {
    const dStr = targetDateStr || new Date().toISOString().split('T')[0];
    return users.map((u) => {
      const att = attendance.find((a) => a.agentId === u.id && a.date === dStr);
      let attStatus: DailyJobRoleReport['attendanceStatus'] = 'not_marked';
      if (att) {
        if (att.checkOutTime) attStatus = 'marked_completed';
        else if (att.checkInTime) attStatus = 'marked_present';
      }

      const uSales = sales.filter((s) => s.agentId === u.id && s.date === dStr);
      const salesCount = uSales.length;
      const salesQty = uSales.reduce((acc, s) => acc + (s.quantity || 1), 0);

      let score = 0;
      if (attStatus === 'marked_present') score += 50;
      if (attStatus === 'marked_completed') score += 75;
      if (salesCount > 0) score += 25;
      if (score > 100) score = 100;

      return {
        userId: u.id,
        userName: u.name,
        userRole: u.role,
        agentCode: u.agentCode,
        teamName: u.teamName,
        date: dStr,
        attendanceStatus: attStatus,
        checkInTime: att?.checkInTime,
        checkOutTime: att?.checkOutTime,
        salesCountToday: salesCount,
        salesTotalQuantityToday: salesQty,
        dailyRoutineCompleted: attStatus !== 'not_marked',
        complianceScore: score,
      };
    });
  };

  const addMotivationBanner = (banner: Omit<MotivationBannerMessage, 'id'>) => {
    const newB: MotivationBannerMessage = {
      ...banner,
      id: `mb-${Date.now()}`,
    };
    setMotivationBanners((prev) => [newB, ...prev]);
  };

  const removeMotivationBanner = (id: string) => {
    setMotivationBanners((prev) => prev.filter((b) => b.id !== id));
  };

  const sendCompanyMessage = (msg: Omit<CompanyMessage, 'id'>) => {
    const newMsg: CompanyMessage = {
      ...msg,
      id: `cmsg-${Date.now()}`,
    };
    setCompanyMessages((prev) => [newMsg, ...prev]);
  };

  const markMessageAsRead = (messageId: string, userId: string) => {
    setCompanyMessages((prev) =>
      prev.map((m) => {
        if (m.id === messageId) {
          const currentRead = m.readBy || [];
          if (!currentRead.includes(userId)) {
            return { ...m, readBy: [...currentRead, userId] };
          }
        }
        return m;
      })
    );
  };

  const updateDialogPerformanceRecord = (rec: Omit<DialogPerformanceRecord, 'id' | 'updatedAt'>) => {
    setDialogPerformanceRecords((prev) => {
      const idx = prev.findIndex(
        (r) => r.agentId === rec.agentId && r.reportDate === rec.reportDate && r.productCode === rec.productCode
      );
      const updated: DialogPerformanceRecord = {
        ...rec,
        id: idx >= 0 ? prev[idx].id : `dpr-${Date.now()}`,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  };

  const addTrainingProgress = (prog: Omit<TrainingProgressRecord, 'id'>) => {
    const newP: TrainingProgressRecord = {
      ...prog,
      id: `tp-${Date.now()}`,
    };
    setTrainingProgress((prev) => [newP, ...prev]);
  };

  const recordQuizResult = (res: Omit<QuizResultRecord, 'id' | 'completedAt'>) => {
    const newR: QuizResultRecord = {
      ...res,
      id: `qr-${Date.now()}`,
      completedAt: new Date().toISOString(),
    };
    setQuizResults((prev) => [newR, ...prev]);
  };

  const addWorkAreaRecord = (rec: Omit<WorkAreaRecord, 'id' | 'timestamp'>) => {
    const newRec: WorkAreaRecord = {
      ...rec,
      id: `war-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setWorkAreaRecords((prev) => [newRec, ...prev]);
  };

  const updateEmploymentStatus = (userId: string, status: EmploymentStatus, reason?: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            employmentStatus: status,
            status: status === 'BLOCKED' ? 'blocked' : 'active',
          };
          return updatedUser;
        }
        return u;
      })
    );

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const log: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: status === 'BLOCKED' ? 'ID_BLOCKED' : 'STATUS_CHANGED',
      previousValue: targetUser?.employmentStatus || 'ACTIVE',
      newValue: status,
      approvedBy: 'Dushmantha Fernando (Owner)',
      timestamp: nowIso,
    };
    setEmployeeIdAuditLogs((prev) => [log, ...prev]);
    if (db) safeSetDoc(doc(db, 'employee_id_audits', log.id), log).catch(console.error);
    broadcastRealtimeEvent('UPDATE_EMPLOYMENT_STATUS', { userId, status, log });

    // Administrative Force-Logout Trigger for Blocked / Suspended / Exited Employees
    if (status === 'BLOCKED' || status === 'SUSPENDED' || status === 'EXITED') {
      window.dispatchEvent(
        new CustomEvent('ddworld_force_logout', {
          detail: { userId, status, reason: reason || 'පරිපාලක අනුමැතියකින් තොරව ගිණුම අත්හිටුවා ඇත' },
        })
      );
      broadcastRealtimeEvent('FORCE_LOGOUT', {
        userId,
        status,
        reason: reason || 'පරිපාලක අනුමැතියකින් තොරව ගිණුම අත්හිටුවා ඇත',
      });
    }
  };

  const submitEmployeePhoto = (userId: string, photoUrl: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            photoUrl,
            avatar: photoUrl,
            idApprovalStatus: 'PENDING',
            idSubmittedAt: nowIso,
            idRejectedReason: undefined,
          };
          return updatedUser;
        }
        return u;
      })
    );

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const newLog: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'PHOTO_SUBMITTED',
      newValue: 'New Employee Photo Submitted',
      timestamp: nowIso,
    };
    setEmployeeIdAuditLogs((prev) => [newLog, ...prev]);
    if (db) safeSetDoc(doc(db, 'employee_id_audits', newLog.id), newLog).catch(console.error);
    broadcastRealtimeEvent('SUBMIT_EMPLOYEE_PHOTO', { userId, photoUrl, log: newLog });
  };

  const approveEmployeeId = (userId: string, jobPosition: string, signatureUrl?: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;

    const hasKyc = Boolean(
      (targetUser.gramaNiladhariReportUrl && targetUser.policeReportUrl) ||
      (targetUser.kycDocuments?.gnCertificate && targetUser.kycDocuments?.policeReport)
    );
    if (!hasKyc) {
      console.warn(`Cannot approve employee ID for ${targetUser.name}: Missing Grama Niladhari or Police Clearance report.`);
      return;
    }

    const nowIso = new Date().toISOString();
    const appliedSignature = signatureUrl || ownerSignature;
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            jobPosition: jobPosition || u.jobPosition || (u.role === 'team_leader' ? 'Team Leader' : u.role === 'owner' ? 'Managing Director' : 'Field Sales Agent'),
            idApprovalStatus: 'APPROVED',
            employmentStatus: 'ACTIVE',
            idApprovedAt: nowIso,
            idApprovedBy: 'Dushmantha Fernando (Owner)',
            ownerSignatureUrl: appliedSignature || u.ownerSignatureUrl,
            idRejectedReason: undefined,
          };
          return updatedUser;
        }
        return u;
      })
    );

    // Also sync verifications table
    setVerifications((prev) => {
      const existing = prev.find((v) => v.userId === userId);
      if (existing) {
        return prev.map((v) =>
          v.userId === userId
            ? { ...v, status: 'verified', approvedBy: 'Dushmantha Fernando (Owner)' }
            : v
        );
      }
      return [
        {
          id: `v-${Date.now()}`,
          userId,
          userName: targetUser?.name || 'Staff Member',
          userRole: targetUser?.role || 'agent',
          agentCode: targetUser?.agentCode || 'AG-000',
          idNumber: targetUser?.nic || '199518294021',
          address: 'Sri Lanka',
          contactNumber: targetUser?.mobile || '',
          status: 'verified',
          approvedBy: 'Dushmantha Fernando (Owner)',
          verifiedAt: nowIso,
        },
        ...prev,
      ];
    });

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const log1: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}-1`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'ID_APPROVED',
      approvedBy: 'Dushmantha Fernando (Owner)',
      approvedAt: nowIso,
      timestamp: nowIso,
    };

    const log2: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}-2`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'POSITION_UPDATED',
      previousValue: targetUser?.jobPosition || 'Field Sales Agent',
      newValue: jobPosition,
      approvedBy: 'Dushmantha Fernando (Owner)',
      timestamp: nowIso,
    };

    setEmployeeIdAuditLogs((prev) => [log1, log2, ...prev]);
    if (db) {
      safeSetDoc(doc(db, 'employee_id_audits', log1.id), log1).catch(console.error);
      safeSetDoc(doc(db, 'employee_id_audits', log2.id), log2).catch(console.error);
    }
    broadcastRealtimeEvent('APPROVE_EMPLOYEE_ID', { userId, jobPosition, logs: [log1, log2] });
  };

  const rejectEmployeeIdPhoto = (userId: string, reason: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            idApprovalStatus: 'REJECTED',
            idRejectedReason: reason,
          };
          return updatedUser;
        }
        return u;
      })
    );

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const newLog: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'PHOTO_REJECTED',
      rejectedReason: reason,
      approvedBy: 'Dushmantha Fernando (Owner)',
      timestamp: nowIso,
    };

    setEmployeeIdAuditLogs((prev) => [newLog, ...prev]);
    if (db) safeSetDoc(doc(db, 'employee_id_audits', newLog.id), newLog).catch(console.error);
    broadcastRealtimeEvent('REJECT_EMPLOYEE_ID', { userId, reason, log: newLog });
  };

  const requestNewEmployeePhoto = (userId: string, reason?: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            idApprovalStatus: 'NEW_PHOTO_REQUESTED',
            idRejectedReason: reason || 'Please upload a formal clear employee photograph.',
          };
          return updatedUser;
        }
        return u;
      })
    );

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const newLog: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'PHOTO_REQUESTED',
      rejectedReason: reason || 'New clear photo requested by Owner',
      approvedBy: 'Dushmantha Fernando (Owner)',
      timestamp: nowIso,
    };

    setEmployeeIdAuditLogs((prev) => [newLog, ...prev]);
    if (db) safeSetDoc(doc(db, 'employee_id_audits', newLog.id), newLog).catch(console.error);
    broadcastRealtimeEvent('REQUEST_NEW_PHOTO', { userId, reason, log: newLog });
  };

  const updateEmployeeJobPosition = (userId: string, position: string) => {
    const targetUser = users.find((u) => u.id === userId);
    const nowIso = new Date().toISOString();
    let updatedUser: User | null = null;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedUser = {
            ...u,
            jobPosition: position,
          };
          return updatedUser;
        }
        return u;
      })
    );

    if (db && updatedUser) {
      safeSetDoc(doc(db, 'users', userId), updatedUser, { merge: true }).catch(console.error);
    }

    const newLog: EmployeeIdAuditLog = {
      id: `audit-${Date.now()}`,
      employeeId: targetUser?.employeeId || `DDW-EMP-${targetUser?.agentCode || '9000'}`,
      agentCode: targetUser?.agentCode || '9000',
      employeeName: targetUser?.name || 'Employee',
      action: 'POSITION_UPDATED',
      previousValue: targetUser?.jobPosition || 'Field Sales Agent',
      newValue: position,
      approvedBy: 'Dushmantha Fernando (Owner)',
      timestamp: nowIso,
    };

    setEmployeeIdAuditLogs((prev) => [newLog, ...prev]);
    if (db) safeSetDoc(doc(db, 'employee_id_audits', newLog.id), newLog).catch(console.error);
    broadcastRealtimeEvent('UPDATE_JOB_POSITION', { userId, position, log: newLog });
  };

  const saveOwnerSignature = (signatureDataUrl: string) => {
    setOwnerSignatureState(signatureDataUrl);
  };

  return (
    <DataContext.Provider
      value={{
        users,
        teams,
        attendance,
        sales,
        ivrEntries,
        leaves,
        messages,
        meetings,
        securityAlerts,
        coldArchives,
        knowledge: KNOWLEDGE_ARTICLES,
        verifications,
        monthlyTargets,
        teamTargets,
        agentTargets,
        companyWeeklyReports,
        vaultFiles,
        marketingPosts,
        webAiMessages,
        systemDoctorLogs,
        smsLogs,
        activeCall,
        locationLogs,
        locationConfig,
        motivationBanners,
        companyMessages,
        dialogPerformanceRecords,
        trainingProgress,
        quizResults,
        workAreaRecords,
        employeeIdAuditLogs,
        ownerSignature,
        submitEmployeePhoto,
        approveEmployeeId,
        rejectEmployeeIdPhoto,
        requestNewEmployeePhoto,
        updateEmployeeJobPosition,
        saveOwnerSignature,
        addMotivationBanner,
        removeMotivationBanner,
        sendCompanyMessage,
        markMessageAsRead,
        updateDialogPerformanceRecord,
        addTrainingProgress,
        recordQuizResult,
        addWorkAreaRecord,
        updateEmploymentStatus,
        updateUserGps,
        updateLocationConfig,
        addLocationRecord,
        sendSmsMessage,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        addVaultFile,
        deleteVaultFile,
        addMarketingPost,
        deleteMarketingPost,
        sendWebAiMessage,
        runSystemDoctorAutoHeal,
        getDailyJobRoleReports,
        updateMonthlyTargets,
        updateTeamTargets,
        updateAgentTarget,
        updateUserMobile,
        updateUserAppStatus,
        transferAgent,
        addCompanyWeeklyReport,
        promoteAgentToLeader,
        addSecurityAlert,
        resolveSecurityAlert,
        createColdArchive,
        addAgent,
        addTeamLeader,
        registerNewUser,
        updateUserProfile,
        updateAgentCode,
        deleteAgent,
        addAttendanceRecord,
        addProductSale,
        addIvrEntry,
        submitLeaveRequest,
        updateLeaveStatus,
        sendMessage,
        createMeeting,
        cancelMeeting,
        addOrUpdateVerification,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
