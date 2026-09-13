import { Capacitor, registerPlugin } from '@capacitor/core';
import { auth } from './firebase';

export interface NativeGpsBridgePlugin {
  startTracking(options: {
    employeeId: string;
    agentCode: string;
    teamId: string;
    trackingSessionId: string;
    firebaseIdToken: string;
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

export const startNativeForegroundGpsTracking = async (params: {
  employeeId: string;
  agentCode: string;
  teamId: string;
  trackingSessionId: string;
}) => {
  if (isNativePlatform()) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Firebase Auth session is required before native GPS tracking.');
      const firebaseIdToken = await user.getIdToken(true);
      const result = await NativeGpsBridge.startTracking({ ...params, firebaseIdToken });
      console.log('⚡ Native Android Location Service Started:', result);
      return result;
    } catch (err) {
      console.error('Failed to start native location tracking:', err);
    }
  } else {
    console.log('🌐 Web Environment Detected: Using PWA geolocation + Firestore persistence');
  }
};

export const stopNativeForegroundGpsTracking = async () => {
  if (isNativePlatform()) {
    try {
      const result = await NativeGpsBridge.stopTracking();
      console.log('🛑 Native Android Location Service Stopped:', result);
      return result;
    } catch (err) {
      console.error('Failed to stop native location tracking:', err);
    }
  }
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
