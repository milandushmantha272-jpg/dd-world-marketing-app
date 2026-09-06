
/**
 * DD World Marketing App - Type Definitions
 * Comprehensive type system for roles, badges, sales, locations, and user management
 */

export enum RoleLevel {
  TRAINEE_AGENT = "TRAINEE_AGENT",
  STAR_AGENT = "STAR_AGENT",
  ELITE_AGENT = "ELITE_AGENT",
  TEAM_SUPERVISOR = "TEAM_SUPERVISOR",
  MASTER_LEADER = "MASTER_LEADER",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
}

export enum BadgeType {
  STAR_BADGE = "STAR_BADGE",
  ELITE_BADGE = "ELITE_BADGE",
  SUPERVISOR_BADGE = "SUPERVISOR_BADGE",
  MASTER_BADGE = "MASTER_BADGE",
}

export interface Badge {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string; 
  acquiredAt: number; 
  earnedBy: string; 
}

export interface RoleMetadata {
  level: RoleLevel;
  displayName: string;
  description: string;
  requiredSuccessfulSales?: number; 
  managedAgentsCount?: number; 
  dailyTargetThreshold?: number; 
  canAuditAttendance?: boolean; 
  canViewRealTimeSales?: boolean; 
  badges: Badge[];
  promotedAt?: number; 
}

export type UserRole = "owner" | "team_leader" | "agent";

export interface User {
  id: string; 
  email: string;
  phoneNumber: string;
  fullName: string;
  profileImageUrl?: string;
  role: RoleLevel;
  roleMetadata: RoleMetadata;
  teamId: string;
  agentId?: string; 
  supervisorId?: string; 
  managedAgentIds?: string[]; 
  isActive: boolean;
  appStatus: "online" | "offline" | "away";
  lastLoginAt?: number; 
  lastLogoutAt?: number; 
  loginCount: number; 
  downloadCount: number; 
  createdAt: number;
  updatedAt: number;
  name: string;
  agentCode: string;
  employeeId?: string;
  designation?: string;
  secretPin?: string;
  password?: string;
  metadata?: {
    deviceInfo?: string;
    lastKnownLocation?: { lat: number; lng: number };
    sessionTokens?: string[];
  };
}

export enum ServiceType {
  DIALOG_SAYURU = "DIALOG_SAYURU",
  DIALOG_GOVIMITHURU = "DIALOG_GOVIMITHURU",
  DIALOG_OTHER = "DIALOG_OTHER",
}

export enum SaleVerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
  FRAUD_FLAG = "FRAUD_FLAG",
}

export interface ProductSale {
  id: string; 
  agentId: string; 
  teamId: string; 
  serviceType: ServiceType;
  customerName: string;
  customerMobileNumber: string; 
  amount: number;
  screenshotUrl: string; 
  verificationStatus: SaleVerificationStatus;
  verifiedBy?: string; 
  verifiedAt?: number; 
  notes?: string;
  fraudFlags?: {
    isDuplicate?: boolean;
    unusualAmount?: boolean;
    failedCustomerVerification?: boolean;
    suspiciousPattern?: boolean;
  };
  createdAt: number; 
  updatedAt: number;
  locationLatitude?: number; 
  locationLongitude?: number;
}

export interface SaleFilters {
  teamId?: string;
  agentId?: string;
  serviceType?: ServiceType;
  verificationStatus?: SaleVerificationStatus;
  startDate?: number;
  endDate?: number;
}

export interface LocationLog {
  id: string; 
  userId: string; 
  latitude: number;
  longitude: number;
  accuracy?: number; 
  altitude?: number;
  speed?: number; 
  heading?: number; 
  timestamp: number; 
  isGeofenced?: boolean; 
  geofenceZoneId?: string; 
  deviceInfo?: string;
  source: "gps" | "network" | "fused"; 
  isBackgroundTracking: boolean; 
  createdAt: number;
}

export enum EventType {
  SALE_CREATED = "SALE_CREATED",
  SALE_VERIFIED = "SALE_VERIFIED",
  SALE_REJECTED = "SALE_REJECTED",
  LOCATION_UPDATE = "LOCATION_UPDATE",
  USER_LOGIN = "USER_LOGIN",
  USER_LOGOUT = "USER_LOGOUT",
  ROLE_PROMOTED = "ROLE_PROMOTED",
  BADGE_EARNED = "BADGE_EARNED",
  TEAM_TARGET_REACHED = "TEAM_TARGET_REACHED",
  FRAUD_ALERT = "FRAUD_ALERT",
  AGENT_OFFLINE = "AGENT_OFFLINE",
  AGENT_ONLINE = "AGENT_ONLINE",
}

export interface RealtimeEvent {
  id: string;
  type: EventType;
  userId: string;
  teamId: string;
  payload: Record<string, any>;
  timestamp: number;
  isNotified: boolean;
  notificationChimeTriggered?: boolean;
}

export interface Team {
  id: string; 
  name: string;
  supervisorId: string; 
  masterLeaderId?: string; 
  agentIds: string[]; 
  dailyTargetAmount: number; 
  dailyTargetReached: boolean;
  dailyTargetReachedAt?: number; 
  currentDailySales: number; 
  region?: string;
  territory?: string[];
  geofenceZones?: string[]; 
  createdAt: number;
  updatedAt: number;
  metadata?: {
    contactEmail?: string;
    contactPhone?: string;
    managedAgentsCount?: number;
  };
}

export interface LiveMapAgent {
  agentId: string;
  agentName: string;
  role: RoleLevel;
  latitude: number;
  longitude: number;
  isOnline: boolean;
  lastUpdateTime: number;
  currentTeamId: string;
  isGeofenced: boolean;
  statusIndicator: "online" | "offline" | "away" | "inactive";
  lastSaleTime?: number;
  todaySalesCount?: number;
}

export interface LiveMapTeamView {
  teamId: string;
  teamName: string;
  supervisorId: string;
  agentLocations: LiveMapAgent[];
  teamCenter?: { lat: number; lng: number };
  geofenceZones?: Array<{
    id: string;
    name: string;
    center: { lat: number; lng: number };
    radius: number;
  }>;
}

export interface DataContextType {
  sales: ProductSale[];
  locationLogs: LocationLog[];
  users: User[];
  teams: Team[];
  liveMapAgents: LiveMapAgent[];
  liveMapTeamView: LiveMapTeamView | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  addSale: (saleData: Omit<ProductSale, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  updateSaleStatus: (saleId: string, status: SaleVerificationStatus) => Promise<void>;
  logLocation: (locationData: Omit<LocationLog, "id" | "timestamp">) => Promise<void>;
}

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  SALES: "sales",
  LOCATION_LOGS: "location_logs",
  TEAMS: "teams",
};
