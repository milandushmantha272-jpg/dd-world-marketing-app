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
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  addDoc
} from "firebase/firestore";
import { getApp } from "firebase/app";
import {
  ProductSale,
  LocationLog,
  User,
  Team,
  SaleVerificationStatus,
  DataContextType,
  LiveMapAgent,
  LiveMapTeamView,
  FIRESTORE_COLLECTIONS
} from "../types";

const DataContext = createContext<DataContextType | undefined>(undefined);

const playNotificationChime = (): void => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
    if (navigator.vibrate) navigator.vibrate();
  } catch (error) {
    console.error("Notification chime error:", error);
  }
};

const getFirestoreInstance = () => {
  try {
    const app = getApp();
    return getFirestore(app);
  } catch (error) {
    console.error("Firebase app not initialized:", error);
    throw error;
  }
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    let isMounted = true;
    const db = getFirestoreInstance();
    setLoading(true);

    const usersQuery = query(collection(db, FIRESTORE_COLLECTIONS.USERS));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      if (!isMounted) return;
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as User);
      });
      setUsers(usersList);
      setLoading(false);
    }, (err) => {
      setError(err.message);
      setLoading(false);
    });

    const salesQuery = query(collection(db, FIRESTORE_COLLECTIONS.SALES), orderBy("createdAt", "desc"), limit(100));
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      if (!isMounted) return;
      const salesList: ProductSale[] = [];
      snapshot.forEach((doc) => {
        salesList.push({ id: doc.id, ...doc.data() } as ProductSale);
      });
      if (salesList.length > sales.length && sales.length > 0) {
        playNotificationChime();
      }
      setSales(salesList);
    });

    unsubscribesRef.current = [unsubscribeUsers, unsubscribeSales];

    return () => {
      isMounted = false;
      unsubscribesRef.current.forEach((unsub) => unsub());
    };
  }, [sales.length]);

  const addSale = useCallback(async (saleData: Omit<ProductSale, "id" | "createdAt" | "updatedAt">) => {
    try {
      const db = getFirestoreInstance();
      const now = Timestamp.now().toMillis();
      await addDoc(collection(db, FIRESTORE_COLLECTIONS.SALES), { ...saleData, createdAt: now, updatedAt: now });
    } catch (err) {
      throw err;
    }
  }, []);

  const updateSaleStatus = useCallback(async (saleId: string, status: SaleVerificationStatus) => {
    try {
      const db = getFirestoreInstance();
      await updateDoc(doc(db, FIRESTORE_COLLECTIONS.SALES, saleId), { verificationStatus: status, updatedAt: Timestamp.now().toMillis() });
    } catch (err) {
      throw err;
    }
  }, []);

  const logLocation = useCallback(async (locationData: Omit<LocationLog, "id" | "timestamp">) => {
    try {
      const db = getFirestoreInstance();
      await addDoc(collection(db, FIRESTORE_COLLECTIONS.LOCATION_LOGS), { ...locationData, timestamp: Timestamp.now().toMillis() });
    } catch (err) {
      console.error(err);
    }
  }, []);

  const contextValue: DataContextType = {
    sales,
    locationLogs,
    users,
    teams,
    liveMapAgents,
    liveMapTeamView,
    loading,
    error,
    isConnected,
    addSale,
    updateSaleStatus,
    logLocation
  };

  return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) throw new Error("useData must be used within a DataProvider structure.");
  return context;
};

export default DataContext;
