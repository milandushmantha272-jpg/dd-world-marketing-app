import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeUssdBridgePlugin {
  dialUssd(options: { code: string }): Promise<{ status: string; message: string }>;
}

const NativeUssdBridge = registerPlugin<NativeUssdBridgePlugin>('NativeUssdBridge');

export const dialNativeUssd = async (code: '#616#' | '#828#') => {
  if (!Capacitor.isNativePlatform()) {
    const encoded = encodeURIComponent(code);
    window.location.href = `tel:${encoded}`;
    return { status: 'DIALER_FALLBACK', message: 'Native Android USSD bridge is unavailable on web.' };
  }
  return NativeUssdBridge.dialUssd({ code });
};
