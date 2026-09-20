export type UssdFlow = 'SAYURU' | 'GOVIMITHURU';

export type UssdStep =
  | 'DIAL_STARTED'
  | 'CUSTOMER_NUMBER'
  | 'OTP'
  | 'ZONE'
  | 'CROPS'
  | 'CONFIRMATION'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNVERIFIED';

export type EvidenceStatus = 'PENDING' | 'COMPLETED' | 'UNVERIFIED' | 'FAILED';

export interface UssdEvidenceEvent {
  at: string;
  step: UssdStep;
  text?: string;
}

export interface UssdEvidenceState {
  flow: UssdFlow;
  startedAt: string;
  currentStep: UssdStep;
  status: EvidenceStatus;
  events: UssdEvidenceEvent[];
}

const stepOrder: Record<UssdStep, number> = {
  DIAL_STARTED: 0,
  CUSTOMER_NUMBER: 1,
  OTP: 2,
  ZONE: 3,
  CROPS: 3,
  CONFIRMATION: 4,
  SUCCESS: 5,
  FAILED: 6,
  CANCELLED: 6,
  UNVERIFIED: 6,
};

export function createUssdEvidenceState(flow: UssdFlow, startedAt = new Date().toISOString()): UssdEvidenceState {
  return {
    flow,
    startedAt,
    currentStep: 'DIAL_STARTED',
    status: 'PENDING',
    events: [{ at: startedAt, step: 'DIAL_STARTED' }],
  };
}

export function reduceUssdEvidence(
  state: UssdEvidenceState,
  event: UssdEvidenceEvent,
): UssdEvidenceState {
  const last = state.events[state.events.length - 1];
  const duplicate = last?.step === event.step && last.text === event.text;
  if (duplicate) return state;

  const nextEvents = [...state.events, event];
  let status: EvidenceStatus = state.status;
  if (event.step === 'SUCCESS') status = 'COMPLETED';
  if (event.step === 'FAILED' || event.step === 'CANCELLED') status = 'FAILED';
  if (event.step === 'UNVERIFIED') status = 'UNVERIFIED';

  return {
    ...state,
    currentStep: event.step,
    status,
    events: nextEvents,
  };
}

export function isFlowStepAllowed(flow: UssdFlow, step: UssdStep): boolean {
  if (flow === 'SAYURU') return step !== 'CROPS';
  return step !== 'ZONE';
}

export function hasTerminalSuccess(state: UssdEvidenceState): boolean {
  return state.status === 'COMPLETED' && state.currentStep === 'SUCCESS';
}

export function isCountableEvidence(state: UssdEvidenceState): boolean {
  return false;
}
