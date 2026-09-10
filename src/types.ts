// DD World sales verification metadata is kept explicit so App Activation shares remain pending until confirmed.
import type { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
  mobile?: string;
  agentCode?: string;
  password?: string;
  teamId?: string;
  teamLeaderId?: string;
  teamName?: string;
  status?: string;
  isBlocked?: boolean;
  isSuspended?: boolean;
  employmentStatus?: EmploymentStatus;
  avatar?: string;
  nic?: string;
  address?: string;
  district?: string;
  assignedDistrict?: string;
  assignedVillage?: string;
  location?: UserLocation;
  lastLoginAt?: string;
  isAppDownloaded?: boolean;
  isLoggedIn?: boolean;
  appVersion?: string;
  joiningDate?: string;
  dateOfBirth?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  bankName?: string;
  bankAccount?: string;
  epfNumber?: string;
  etfNumber?: string;
  basicSalary?: number;
  allowance?: number;
  tempPassword?: string;
  createdAt?: string;
  updatedAt?: string;
  gramaNiladhariReportUrl?: string;
  policeReportUrl?: string;
  gramaReportName?: string;
  policeReportName?: string;
}

export type UserRole = 'owner' | 'team_leader' | 'agent' | 'MASTER_LEADER' | 'TEAM_SUPERVISOR' | 'FIELD_AGENT' | string;
export type EmploymentStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'EXITED' | string;

export interface UserLocation {
  latitude?: number;
  longitude?: number;
  district?: string;
  address?: string;
  accuracy?: number;
  updatedAt?: string;
  source?: string;
}

export interface AttendanceRecord {
  id: string;
  agentId: string;
  agentName: string;
  agentCode: string;
  teamId: string;
  teamName?: string;
  role?: UserRole;
  date: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'present' | 'completed' | 'half_day' | string;
  gpsLocation?: { lat: number; lng: number; address?: string };
  notes?: string;
}

export interface ProductSale {
  id: string;
  agentId: string;
  agentCode: string;
  agentName: string;
  teamId?: string;
  productType: 'govimithuru' | 'sayuru' | string;
  productName?: string;
  channel?: string;
  quantity?: number;
  msisdn?: string;
  customerName?: string;
  customerMobile?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  district?: string;
  saleDate?: string;
  date?: string;
  time?: string;
  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED' | string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | string;
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNote?: string;
  amount?: number;
  notes?: string;
  activationMethod?: 'KEYPAD_DIAL' | 'APP_LINK_SHARE' | 'MANUAL';
  dialCode?: string;
  appShareChannel?: 'WHATSAPP' | 'SMS' | 'QR' | 'DIRECT';
}

export interface IvrEntry {
  id: string;
  agentId: string;
  agentCode: string;
  agentName?: string;
  teamId?: string;
  ivrCampaign?: string;
  callDurationSeconds?: number;
  durationSeconds?: number;
  callerNumber?: string;
  customerPhone?: string;
  timestamp?: string;
  date?: string;
  callStatus?: string;
  status?: 'COMPLETED' | 'FAILED' | 'IN_PROGRESS' | string;
  notes?: string;
  remarks?: string;
}

export interface LeaveRequest {
  id: string;
  userId?: string;
  agentId?: string;
  agentCode?: string;
  agentName?: string;
  userName?: string;
  userRole?: UserRole;
  teamId?: string;
  teamLeaderId?: string;
  startDate: string;
  endDate: string;
  daysCount?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'pending' | 'approved' | 'rejected';
  appliedAt?: string;
  submittedAt?: string;
  reviewedBy?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole?: UserRole;
  receiverId?: string;
  receiverName?: string;
  receiverRole?: UserRole;
  teamId?: string;
  message?: string;
  content?: string;
  timestamp: string;
  read?: boolean;
  fileUrl?: string;
}

export interface MeetingFile { id: string; name: string; url: string; size?: number; }
export interface Meeting {
  id: string;
  code?: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  scheduledTime?: string;
  date?: string;
  time?: string;
  createdBy?: string;
  creatorName?: string;
  hostId?: string;
  hostName?: string;
  hostRole?: string;
  teamId?: string;
  targetAudience?: string;
  targetTeamName?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'active' | 'scheduled';
  meetingUrl?: string;
  meetingLink?: string;
  files?: MeetingFile[];
  attachedFiles?: any[];
}

export interface SecurityAlert { id: string; type?: string; severity?: string; title?: string; message?: string; timestamp?: string; resolved?: boolean; }

// Preserve all remaining type declarations exactly through the existing source exports.
