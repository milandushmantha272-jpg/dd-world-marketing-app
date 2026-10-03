import { supabase } from './supabase';

export const ACTIVATION_DIAL_CODES = {
  GOVIMITHURU: '*616#',
  SAYURU: '*828#',
} as const;

export type ActivationProduct = 'govimithuru' | 'sayuru';
export type ActivationPath = 'USSD_IVR' | 'APP_DIGITAL';
export type ActivationStatus =
  | 'pending_junior_tl_review'
  | 'pending_kyc_verification'
  | 'activated'
  | 'rejected';

export interface ActivationGpsSnapshot {
  latitude: number;
  longitude: number;
  accuracy: number;
  capturedAt: string;
}

export interface ActivationStartInput {
  product: ActivationProduct;
  path: ActivationPath;
  agentId: string;
  agentCode?: string | null;
  teamId?: string | null;
  amount?: number;
  notes?: string | null;
  gps: ActivationGpsSnapshot;
  idempotencyKey?: string;
}

export interface ActivationResult {
  id: string;
  status: ActivationStatus;
  startedAt: string;
}

export function dialCodeFor(product: ActivationProduct): string {
  return product === 'govimithuru' ? ACTIVATION_DIAL_CODES.GOVIMITHURU : ACTIVATION_DIAL_CODES.SAYURU;
}

export function assertValidDialCode(code: string): void {
  if (code !== ACTIVATION_DIAL_CODES.GOVIMITHURU && code !== ACTIVATION_DIAL_CODES.SAYURU) {
    throw new Error('Invalid DD WORLD USSD activation code.');
  }
}

export async function captureHighPrecisionGps(): Promise<ActivationGpsSnapshot> {
  if (!('geolocation' in navigator)) {
    throw new Error('Device GPS is unavailable. Activation cannot start without a live GPS snapshot.');
  }

  return await new Promise<ActivationGpsSnapshot>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracy)) {
          reject(new Error('Device returned an invalid GPS snapshot.'));
          return;
        }
        resolve({
          latitude,
          longitude,
          accuracy,
          capturedAt: new Date().toISOString(),
        });
      },
      (error) => reject(new Error(`GPS capture failed: ${error.message}`)),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  });
}

export async function startActivation(input: ActivationStartInput): Promise<ActivationResult> {
  if (!input.agentId) throw new Error('Authenticated agent is required.');
  if (!input.gps) throw new Error('Live GPS snapshot is required.');

  const { data, error } = await supabase.rpc('start_activation', {
    p_product: input.product,
    p_path: input.path,
    p_agent_id: input.agentId,
    p_agent_code: input.agentCode ?? null,
    p_team_id: input.teamId ?? null,
    p_amount: Number(input.amount ?? 0),
    p_notes: input.notes ?? null,
    p_latitude: input.gps.latitude,
    p_longitude: input.gps.longitude,
    p_accuracy: input.gps.accuracy,
    p_gps_captured_at: input.gps.capturedAt,
    p_idempotency_key: input.idempotencyKey ?? crypto.randomUUID(),
  });

  if (error) throw error;
  if (!data?.id || data.status !== 'pending_junior_tl_review') {
    throw new Error('Activation was not accepted into the review pipeline.');
  }

  return data as ActivationResult;
}

export async function advanceActivation(
  saleId: string,
  nextStatus: Extract<ActivationStatus, 'pending_kyc_verification' | 'activated' | 'rejected'>,
  auditReference?: string,
): Promise<ActivationResult> {
  const { data, error } = await supabase.rpc('advance_activation', {
    p_sale_id: saleId,
    p_next_status: nextStatus,
    p_audit_reference: auditReference ?? null,
  });
  if (error) throw error;
  if (!data?.id) throw new Error('Activation transition was not accepted.');
  return data as ActivationResult;
}

export function buildAppActivationUrl(): string {
  const configured = String(import.meta.env.VITE_APP_ACTIVATION_URL || '').trim();
  if (configured) return configured;
  return `${window.location.origin}/activation`;
}

/**
 * Digital activation intentionally does not append a customer phone number.
 * The customer enters it on the activation/PWA surface, so it is never placed
 * into URL history, local persistence, the sales row, or analytics payloads.
 */
export function openDigitalActivation(): void {
  window.location.assign(buildAppActivationUrl());
}
