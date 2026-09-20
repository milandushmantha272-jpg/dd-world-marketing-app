import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NativeUssdResult {
  status: string;
  message: string;
  response?: string;
  failureCode?: number;
}

export interface NativeUssdBridgePlugin {
  dialUssd(options: { code: string }): Promise<NativeUssdResult>;
}

const NativeUssdBridge = registerPlugin<NativeUssdBridgePlugin>('NativeUssdBridge');

export type SupportedDialString = string;

export const dialNativeUssd = async (code: SupportedDialString): Promise<NativeUssdResult> => {
  const dialString = code.trim();
  const isValidDialString = /^[0-9*#+(),;N -]{1,32}$/.test(dialString);

  if (!isValidDialString || dialString.length === 0) {
    throw new Error('Invalid dial string');
  }

  if (!Capacitor.isNativePlatform()) {
    return {
      status: 'WEB_UNAVAILABLE',
      message: 'Native Android USSD bridge is unavailable in the browser.',
    };
  }

  return NativeUssdBridge.dialUssd({ code: dialString });
};
