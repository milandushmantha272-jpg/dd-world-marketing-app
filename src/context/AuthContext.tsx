
/**
 * DD World Marketing App - Authentication Context
 * User login/logout tracking, app status management, and authentication state
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  getAuth,
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
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
} from "firebase/firestore";
import { getApp } from "firebase/app";
import { User, RoleLevel, FIRESTORE_COLLECTIONS } from "../types";

const OWNER_EMAIL = "milandushmantha272@gmail.com";

export interface AuthContextType {
  currentUser: FirebaseUser | null;
  currentUserProfile: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  registerEmployee: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string,
    role: RoleLevel,
    teamId?: string
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const generateSessionToken = (): string => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const logUserActivity = async (userId: string, activityType: string, details?: any) => {
    try {
      const db = getFirestoreInstance();
      await addDoc(collection(db, "activity_logs"), {
        userId,
        activityType,
        details: details || {},
        timestamp: Timestamp.now().toMillis()
      });
    } catch (e) {
      console.error("Activity logging failed", e);
    }
  };

  const fetchUserProfile = useCallback(
    async (userId: string): Promise<User | null> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) return userSnap.data() as User;
        return null;
      } catch (err) {
        console.error("Error fetching user profile:", err);
        return null;
      }
    },
    [getFirestoreInstance]
  );

  const createUserInFirestore = useCallback(
    async (userId: string, email: string, fullName: string, phoneNumber: string, assignedRole?: RoleLevel, teamId?: string): Promise<User> => {
      try {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, userId);
        const now = Timestamp.now().toMillis();
        const finalRole = email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? RoleLevel.OWNER : (assignedRole || RoleLevel.TRAINEE_AGENT);

        const newUserData: User = {
          id: userId,
          email,
          phoneNumber,
          fullName,
          role: finalRole,
          roleMetadata: {
            level: finalRole,
            displayName: finalRole === RoleLevel.OWNER ? "Company Owner" : "Employee",
            description: finalRole === RoleLevel.OWNER ? "Full Access Administrator" : "Field Force",
            badges: [],
            canAuditAttendance: finalRole === RoleLevel.OWNER,
            canViewRealTimeSales: finalRole === RoleLevel.OWNER,
          },
          teamId: teamId || "",
          isActive: true,
          appStatus: "offline",
          lastLoginAt: now,
          loginCount: 1,
          downloadCount: 1,
          createdAt: now,
          updatedAt: now,
          name: fullName,
          agentCode: generateSessionToken().substring(8, 12),
          metadata: {
            sessionTokens: [generateSessionToken()],
            deviceInfo: navigator.userAgent,
          },
        };

        await setDoc(userRef, newUserData);
        await logUserActivity(userId, "USER_CREATED_IN_DB", { email, role: finalRole });
        return newUserData;
      } catch (err) {
        console.error("Failed to create user in Firestore", err);
        throw err;
      }
    },
    [getFirestoreInstance]
  );

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setError(null);
        setIsLoading(true);
        const auth = getAuthInstance();
        await setPersistence(auth, browserLocalPersistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        let userProfile = await fetchUserProfile(firebaseUser.uid);
        if (!userProfile) {
          userProfile = await createUserInFirestore(firebaseUser.uid, firebaseUser.email || email, "User", "");
        }

        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, firebaseUser.uid);
        const now = Timestamp.now().toMillis();

        await updateDoc(userRef, {
          appStatus: "online",
          lastLoginAt: now,
          loginCount: (userProfile.loginCount || 0) + 1,
        });

        setCurrentUser(firebaseUser);
        setCurrentUserProfile(userProfile);
        await logUserActivity(firebaseUser.uid, "USER_LOGIN_SUCCESS");
      } catch (err: any) {
        setError(err.message || "Login failed");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [getAuthInstance, fetchUserProfile, createUserInFirestore, getFirestoreInstance]
  );

  const registerEmployee = useCallback(
    async (email: string, password: string, fullName: string, phoneNumber: string, role: RoleLevel, teamId?: string): Promise<void> => {
      try {
        if (!currentUserProfile || currentUserProfile.role !== RoleLevel.OWNER) {
          throw new Error("Only the Company Owner can create new users/employees.");
        }
        console.log(`Creating employee account for ${email} with role ${role}`);
      } catch (err: any) {
        throw new Error(err.message || "Failed to register employee");
      }
    },
    [currentUserProfile]
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      const auth = getAuthInstance();
      if (currentUser) {
        const db = getFirestoreInstance();
        const userRef = doc(db, FIRESTORE_COLLECTIONS.USERS, currentUser.uid);
        await updateDoc(userRef, { appStatus: "offline", lastLogoutAt: Timestamp.now().toMillis() });
        await logUserActivity(currentUser.uid, "USER_LOGOUT");
      }
      await signOut(auth);
      setCurrentUser(null);
      setCurrentUserProfile(null);
    } catch (err) {
      console.error("Logout error", err);
    }
  }, [getAuthInstance, getFirestoreInstance, currentUser]);

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const profile = await fetchUserProfile(user.uid);
        setCurrentUserProfile(profile);
      } else {
        setCurrentUser(null);
        setCurrentUserProfile(null);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [getAuthInstance, fetchUserProfile]);

  const value = {
    currentUser,
    currentUserProfile,
    isAuthenticated: !!currentUser,
    isLoading,
    error,
    login,
    logout,
    registerEmployee
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

export default AuthContext;
