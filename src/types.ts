export type UserRole = 'owner' | 'team_leader' | 'agent';

export type EmploymentStatus = 'ACTIVE' | 'TEMPORARY_SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'PROBATION' | 'BLOCKED' | 'SUSPENDED' | 'EXITED';

export type EmployeeIdApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  agentCode?: string;
  nic?: string;
  phone?: string;
  mobile?: string;
  teamId?: string;
  teamName?: string;
  teamLeaderId?: string;
  teamLeaderName?: string;
  avatar?: string;
  employmentStatus?: EmploymentStatus;
  joinedDate?: string;
  createdAt?: string;
  designation?: string;
  workLocation?: string;
  district?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  drivingLicenceNumber?: string;
  drivingLicenceExpiry?: string;
  annualVerificationDate?: string;
  annualVerificationExpiry?: string;
  isAppDownloaded?: boolean;
  isLoggedIn?: boolean;
  lastLoginAt?: string;
  appVersion?: string;
  jobPosition?: string;
  idApprovalStatus?: EmployeeIdApprovalStatus;
  idApprovedAt?: string;
  idApprovedBy?: string;
  ownerSignatureUrl?: string;
  idRejectedReason?: string;
  approvedByOwner?: boolean;
  password?: string;
  pinCode?: string;
  tempPassword?: string;
  status?: string;
  employeeId?: string;
  kycDocuments?: {
    gnCertificate?: string;
    policeReport?: string;
    nicFront?: string;
    nicBack?: string;
    drivingLicenceFront?: string;
    drivingLicenceBack?: string;
    employeePhoto?: string;
  };
  gramaNiladhariReportUrl?: string;
  policeReportUrl?: string;
  gramaReportName?: string;
  policeReportName?: string;
  gramaReportUploadedAt?: string;
  policeReportUploadedAt?: string;
}

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  description?: string;
  createdAt?: string;
}

export interface SalesPolicy {
  workingDaysTarget: number;
  dailyProductTarget: number;
  sayuruDailyTarget: number;
  govimithuruDailyTarget: number;
  effectiveFrom?: string;
  version?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AttendanceRecord {
  id: string;
  userId?: string;
  agentId?: string;
  agentCode?: string;
  agentName?: string;
  userName?: string;
  userRole?: UserRole;
  role?: string;
  teamId?: string;
  teamName?: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'present' | 'absent' | 'half_day' | 'on_leave' | 'completed';
  checkInTime?: string;
  checkOutTime?: string;
  gpsLocation?: {
    lat: number;
    lng: number;
    address?: string;
  };
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

export interface MeetingFile {
  id: string;
  name: string;
  url: string;
  size?: number;
}

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

export interface SecurityAlert {
  id: string;
  type: 'FAKE_GPS_DETECTED' | 'UNAUTHORIZED_ACCESS' | 'MOCK_LOCATION_BLOCKED';
  userId: string;
  userName: string;
  agentCode: string;
  role: string;
  details: string;
  coordinates?: { latitude: number; longitude: number };
  timestamp: string;
  resolved?: boolean;
}
