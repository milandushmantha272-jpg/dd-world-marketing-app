/**
 * DD World Marketing App - Authentication Context
 * User login/logout tracking, app status management, and authentication state
 * Tracks login counts, download counts, and active employee app usage
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAuth,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  setDoc,
  getDoc,
  Timestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { User, RoleLevel, FIRESTORE_COLLECTIONS } from "../types";

// ============================================================================
// AUTH CONTEXT TYPES
// ============================================================================

export interface AuthContextType {
  // Auth State
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Auth Methods
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    teamId?: string
  ) => Promise<void>;

  // User Status Management - Direct Firestore Updates
  updateUserAppStatus: (userId: string, status: "online" | "offline" | "away") => Promise<void>;
  updateLoginCountInFirestore: (userId: string) => Promise<void>;
  updateDownloadCountInFirestore: (userId: string) => Promise<void>;
  logUserActivity: (
    userId: string,
    activityType: string,
    details?: Record<string, any>
  ) => Promise<void>;

  // Session Management
  extendSession: (userId: string) => Promise<void>;
  terminateSession: (userId: string, sessionToken: string) => Promise<void>;
  getActiveSessions: (userId: string) => Promise<string[]>;

  // App Lifecycle
  handleAppInstall: (userId: string) => Promise<void>;
  handleAppUninstall: (userId: string) => Promise<void>;
}

// ============================================================================
// AUTH CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTH PROVIDER COMPONENT
// ============================================================================

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ========================================================================
  // FIRESTORE & AUTH UTILITIES
  // ========================================================================

  const getFirestoreInstance = useCallback(() => {
    try {
      const app = getApp();
      return getFirestore(app);
    } catch (err) {
      console.error("Firebase app not initialized:", err);
      throw err;
    }
  }, []);

  const getAuthInstance = useCallback(() => {
    try {
      const app = getApp();
      return getAuth(app);
    } catch (err) {
      console.error("Firebase app not initialized:", err);
      throw err;
    }
  }, []);

  /**
   * Generate unique session token
   */
  const generateSessionToken = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  /**
   * Fetch user profile from Firestore
   */
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<User | null> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          return userSnap.data() as User;
        }
        return null;
      } catch (err) {
        console.error("Error fetching user profile:", err);
        return null;
      }
    },
    [getFirestoreInstance]
  );

  /**
   * Create new user document in Firestore with Trainee Agent role
   */
  const createUserInFirestore = useCallback(
    async (userId: string, email: string, fullName: string, phoneNumber: string, teamId?: string): Promise<User> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const now = Timestamp.now().toMillis();

        // Create new user with Trainee Agent role (entry level)
        const newUserData: User = {
          id: userId,
          email,
          phoneNumber,
          fullName,
          role: RoleLevel.TRAINEE_AGENT,
          roleMetadata: {
            level: RoleLevel.TRAINEE_AGENT,
            displayName: "Trainee Agent",
            description: "Newly registered field agent",
            badges: [],
            canAuditAttendance: false,
            canViewRealTimeSales: false,
          },
          teamId: teamId || "",
          isActive: true,
          appStatus: "offline",
          lastLoginAt: now,
          lastLogoutAt: undefined,
          loginCount: 0,
          downloadCount: 1,
          createdAt: now,
          updatedAt: now,
          metadata: {
            sessionTokens: [generateSessionToken()],
            deviceInfo: navigator.userAgent,
          },
        };

        await setDoc(userRef, newUserData);

        // Log registration activity
        await logUserActivity(userId, "USER_REGISTERED", {
          email,
          fullName,
          phoneNumber,
          teamId,
          role: RoleLevel.TRAINEE_AGENT,
        });

        return newUserData;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to create user in Firestore";
        console.error(errorMsg, err);
        throw new Error(errorMsg);
      }
    },
    [getFirestoreInstance]
  );

  // ========================================================================
  // AUTHENTICATION METHODS
  // ========================================================================

  /**
   * User login with email and password
   * Logs login timestamp and increments login count directly to Firestore
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const auth = getAuthInstance();
        await setPersistence(auth, browserLocalPersistence);

        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Fetch or create user profile
        let userProfile = await fetchUserProfile(firebaseUser.uid);

        if (!userProfile) {
          // User exists in Auth but not in Firestore - create profile
          userProfile = await createUserInFirestore(
            firebaseUser.uid,
            firebaseUser.email || email,
            firebaseUser.displayName || "User",
            firebaseUser.phoneNumber || ""
          );
        }

        // ================================================================
        // UPDATE LOGIN TIMESTAMP & INCREMENT LOGIN COUNT IN FIRESTORE
        // ================================================================
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid);
        const now = Timestamp.now().toMillis();
        const sessionToken = generateSessionToken();

        await updateDoc(userRef, {
          appStatus: "online",
          lastLoginAt: now,
          loginCount: (userProfile.loginCount || 0) + 1,
          metadata: {
            ...userProfile.metadata,
            sessionTokens: [...(userProfile.metadata?.sessionTokens || []), sessionToken],
            deviceInfo: navigator.userAgent,
            lastLoginDevice: {
              userAgent: navigator.userAgent,
              timestamp: now,
            },
          },
          updatedAt: now,
        });

        // Log login activity for audit trail
        await logUserActivity(firebaseUser.uid, "USER_LOGIN", {
          email,
          timestamp: now,
          device: navigator.userAgent,
          sessionToken,
        });

        // Fetch updated profile
        const updatedProfile = await fetchUserProfile(firebaseUser.uid);
        setCurrentUserProfile(updatedProfile);
        setCurrentUser(firebaseUser);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Login failed";
        setError(errorMsg);
        console.error("Login error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthInstance, getFirestoreInstance, fetchUserProfile, createUserInFirestore]
  );

  /**
   * User registration
   * Creates new user as Trainee Agent with initial download count = 1
   */
  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phoneNumber: string,
      teamId?: string
    ): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);

        const auth = getAuthInstance();
        await setPersistence(auth, browserLocalPersistence);

        // Create Firebase Auth account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Update Auth profile
        await updateProfile(firebaseUser, {
          displayName: fullName,
        });

        // Create user profile in Firestore as Trainee Agent
        const userProfile = await createUserInFirestore(firebaseUser.uid, email, fullName, phoneNumber, teamId);

        // Set initial online status
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid);
        const now = Timestamp.now().toMillis();

        await updateDoc(userRef, {
          appStatus: "online",
          lastLoginAt: now,
          loginCount: 1,
          updatedAt: now,
        });

        setCurrentUser(firebaseUser);
        setCurrentUserProfile(userProfile);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Registration failed";
        setError(errorMsg);
        console.error("Registration error:", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthInstance, createUserInFirestore, getFirestoreInstance]
  );

  /**
   * User logout
   * Logs logout timestamp and sets app status to offline in Firestore
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setError(null);

      if (!currentUser) return;

      // ================================================================
      // UPDATE LOGOUT TIMESTAMP IN FIRESTORE
      // ================================================================
      const db = getFirestoreInstance();
      const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
      const now = Timestamp.now().toMillis();

      // Get current profile to preserve other data
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const currentData = userSnap.data();

        await updateDoc(userRef, {
          appStatus: "offline",
          lastLogoutAt: now,
          metadata: {
            ...currentData.metadata,
            lastLogoutDevice: {
              userAgent: navigator.userAgent,
              timestamp: now,
            },
          },
          updatedAt: now,
        });
      }

      // Log logout activity for audit trail
      await logUserActivity(currentUser.uid, "USER_LOGOUT", {
        email: currentUser.email,
        timestamp: now,
        device: navigator.userAgent,
      });

      // Sign out from Firebase Auth
      const auth = getAuthInstance();
      await signOut(auth);

      setCurrentUser(null);
      setCurrentUserProfile(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Logout failed";
      setError(errorMsg);
      console.error("Logout error:", err);
      throw err;
    }
  }, [currentUser, getFirestoreInstance, getAuthInstance]);

  // ========================================================================
  // USER STATUS & ACTIVITY TRACKING - DIRECT FIRESTORE UPDATES
  // ========================================================================

  /**
   * Update user app status (online/offline/away) in Firestore
   * Used to track real-time agent availability on Live Map
   */
  const updateUserAppStatus = useCallback(
    async (userId: string, status: "online" | "offline" | "away"): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const now = Timestamp.now().toMillis();

        await updateDoc(userRef, {
          appStatus: status,
          updatedAt: now,
        });

        // Update local state if this is current user
        if (currentUserProfile?.id === userId) {
          setCurrentUserProfile((prev) =>
            prev ? { ...prev, appStatus: status, updatedAt: now } : null
          );
        }

        console.log(`User ${userId} app status updated to: ${status}`);
      } catch (err) {
        console.error("Error updating user app status:", err);
        throw err;
      }
    },
    [getFirestoreInstance, currentUserProfile?.id]
  );

  /**
   * Increment login count for user in Firestore
   * Called explicitly when tracking additional logins
   */
  const updateLoginCountInFirestore = useCallback(
    async (userId: string): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentLoginCount = userData.loginCount || 0;
          const now = Timestamp.now().toMillis();

          await updateDoc(userRef, {
            loginCount: currentLoginCount + 1,
            lastLoginAt: now,
            updatedAt: now,
          });

          // Update local state if this is current user
          if (currentUserProfile?.id === userId) {
            setCurrentUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    loginCount: currentLoginCount + 1,
                    lastLoginAt: now,
                    updatedAt: now,
                  }
                : null
            );
          }

          console.log(`User ${userId} login count incremented to: ${currentLoginCount + 1}`);
        }
      } catch (err) {
        console.error("Error updating login count:", err);
        throw err;
      }
    },
    [getFirestoreInstance, currentUserProfile?.id]
  );

  /**
   * Increment download count for user in Firestore
   * Called when app is installed/upgraded/re-downloaded
   */
  const updateDownloadCountInFirestore = useCallback(
    async (userId: string): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentDownloadCount = userData.downloadCount || 0;
          const now = Timestamp.now().toMillis();

          await updateDoc(userRef, {
            downloadCount: currentDownloadCount + 1,
            updatedAt: now,
          });

          // Update local state if this is current user
          if (currentUserProfile?.id === userId) {
            setCurrentUserProfile((prev) =>
              prev
                ? {
                    ...prev,
                    downloadCount: currentDownloadCount + 1,
                    updatedAt: now,
                  }
                : null
            );
          }

          console.log(`User ${userId} download count incremented to: ${currentDownloadCount + 1}`);
        }
      } catch (err) {
        console.error("Error updating download count:", err);
        throw err;
      }
    },
    [getFirestoreInstance, currentUserProfile?.id]
  );

  /**
   * Log user activity for audit trail and analytics
   * Stores in subcollection: users/{userId}/activities
   */
  const logUserActivity = useCallback(
    async (userId: string, activityType: string, details?: Record<string, any>): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const activitiesRef = collection(db, `${FIRESTORE_COLLECTIONS.USERS}/${userId}/activities`);

        await addDoc(activitiesRef, {
          type: activityType,
          details: details || {},
          timestamp: Timestamp.now().toMillis(),
          userAgent: navigator.userAgent,
          platform: {
            os: navigator.platform,
            language: navigator.language,
          },
        });

        console.log(`Activity logged for user ${userId}: ${activityType}`);
      } catch (err) {
        console.error("Error logging user activity:", err);
      }
    },
    [getFirestoreInstance]
  );

  // ========================================================================
  // SESSION MANAGEMENT
  // ========================================================================

  /**
   * Extend current user session (30-minute timeout)
   * Updates session timeout in user metadata
   */
  const extendSession = useCallback(
    async (userId: string): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const now = Timestamp.now().toMillis();
          const sessionTimeout = now + 30 * 60 * 1000;

          await updateDoc(userRef, {
            metadata: {
              ...userSnap.data().metadata,
              sessionTimeout,
              lastActivityAt: now,
            },
            updatedAt: now,
          });

          console.log(`Session extended for user ${userId} until ${new Date(sessionTimeout)}`);
        }
      } catch (err) {
        console.error("Error extending session:", err);
        throw err;
      }
    },
    [getFirestoreInstance]
  );

  /**
   * Terminate specific session token (revoke session)
   * Removes token from sessionTokens array
   */
  const terminateSession = useCallback(
    async (userId: string, sessionToken: string): Promise<void> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentTokens = userData.metadata?.sessionTokens || [];
          const updatedTokens = currentTokens.filter((token: string) => token !== sessionToken);

          await updateDoc(userRef, {
            metadata: {
              ...userData.metadata,
              sessionTokens: updatedTokens,
            },
            updatedAt: Timestamp.now().toMillis(),
          });

          console.log(`Session ${sessionToken} terminated for user ${userId}`);
        }
      } catch (err) {
        console.error("Error terminating session:", err);
        throw err;
      }
    },
    [getFirestoreInstance]
  );

  /**
   * Get all active session tokens for user
   */
  const getActiveSessions = useCallback(
    async (userId: string): Promise<string[]> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const tokens = userSnap.data().metadata?.sessionTokens || [];
          console.log(`Retrieved ${tokens.length} active sessions for user ${userId}`);
          return tokens;
        }
        return [];
      } catch (err) {
        console.error("Error getting active sessions:", err);
        return [];
      }
    },
    [getFirestoreInstance]
  );

  // ========================================================================
  // APP LIFECYCLE MANAGEMENT
  // ========================================================================

  /**
   * Handle app installation
   * Increments download count and logs install event
   */
  const handleAppInstall = useCallback(
    async (userId: string): Promise<void> => {
      try {
        console.log("App install detected for user:", userId);
        await updateDownloadCountInFirestore(userId);

        await logUserActivity(userId, "APP_INSTALLED", {
          timestamp: Timestamp.now().toMillis(),
          device: navigator.userAgent,
        });
      } catch (err) {
        console.error("Error handling app install:", err);
        throw err;
      }
    },
    [updateDownloadCountInFirestore]
  );

  /**
   * Handle app uninstallation
   * Logs uninstall event and sets offline status
   */
  const handleAppUninstall = useCallback(
    async (userId: string): Promise<void> => {
      try {
        console.log("App uninstall detected for user:", userId);

        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);

        await updateDoc(userRef, {
          appStatus: "offline",
          updatedAt: Timestamp.now().toMillis(),
        });

        await logUserActivity(userId, "APP_UNINSTALLED", {
          timestamp: Timestamp.now().toMillis(),
          device: navigator.userAgent,
        });
      } catch (err) {
        console.error("Error handling app uninstall:", err);
        throw err;
      }
    },
    [getFirestoreInstance]
  );

  // ========================================================================
  // AUTH STATE LISTENER
  // ========================================================================

  /**
   * Listen to Firebase Auth state changes
   * Syncs with Firestore user profile on mount/auth change
   */
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      const auth = getAuthInstance();

      unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser) => {
          try {
            if (firebaseUser) {
              setCurrentUser(firebaseUser);
              const userProfile = await fetchUserProfile(firebaseUser.uid);
              setCurrentUserProfile(userProfile);

              if (userProfile) {
                await extendSession(firebaseUser.uid);
              }
            } else {
              setCurrentUser(null);
              setCurrentUserProfile(null);
            }
          } catch (err) {
            console.error("Error in auth state listener:", err);
          } finally {
            setIsLoading(false);
          }
        },
        (err) => {
          console.error("Auth state listener error:", err);
          setError(err.message);
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error("Error setting up auth state listener:", err);
      setIsLoading(false);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [getAuthInstance, fetchUserProfile, extendSession]);

  // ========================================================================
  // CONTEXT VALUE
  // ========================================================================

  const contextValue: AuthContextType = {
    currentUser,
    currentUserProfile,
    isAuthenticated: !!currentUser,
    isLoading,
    error,
    login,
    logout,
    register,
    updateUserAppStatus,
    updateLoginCountInFirestore,
    updateDownloadCountInFirestore,
    logUserActivity,
    extendSession,
    terminateSession,
    getActiveSessions,
    handleAppInstall,
    handleAppUninstall,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

// ============================================================================
// CUSTOM HOOK TO USE AUTH CONTEXT
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
