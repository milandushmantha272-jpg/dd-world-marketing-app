import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from './supabase';

const NATIVE_BACKEND_URL = 'https://ais-dev-x3vgvdkcnqcxy6kg52vg7i-814098050496.asia-east1.run.app';

export interface NativeGpsBridgePlugin {
  startTracking(options: {
    employeeId: string;
    agentCode: string;
    teamId: string;
    trackingSessionId: string;
    supabaseAccessToken: string;
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

const getSupabaseAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Supabase session unavailable: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error('Authorized Supabase session is required before starting native GPS.');
  return token;
};

export const startNativeForegroundGpsTracking = async (params: {
  employeeId: string;
  agentCode: string;
  teamId: string;
  trackingSessionId: string;
}) => {
  if (!isNativePlatform()) {
    console.log('🌐 Web Environment Detected: Using PWA geolocation');
    return undefined;
  }

  const supabaseAccessToken = await getSupabaseAccessToken();
  const result = await NativeGpsBridge.startTracking({ ...params, supabaseAccessToken });
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
