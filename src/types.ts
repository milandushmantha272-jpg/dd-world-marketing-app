/**
 * DD World Marketing App - Type Definitions
 * Comprehensive type system for roles, badges, sales, locations, and user management
 */

// ============================================================================
// ROLE & BADGE SYSTEM - Role Hierarchy & Employee Status Tracking
// ============================================================================

export enum RoleLevel {
  TRAINEE_AGENT = "TRAINEE_AGENT",
  STAR_AGENT = "STAR_AGENT",
  ELITE_AGENT = "ELITE_AGENT",
  TEAM_SUPERVISOR = "TEAM_SUPERVISOR",
  MASTER_LEADER = "MASTER_LEADER",
  ADMIN = "ADMIN",
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
  icon: string; // URL or icon identifier
  acquiredAt: number; // timestamp
  earnedBy: string; // userId who earned it
}

export interface RoleMetadata {
  level: RoleLevel;
  displayName: string;
  description: string;
  requiredSuccessfulSales?: number; // For Star Agent: 5+ Dialog services daily
  managedAgentsCount?: number; // For Team Supervisor: manages 40 agents
  dailyTargetThreshold?: number; // For Master Leader
  canAuditAttendance?: boolean; // For Team Supervisor/Master Leader
  canViewRealTimeSales?: boolean; // For Team Supervisor/Master Leader
  badges: Badge[];
  promotedAt?: number; // timestamp of role promotion
}

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

export interface User {
  id: string; // userId (unique identifier)
  email: string;
  phoneNumber: string;
  fullName: string;
  profileImageUrl?: string;
  role: RoleLevel;
  roleMetadata: RoleMetadata;
  teamId: string;
  agentId?: string; // For agents reporting to a supervisor
  supervisorId?: string; // For agents under supervision
  managedAgentIds?: string[]; // For supervisors managing multiple agents
  isActive: boolean;
  appStatus: "online" | "offline" | "away";
  lastLoginAt?: number; // timestamp
  lastLogoutAt?: number; // timestamp
  loginCount: number; // Total login count
  downloadCount: number; // Total app downloads/installs
  createdAt: number;
  updatedAt: number;
  metadata?: {
    deviceInfo?: string;
    lastKnownLocation?: { lat: number; lng: number };
    sessionTokens?: string[];
  };
}

// ============================================================================
// SALES & PRODUCT TRANSACTIONS
// ============================================================================

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
  id: string; // Sale ID (auto-generated)
  agentId: string; // Who made the sale
  teamId: string; // Which team
  serviceType: ServiceType;
  customerName: string;
  customerMobileNumber: string; // Customer's phone number
  amount: number;
  screenshotUrl: string; // Proof of transaction (image URL)
  verificationStatus: SaleVerificationStatus;
  verifiedBy?: string; // AdminId or SupervisorId who verified
  verifiedAt?: number; // Verification timestamp
  notes?: string;
  fraudFlags?: {
    isDuplicate?: boolean;
    unusualAmount?: boolean;
    failedCustomerVerification?: boolean;
    suspiciousPattern?: boolean;
  };
  createdAt: number; // Server timestamp
  updatedAt: number;
  locationLatitude?: number; // GPS coordinates at time of sale
  locationLongitude?: number;
}

// ============================================================================
// LOCATION TRACKING & GPS
// ============================================================================

export interface LocationLog {
  id: string; // Location log ID
  userId: string; // Which agent/user
  latitude: number;
  longitude: number;
  accuracy?: number; // GPS accuracy in meters
  altitude?: number;
  speed?: number; // Movement speed
  heading?: number; // Direction of movement
  timestamp: number; // When the location was recorded
  isGeofenced?: boolean; // Whether within designated territory
  geofenceZoneId?: string; // Which zone (if any)
  deviceInfo?: string;
  source: "gps" | "network" | "fused"; // Location source
  isBackgroundTracking: boolean; // Whether collected in background
  createdAt: number;
}

// ============================================================================
// REAL-TIME EVENTS & NOTIFICATIONS
// ============================================================================

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

// ============================================================================
// TEAM & GROUP MANAGEMENT
// ============================================================================

export interface Team {
  id: string; // Team ID
  name: string;
  supervisorId: string; // Team Supervisor
  masterLeaderId?: string; // Master Leader (optional)
  agentIds: string[]; // Agents in this team
  dailyTargetAmount: number; // Group sales target
  dailyTargetReached: boolean;
  dailyTargetReachedAt?: number; // Timestamp when target was reached
  currentDailySales: number; // Current day's total sales
  region?: string;
  territory?: string[];
  geofenceZones?: string[]; // Geofence zone IDs
  createdAt: number;
  updatedAt: number;
  metadata?: {
    contactEmail?: string;
    contactPhone?: string;
    managedAgentsCount?: number;
  };
}

// ============================================================================
// DASHBOARD & SUMMARY DATA
// ============================================================================

export interface DailySalesSummary {
  date: string; // YYYY-MM-DD format
  teamId: string;
  totalSales: number;
  totalAmount: number;
  salesByService: {
    [key in ServiceType]?: number;
  };
  verifiedCount: number;
  pendingCount: number;
  rejectedCount: number;
  fraudFlaggedCount: number;
  topAgentId?: string;
  topAgentName?: string;
  topAgentSalesCount?: number;
}

export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  totalSalesThisMonth: number;
  totalSalesThisWeek: number;
  totalSalesToday: number;
  verificationSuccessRate: number; // 0-100
  fraudFlagRate: number; // 0-100
  averageSaleAmount: number;
  consecutiveSuccessfulSales: number;
  isStarAgent: boolean; // 5+ successful Dialog services daily
  isEliteAgent: boolean; // Top performer
  lastActivityTime?: number;
  lastKnownLocation?: { lat: number; lng: number };
}

// ============================================================================
// LIVE MAP DATA
// ============================================================================

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

// ============================================================================
// DIALOG SERVICE DETAILS
// ============================================================================

export interface DialogService {
  id: string;
  name: string;
  type: ServiceType;
  description: string;
  basePrice: number;
  icon?: string;
  isActive: boolean;
  createdAt: number;
}

// ============================================================================
// CONTEXT STATE & ACTION TYPES
// ============================================================================

export interface DataContextType {
  // Sales State
  sales: ProductSale[];
  addSale: (sale: ProductSale) => Promise<void>;
  updateSale: (saleId: string, updates: Partial<ProductSale>) => Promise<void>;
  fetchSales: (filters?: SaleFilters) => Promise<void>;

  // Location State
  locationLogs: LocationLog[];
  addLocationLog: (log: LocationLog) => Promise<void>;
  updateUserGps: (userId: string, lat: number, lng: number) => Promise<void>;
  fetchLocationLogs: (userId: string, limit?: number) => Promise<void>;

  // User State
  users: User[];
  fetchUsers: () => Promise<void>;
  updateUserProfile: (userId: string, updates: Partial<User>) => Promise<void>;

  // Team State
  teams: Team[];
  fetchTeams: () => Promise<void>;

  // Real-time Events
  broadcastRealtimeEvent: (event: RealtimeEvent) => Promise<void>;
  playNotificationChime: () => void;

  // Live Map
  liveMapAgents: LiveMapAgent[];
  liveMapTeamView: LiveMapTeamView | null;

  // Loading & Errors
  loading: boolean;
  error: string | null;
  isConnected: boolean;
}

export interface SaleFilters {
  teamId?: string;
  agentId?: string;
  serviceType?: ServiceType;
  startDate?: number;
  endDate?: number;
  verificationStatus?: SaleVerificationStatus;
}

// ============================================================================
// NOTIFICATION & CHIME CONFIGURATION
// ============================================================================

export interface NotificationChimeConfig {
  isEnabled: boolean;
  volume: number; // 0-1
  chimeType: "bell" | "chime" | "success" | "alert";
  vibratePattern?: number[];
}

// ============================================================================
// FIRESTORE COLLECTION STRUCTURE
// ============================================================================

export const FIRESTORE_COLLECTIONS = {
  USERS: "users",
  SALES: "sales",
  LOCATION_LOGS: "locationLogs",
  TEAMS: "teams",
  REALTIME_EVENTS: "realtimeEvents",
  BADGES: "badges",
  DIALOG_SERVICES: "dialogServices",
  DAILY_SUMMARIES: "dailySalesSummaries",
  PERFORMANCE_METRICS: "performanceMetrics",
} as const;
