import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from './firebase';

const NATIVE_BACKEND_URL = 'https://ais-dev-x3vgvdkcnqcxy6kg52vg7i-814098050496.asia-east1.run.app';

export interface NativeGpsBridgePlugin {
  startTracking(options: {
    employeeId: string;
    agentCode: string;
    teamId: string;
    trackingSessionId: string;
    firebaseCustomToken: string;
  }): Promise<{ status: string; message: string }>;
  stopTracking(): Promise<{ status: string; message: string }>;
  getTrackingStatus(): Promise<{
    isServiceRunning: boolean;
    isAuthorized: boolean;
    activeSessionId: string;
    isBatteryOptimizationIgnored: boolean;
  }>;
}

const NativeGpsBridge = registerPlugin<NativeGpsBridgePlugin>('NativeGpsBridge');

export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform() || (typeof window !== 'undefined' && (window as any).Capacitor?.isNative);
};

const exchangeFirebaseTokenForNativeSession = async (): Promise<string> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Firebase Auth session is required before starting native GPS.');

  const idToken = await currentUser.getIdToken(true);
  const response = await fetch(`${NATIVE_BACKEND_URL}/api/native-auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!response.ok) throw new Error(`Native Firebase session exchange failed (${response.status}).`);
  const payload = await response.json();
  if (!payload?.customToken) throw new Error('Native Firebase session token was not returned.');
  return String(payload.customToken);
};

export const startNativeForegroundGpsTracking = async (params: {
  employeeId: string;
  agentCode: string;
  teamId: string;
  trackingSessionId: string;
}) => {
  if (!isNativePlatform()) {
    console.log('🌐 Web Environment Detected: Using PWA geolocation + Firestore persistence');
    return undefined;
  }

  const firebaseCustomToken = await exchangeFirebaseTokenForNativeSession();
  const result = await NativeGpsBridge.startTracking({ ...params, firebaseCustomToken });
  console.log('⚡ Secured Native Android Location Service Started:', result);
  return result;
};

export const stopNativeForegroundGpsTracking = async () => {
  if (!isNativePlatform()) return undefined;
  const result = await NativeGpsBridge.stopTracking();
  console.log('🛑 Native Android Location Service Stopped:', result);
  return result;
};

export const checkNativeGpsStatus = async () => {
  if (isNativePlatform()) {
    try {
      return await NativeGpsBridge.getTrackingStatus();
    } catch (err) {
      console.error('Error fetching native GPS status:', err);
    }
  }
  return {
    isServiceRunning: false,
    isAuthorized: false,
    activeSessionId: '',
    isBatteryOptimizationIgnored: true,
  };
};
