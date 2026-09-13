import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { backgroundGpsTracker } from '../utils/backgroundGpsTracker';
import { User, UserRole, Team, AttendanceRecord, ProductSale, IvrEntry, LeaveRequest, ChatMessage, Meeting, MeetingFile, KnowledgeArticle, EmployeeVerification, MonthlyProductTargets, TeamProductTargets, AgentProductTarget, CompanyWeeklyReport, VaultFile, MarketingPost, WebAiChatMessage, SystemDoctorLog, DailyJobRoleReport, CallSession, SmsLogRecord, LocationRecord, LocationTrackingConfig, MotivationBannerMessage, CompanyMessage, DialogPerformanceRecord, TrainingProgressRecord, QuizResultRecord, WorkAreaRecord, EmployeeIdAuditLog, ColdStorageArchive, SecurityAlert } from '../types';

export const isOwnerDoc = (user: any, targetId?: string): boolean => {
  if (!user && !targetId) return false;
  const id = user?.id || targetId;
  const role = user?.role;
  const email = String(user?.email || '').trim().toLowerCase();
  return id === 'owner-1' || targetId === 'owner-1' || role === 'owner' || role === 'MASTER_LEADER' || email === 'd.d.worldmarketing123@gmail.com' || email === 'owner@ddworld.local';
};

interface DataContextType {
  users: User[]; teams: Team[]; attendance: AttendanceRecord[]; sales: ProductSale[]; ivrEntries: IvrEntry[]; leaves: LeaveRequest[]; messages: ChatMessage[]; meetings: Meeting[]; securityAlerts: SecurityAlert[]; coldArchives: ColdStorageArchive[]; knowledge: KnowledgeArticle[]; verifications: EmployeeVerification[]; monthlyTargets: MonthlyProductTargets; teamTargets: TeamProductTargets[]; agentTargets: AgentProductTarget[]; companyWeeklyReports: CompanyWeeklyReport[]; vaultFiles: VaultFile[]; marketingPosts: MarketingPost[]; webAiMessages: WebAiChatMessage[]; systemDoctorLogs: SystemDoctorLog[]; smsLogs: SmsLogRecord[]; activeCall: CallSession | null; locationLogs: LocationRecord[]; locationConfig: LocationTrackingConfig; motivationBanners: MotivationBannerMessage[]; companyMessages: CompanyMessage[]; dialogPerformanceRecords: DialogPerformanceRecord[]; trainingProgress: TrainingProgressRecord[]; quizResults: QuizResultRecord[]; workAreas: WorkAreaRecord[]; employeeIdAuditLogs: EmployeeIdAuditLog[];
  sendMessage: (msg: { senderId:string; senderName:string; senderRole:UserRole; receiverId:string; receiverName:string; receiverRole:UserRole; content:string }) => void;
  [key: string]: any;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'users'), snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User)))),
      onSnapshot(collection(db, 'teams'), snap => setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)))),
      onSnapshot(collection(db, 'attendance'), snap => setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)))),
      onSnapshot(collection(db, 'sales'), snap => setSales(snap.docs.map(d => ({ id: d.id, ...d.data() } as ProductSale)))),
      onSnapshot(collection(db, 'messages'), snap => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)))),
    ];
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  const sendMessage = (msg: { senderId:string; senderName:string; senderRole:UserRole; receiverId:string; receiverName:string; receiverRole:UserRole; content:string }) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const payload: ChatMessage = { ...msg, id, timestamp: new Date().toISOString(), read: false };
    void setDoc(doc(db, 'messages', id), payload);
  };

  const value = { users, teams, attendance, sales, messages, sendMessage } as DataContextType;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
};
