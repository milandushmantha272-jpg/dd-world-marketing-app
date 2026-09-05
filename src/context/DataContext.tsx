/**
 * DD World Marketing App - Data Context
 * Real-time Firebase Firestore operations for sales, locations, and user management
 * Auto-save functionality for 4G/5G mobile connectivity
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc,
  serverTimestamp,
  Query,
  QueryConstraint,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import {
  ProductSale,
  LocationLog,
  User,
  Team,
  RealtimeEvent,
  EventType,
  SaleVerificationStatus,
  DataContextType,
  SaleFilters,
  RoleLevel,
  RoleMetadata,
  BadgeType,
  Badge,
  LiveMapAgent,
  LiveMapTeamView,
  ServiceType,
  FIRESTORE_COLLECTIONS,
} from "../types";

// Create context
const DataContext = createContext<DataContextType | undefined>(undefined);

// ============================================================================
// NOTIFICATION & AUDIO CHIME UTILITIES
// ============================================================================

const playNotificationChime = (): void => {
  try {
    // Use Web Audio API for cross-platform chime notification
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Chime frequency pattern (success tone)
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Vibration feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (error) {
    console.error("Error playing notification chime:", error);
  }
};

// ============================================================================
// FIRESTORE UTILITY FUNCTIONS
// ============================================================================

const getFirestoreInstance = () => {
  try {
    const app = getApp();
    return getFirestore(app);
  } catch (error) {
    console.error("Firebase app not initialized:", error);
    throw error;
  }
};

/**
 * Build dynamic Firestore query with optional filters
 */
const buildSalesQuery = (db: any, filters?: SaleFilters): Query => {
  let constraints: QueryConstraint[] = [];

  if (filters?.teamId) {
    constraints.push(where("teamId", "==", filters.teamId));
  }
  if (filters?.agentId) {
    constraints.push(where("agentId", "==", filters.agentId));
  }
  if (filters?.serviceType) {
    constraints.push(where("serviceType", "==", filters.serviceType));
  }
  if (filters?.verificationStatus) {
    constraints.push(where("verificationStatus", "==", filters.verificationStatus));
  }
  if (filters?.startDate && filters?.endDate) {
    constraints.push(where("createdAt", ">=", filters.startDate));
    constraints.push(where("createdAt", "<=", filters.endDate));
  }

  constraints.push(orderBy("createdAt", "desc"));
  constraints.push(limit(100));

  return query(collection(db, FIRESTORE_COLLECTIONS.SALES), ...constraints);
};

/**
 * Calculate role promotion based on performance metrics
 */
const calculateRolePromotion = (
  currentRole: RoleLevel,
  successfulSalesCount: number,
  dailyTargetReached: boolean,
  managedAgents: number
): { newRole: RoleLevel; roleMetadata: RoleMetadata } => {
  let newRole = currentRole;
  let roleMetadata: RoleMetadata;

  // Promotion logic: Trainee → Star → Elite Agent
  if (currentRole === RoleLevel.TRAINEE_AGENT && successfulSalesCount >= 5) {
    newRole = RoleLevel.STAR_AGENT;
    roleMetadata = {
      level: RoleLevel.STAR_AGENT,
      displayName: "Star Agent",
      description: "High-performing agent with 5+ successful Dialog services daily",
      badges: [
        {
          id: "star-badge-01",
          type: BadgeType.STAR_BADGE,
          name: "Star Badge",
          description: "Achieved 5+ successful Dialog services",
          icon: "⭐",
          acquiredAt: Date.now(),
          earnedBy: "",
        },
      ],
      promotedAt: Date.now(),
      canAuditAttendance: false,
      canViewRealTimeSales: true,
    };
  } else if (
    currentRole === RoleLevel.STAR_AGENT &&
    successfulSalesCount >= 15 &&
    dailyTargetReached
  ) {
    newRole = RoleLevel.ELITE_AGENT;
    roleMetadata = {
      level: RoleLevel.ELITE_AGENT,
      displayName: "Elite Agent",
      description: "Top-tier performing agent with exceptional sales records",
      badges: [
        {
          id: "elite-badge-01",
          type: BadgeType.ELITE_BADGE,
          name: "Elite Badge",
          description: "Reached Elite Agent status",
          icon: "👑",
          acquiredAt: Date.now(),
          earnedBy: "",
        },
      ],
      promotedAt: Date.now(),
      canAuditAttendance: false,
      canViewRealTimeSales: true,
    };
  } else if (currentRole === RoleLevel.ELITE_AGENT && managedAgents >= 40) {
    newRole = RoleLevel.TEAM_SUPERVISOR;
    roleMetadata = {
      level: RoleLevel.TEAM_SUPERVISOR,
      displayName: "Team Supervisor",
      description: "Manages 40+ agents and audits geo-fenced attendance",
      requiredSuccessfulSales: 40,
      managedAgentsCount: managedAgents,
      canAuditAttendance: true,
      canViewRealTimeSales: true,
      badges: [
        {
          id: "supervisor-badge-01",
          type: BadgeType.SUPERVISOR_BADGE,
          name: "Supervisor Badge",
          description: "Promoted to Team Supervisor",
          icon: "👔",
          acquiredAt: Date.now(),
          earnedBy: "",
        },
      ],
      promotedAt: Date.now(),
    };
  } else if (currentRole === RoleLevel.TEAM_SUPERVISOR && dailyTargetReached) {
    newRole = RoleLevel.MASTER_LEADER;
    roleMetadata = {
      level: RoleLevel.MASTER_LEADER,
      displayName: "Master Leader",
      description: "Reached maximum daily group target threshold",
      managedAgentsCount: managedAgents,
      canAuditAttendance: true,
      canViewRealTimeSales: true,
      badges: [
        {
          id: "master-badge-01",
          type: BadgeType.MASTER_BADGE,
          name: "Master Badge",
          description: "Reached Master Leader status",
          icon: "🏆",
          acquiredAt: Date.now(),
          earnedBy: "",
        },
      ],
      promotedAt: Date.now(),
    };
  } else {
    roleMetadata = {
      level: newRole,
      displayName: newRole.replace(/_/g, " "),
      description: `${newRole.replace(/_/g, " ")} Role`,
      badges: [],
      canAuditAttendance: newRole !== RoleLevel.TRAINEE_AGENT && newRole !== RoleLevel.STAR_AGENT,
      canViewRealTimeSales: newRole !== RoleLevel.TRAINEE_AGENT,
    };
  }

  return { newRole, roleMetadata };
};

// ============================================================================
// DATA CONTEXT PROVIDER
// ============================================================================

interface DataProviderProps {
  children: React.ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [sales, setSales] = useState<ProductSale[]>([]);
  const [locationLogs, setLocationLogs] = useState<LocationLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [liveMapAgents, setLiveMapAgents] = useState<LiveMapAgent[]>([]);
  const [liveMapTeamView, setLiveMapTeamView] = useState<LiveMapTeamView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const unsubscribesRef = useRef<Array<() => void>>([]);

  // ========================================================================
  // SALES OPERATIONS
  // ========================================================================

  /**
   * Submit a new product sale to Firestore with verification data
   * Automatically saves to 'sales' collection with server timestamp
   */
  const submitProductSale = useCallback(
    async (saleData: Omit<ProductSale, "id" | "createdAt" | "updatedAt">): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const salesRef = collection(db, FIRESTORE_COLLECTIONS.SALES);

        const newSale: ProductSale = {
          id: "", // Will be set by Firestore
          ...saleData,
          createdAt: Timestamp.now().toMillis(),
          updatedAt: Timestamp.now().toMillis(),
          verificationStatus: SaleVerificationStatus.PENDING,
        };

        const docRef = await addDoc(salesRef, newSale);
        newSale.id = docRef.id;

        // Update local state
        setSales((prev) => [newSale, ...prev]);

        // Trigger notification chime
        playNotificationChime();

        // Broadcast real-time event
        await broadcastRealtimeEvent({
          id: `event-${Date.now()}`,
          type: EventType.SALE_CREATED,
          userId: saleData.agentId,
          teamId: saleData.teamId,
          payload: {
            saleId: docRef.id,
            amount: saleData.amount,
            customerMobileNumber: saleData.customerMobileNumber,
            serviceType: saleData.serviceType,
          },
          timestamp: Timestamp.now().toMillis(),
          isNotified: true,
          notificationChimeTriggered: true,
        });

        // Check for role promotion based on today's sales
        await checkAndPromoteAgent(saleData.agentId, saleData.teamId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to submit sale";
        setError(errorMsg);
        console.error("Error submitting product sale:", err);
        throw err;
      }
    },
    []
  );

  /**
   * Update an existing sale record in Firestore
   */
  const updateSale = useCallback(
    async (saleId: string, updates: Partial<ProductSale>): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const saleRef = doc(db, FIRESTORE_COLLECTIONS.SALES, saleId);

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now().toMillis(),
        };

        await updateDoc(saleRef, updateData);

        // Update local state
        setSales((prev) =>
          prev.map((sale) => (sale.id === saleId ? { ...sale, ...updateData } : sale))
        );

        // If verification status changed, broadcast event
        if (updates.verificationStatus) {
          const eventType =
            updates.verificationStatus === SaleVerificationStatus.VERIFIED
              ? EventType.SALE_VERIFIED
              : EventType.SALE_REJECTED;

          await broadcastRealtimeEvent({
            id: `event-${Date.now()}`,
            type: eventType,
            userId: updates.verifiedBy || "",
            teamId: "",
            payload: { saleId, status: updates.verificationStatus },
            timestamp: Timestamp.now().toMillis(),
            isNotified: true,
          });
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update sale";
        setError(errorMsg);
        console.error("Error updating sale:", err);
        throw err;
      }
    },
    []
  );

  /**
   * Fetch sales from Firestore with optional filters
   */
  const fetchSales = useCallback(async (filters?: SaleFilters): Promise<void> => {
    try {
      setLoading(true);
      const db = getFirestoreInstance();
      const q = buildSalesQuery(db, filters);

      const querySnapshot = await getDocs(q);
      const fetchedSales: ProductSale[] = [];

      querySnapshot.forEach((doc) => {
        fetchedSales.push({
          id: doc.id,
          ...doc.data(),
        } as ProductSale);
      });

      setSales(fetchedSales);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch sales";
      setError(errorMsg);
      console.error("Error fetching sales:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Real-time listener for sales collection changes
   */
  const subscribeToSalesUpdates = useCallback((): (() => void) => {
    try {
      const db = getFirestoreInstance();
      const q = query(
        collection(db, FIRESTORE_COLLECTIONS.SALES),
        orderBy("createdAt", "desc"),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const updatedSales: ProductSale[] = [];
          snapshot.forEach((doc) => {
            updatedSales.push({
              id: doc.id,
              ...doc.data(),
            } as ProductSale);
          });
          setSales(updatedSales);
          setError(null);
          setIsConnected(true);
        },
        (err) => {
          console.error("Real-time sales subscription error:", err);
          setError("Connection lost. Retrying...");
          setIsConnected(false);
        }
      );

      unsubscribesRef.current.push(unsubscribe);
      return unsubscribe;
    } catch (err) {
      console.error("Error setting up sales subscription:", err);
      return () => {};
    }
  }, []);

  // ========================================================================
  // LOCATION TRACKING OPERATIONS
  // ========================================================================

  /**
   * Update user's GPS location in real-time
   * Stores latitude, longitude, and timestamp in 'locationLogs' collection
   */
  const updateUserGps = useCallback(
    async (
      userId: string,
      latitude: number,
      longitude: number,
      accuracy?: number,
      isBackgroundTracking: boolean = false
    ): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const locationRef = collection(db, FIRESTORE_COLLECTIONS.LOCATION_LOGS);

        const locationData: LocationLog = {
          id: "", // Will be set by Firestore
          userId,
          latitude,
          longitude,
          accuracy,
          timestamp: Timestamp.now().toMillis(),
          isGeofenced: false, // To be determined by geofence logic
          deviceInfo: navigator.userAgent,
          source: accuracy ? "fused" : "network",
          isBackgroundTracking,
          createdAt: Timestamp.now().toMillis(),
        };

        const docRef = await addDoc(locationRef, locationData);
        locationData.id = docRef.id;

        // Update local state
        setLocationLogs((prev) => [locationData, ...prev].slice(0, 100));

        // Update user's last known location
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        await updateDoc(userRef, {
          "metadata.lastKnownLocation": { lat: latitude, lng: longitude },
          updatedAt: Timestamp.now().toMillis(),
        });

        // Broadcast real-time event
        await broadcastRealtimeEvent({
          id: `event-${Date.now()}`,
          type: EventType.LOCATION_UPDATE,
          userId,
          teamId: "", // To be enriched from user data
          payload: { latitude, longitude, accuracy, isBackgroundTracking },
          timestamp: Timestamp.now().toMillis(),
          isNotified: false,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update GPS location";
        setError(errorMsg);
        console.error("Error updating user GPS:", err);
        // Don't throw for background tracking to avoid interrupting the service
        if (!isBackgroundTracking) throw err;
      }
    },
    []
  );

  /**
   * Fetch location logs for a specific user
   */
  const fetchLocationLogs = useCallback(
    async (userId: string, limitCount: number = 50): Promise<void> => {
      try {
        setLoading(true);
        const db = getFirestoreInstance();
        const q = query(
          collection(db, FIRESTORE_COLLECTIONS.LOCATION_LOGS),
          where("userId", "==", userId),
          orderBy("createdAt", "desc"),
          limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const fetchedLogs: LocationLog[] = [];

        querySnapshot.forEach((doc) => {
          fetchedLogs.push({
            id: doc.id,
            ...doc.data(),
          } as LocationLog);
        });

        setLocationLogs(fetchedLogs);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to fetch location logs";
        setError(errorMsg);
        console.error("Error fetching location logs:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Real-time listener for location updates (for Live Map)
   */
  const subscribeToLiveMapUpdates = useCallback((teamId: string): (() => void) => {
    try {
      const db = getFirestoreInstance();

      // Get all agents in team first
      const usersQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.USERS),
        where("teamId", "==", teamId)
      );

      const unsubscribe = onSnapshot(
        usersQuery,
        async (userSnapshot) => {
          const agents: LiveMapAgent[] = [];

          // For each agent, get their latest location
          for (const userDoc of userSnapshot.docs) {
            const userData = userDoc.data() as User;
            const locationQuery = query(
              collection(db, FIRESTORE_COLLECTIONS.LOCATION_LOGS),
              where("userId", "==", userData.id),
              orderBy("createdAt", "desc"),
              limit(1)
            );

            const locationSnapshot = await getDocs(locationQuery);
            if (locationSnapshot.size > 0) {
              const latestLocation = locationSnapshot.docs[0].data() as LocationLog;

              agents.push({
                agentId: userData.id,
                agentName: userData.fullName,
                role: userData.role,
                latitude: latestLocation.latitude,
                longitude: latestLocation.longitude,
                isOnline: userData.appStatus === "online",
                lastUpdateTime: latestLocation.timestamp,
                currentTeamId: userData.teamId,
                isGeofenced: latestLocation.isGeofenced || false,
                statusIndicator: userData.appStatus as any,
                todaySalesCount: 0, // Will be calculated from sales data
              });
            }
          }

          setLiveMapAgents(agents);
          setLiveMapTeamView({
            teamId,
            teamName: "", // Will be fetched from teams collection
            supervisorId: "", // Will be fetched from teams collection
            agentLocations: agents,
          });
        },
        (err) => {
          console.error("Real-time location subscription error:", err);
          setIsConnected(false);
        }
      );

      unsubscribesRef.current.push(unsubscribe);
      return unsubscribe;
    } catch (err) {
      console.error("Error setting up live map subscription:", err);
      return () => {};
    }
  }, []);

  // ========================================================================
  // USER & TEAM OPERATIONS
  // ========================================================================

  /**
   * Fetch all users from Firestore
   */
  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const db = getFirestoreInstance();
      const usersRef = collection(db, FIRESTORE_COLLECTIONS.USERS);

      const querySnapshot = await getDocs(usersRef);
      const fetchedUsers: User[] = [];

      querySnapshot.forEach((doc) => {
        fetchedUsers.push({
          id: doc.id,
          ...doc.data(),
        } as User);
      });

      setUsers(fetchedUsers);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch users";
      setError(errorMsg);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update user profile and role metadata in Firestore
   */
  const updateUserProfile = useCallback(
    async (userId: string, updates: Partial<User>): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);

        const updateData = {
          ...updates,
          updatedAt: Timestamp.now().toMillis(),
        };

        await updateDoc(userRef, updateData);

        // Update local state
        setUsers((prev) =>
          prev.map((user) => (user.id === userId ? { ...user, ...updateData } : user))
        );

        // Broadcast role promotion event if applicable
        if (updates.role && updates.role !== users.find((u) => u.id === userId)?.role) {
          await broadcastRealtimeEvent({
            id: `event-${Date.now()}`,
            type: EventType.ROLE_PROMOTED,
            userId,
            teamId: updates.teamId || "",
            payload: { newRole: updates.role, roleMetadata: updates.roleMetadata },
            timestamp: Timestamp.now().toMillis(),
            isNotified: true,
          });

          // Play notification for promotion
          playNotificationChime();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to update user profile";
        setError(errorMsg);
        console.error("Error updating user profile:", err);
        throw err;
      }
    },
    [users]
  );

  /**
   * Fetch teams from Firestore
   */
  const fetchTeams = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const db = getFirestoreInstance();
      const teamsRef = collection(db, FIRESTORE_COLLECTIONS.TEAMS);

      const querySnapshot = await getDocs(teamsRef);
      const fetchedTeams: Team[] = [];

      querySnapshot.forEach((doc) => {
        fetchedTeams.push({
          id: doc.id,
          ...doc.data(),
        } as Team);
      });

      setTeams(fetchedTeams);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to fetch teams";
      setError(errorMsg);
      console.error("Error fetching teams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ========================================================================
  // ROLE PROMOTION & BADGE SYSTEM
  // ========================================================================

  /**
   * Check if agent qualifies for role promotion and update accordingly
   */
  const checkAndPromoteAgent = useCallback(
    async (agentId: string, teamId: string): Promise<void> => {
      try {
        // Get agent's today's sales count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayMs = today.getTime();

        const db = getFirestoreInstance();
        const salesQuery = query(
          collection(db, FIRESTORE_COLLECTIONS.SALES),
          where("agentId", "==", agentId),
          where("verificationStatus", "==", SaleVerificationStatus.VERIFIED),
          where("createdAt", ">=", todayMs)
        );

        const salesSnapshot = await getDocs(salesQuery);
        const successfulSalesCount = salesSnapshot.size;

        // Get agent data
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, agentId);
        const userSnapshot = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.USERS)));
        const agentData = userSnapshot.docs.find((d) => d.id === agentId)?.data() as User;

        if (!agentData) return;

        // Get team's managed agents count for supervisor check
        const teamRef = doc(db, FIRESTORE_COLLECTIONS.TEAMS, teamId);
        const teamSnapshot = await getDocs(query(collection(db, FIRESTORE_COLLECTIONS.TEAMS)));
        const teamData = teamSnapshot.docs.find((d) => d.id === teamId)?.data() as Team;

        // Calculate promotion
        const { newRole, roleMetadata } = calculateRolePromotion(
          agentData.role,
          successfulSalesCount,
          teamData?.dailyTargetReached || false,
          teamData?.agentIds.length || 0
        );

        // Update if role changed
        if (newRole !== agentData.role) {
          await updateUserProfile(agentId, {
            role: newRole,
            roleMetadata,
          });

          // Award badge
          if (roleMetadata.badges.length > 0) {
            await broadcastRealtimeEvent({
              id: `event-${Date.now()}`,
              type: EventType.BADGE_EARNED,
              userId: agentId,
              teamId,
              payload: {
                badges: roleMetadata.badges,
                newRole,
              },
              timestamp: Timestamp.now().toMillis(),
              isNotified: true,
              notificationChimeTriggered: true,
            });
          }
        }
      } catch (err) {
        console.error("Error checking agent promotion:", err);
        // Don't throw - this is a background operation
      }
    },
    [updateUserProfile]
  );

  // ========================================================================
  // REAL-TIME EVENTS & BROADCASTING
  // ========================================================================

  /**
   * Broadcast a real-time event to the Firestore 'realtimeEvents' collection
   */
  const broadcastRealtimeEvent = useCallback(
    async (event: Omit<RealtimeEvent, "id">): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const eventsRef = collection(db, FIRESTORE_COLLECTIONS.REALTIME_EVENTS);

        const eventData: RealtimeEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...event,
        };

        await addDoc(eventsRef, eventData);

        // Keep only last 1000 events (cleanup old events)
        const oldEventsQuery = query(
          collection(db, FIRESTORE_COLLECTIONS.REALTIME_EVENTS),
          orderBy("timestamp", "asc"),
          limit(100)
        );

        const oldEventsSnapshot = await getDocs(oldEventsQuery);
        oldEventsSnapshot.docs.forEach((doc) => {
          if (Date.now() - (doc.data().timestamp || 0) > 86400000) {
            // Older than 24 hours
            // In production, implement batch delete
          }
        });
      } catch (err) {
        console.error("Error broadcasting real-time event:", err);
        // Don't throw - this is non-critical
      }
    },
    []
  );

  // ========================================================================
  // LIFECYCLE & SUBSCRIPTIONS
  // ========================================================================

  /**
   * Set up all real-time listeners on mount
   */
  useEffect(() => {
    subscribeToSalesUpdates();
    // subscribeToLiveMapUpdates(currentTeamId); // Pass actual team ID when available

    return () => {
      // Cleanup all subscriptions
      unsubscribesRef.current.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (err) {
          console.error("Error unsubscribing:", err);
        }
      });
      unsubscribesRef.current = [];
    };
  }, [subscribeToSalesUpdates]);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: DataContextType = {
    sales,
    addSale: submitProductSale,
    updateSale,
    fetchSales,
    locationLogs,
    addLocationLog: updateUserGps,
    updateUserGps,
    fetchLocationLogs,
    users,
    fetchUsers,
    updateUserProfile,
    teams,
    fetchTeams,
    broadcastRealtimeEvent,
    playNotificationChime,
    liveMapAgents,
    liveMapTeamView,
    loading,
    error,
    isConnected,
  };

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

// ============================================================================
// CUSTOM HOOK TO USE DATA CONTEXT
// ============================================================================

export const useDataContext = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useDataContext must be used within a DataProvider");
  }
  return context;
};

export default DataContext;

export const useData = () => { const context = useContext(DataContext); if (!context) throw new Error("useData must be used within a DataProvider"); return context; };


  
