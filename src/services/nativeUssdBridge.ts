import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeUssdBridgePlugin {
  dialUssd(options: { code: string }): Promise<{ status: string; message: string }>;
}

const NativeUssdBridge = registerPlugin<NativeUssdBridgePlugin>('NativeUssdBridge');

export type SupportedDialString = string;

export const dialNativeUssd = async (code: SupportedDialString) => {
  const dialString = code.trim();
  const isApprovedUssd = dialString === '#616#' || dialString === '#828#';
  const isValidDialString = /^[0-9*#+(),;N -]{1,32}$/.test(dialString);

  if (!isValidDialString || (!isApprovedUssd && dialString.length === 0)) {
    throw new Error('Invalid dial string');
  }

  if (!Capacitor.isNativePlatform()) {
    const encoded = encodeURIComponent(dialString);
    window.location.href = `tel:${encoded}`;
    return {
      status: 'DIALER_FALLBACK',
      message: 'Native Android bridge is unavailable on web.',
    };
  }

  return NativeUssdBridge.dialUssd({ code: dialString });
};
