import type { AppActivationStatus, ProductSale } from '../types';

/** Business rules for APP activations. Customer/agent confirmation never proves a Dialog sale. */
export const APP_DUPLICATE_WINDOW_DAYS = 7;

export const isAppActivationCountable = (sale: Pick<ProductSale, 'activationMethod' | 'activationStatus' | 'verificationStatus'>): boolean => {
  return sale.activationMethod === 'APP_LINK_SHARE' &&
    sale.activationStatus === 'COMPLETED' &&
    sale.verificationStatus === 'VERIFIED';
};

export const getAppActivationStatusAfterCustomerConfirmation = (): AppActivationStatus => 'CUSTOMER_CONFIRMED';

export const getAppActivationStatusForDuplicate = (): AppActivationStatus => 'DUPLICATE';

export const isWithinDuplicateWindow = (createdAt: string, now = new Date()): boolean => {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  const ageMs = now.getTime() - created;
  return ageMs >= 0 && ageMs <= APP_DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

export const maskCustomerMobile = (mobile?: string): string => {
  if (!mobile) return '';
  const normalized = mobile.replace(/\D/g, '');
  if (normalized.length < 4) return '****';
  return `${'*'.repeat(Math.max(0, normalized.length - 4))}${normalized.slice(-4)}`;
};
