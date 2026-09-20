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

export function createUssdEvidenceState(
  flow: UssdFlow,
  startedAt = new Date().toISOString(),
): UssdEvidenceState {
  return {
    flow,
    startedAt,
    currentStep: 'DIAL_STARTED',
    status: 'PENDING',
    events: [{ at: startedAt, step: 'DIAL_STARTED' }],
  };
}

export function isFlowStepAllowed(flow: UssdFlow, step: UssdStep): boolean {
  if (flow === 'SAYURU') return step !== 'CROPS';
  return step !== 'ZONE';
}

export function hasRequiredPreSuccessSteps(state: UssdEvidenceState): boolean {
  const steps = new Set(state.events.map((event) => event.step));
  const required = ['CUSTOMER_NUMBER', 'OTP', 'CONFIRMATION'];
  if (state.flow === 'SAYURU') required.splice(2, 0, 'ZONE');
  else required.splice(2, 0, 'CROPS');
  return required.every((step) => steps.has(step as UssdStep));
}

export function reduceUssdEvidence(
  state: UssdEvidenceState,
  event: UssdEvidenceEvent,
): UssdEvidenceState {
  if (!isFlowStepAllowed(state.flow, event.step)) return state;

  const last = state.events[state.events.length - 1];
  if (last?.step === event.step && last.text === event.text) return state;
  if (state.status !== 'PENDING') return state;

  const currentOrder = stepOrder[state.currentStep];
  const nextOrder = stepOrder[event.step];
  const isTerminalEvent = event.step === 'FAILED' || event.step === 'CANCELLED' || event.step === 'UNVERIFIED';
  if (!isTerminalEvent && nextOrder < currentOrder) return state;
  if (event.step === 'SUCCESS' && !hasRequiredPreSuccessSteps(state)) return state;

  // A device-reported USSD success is only evidence, never a verified sale.
  // Keep it UNVERIFIED until the Manager completes Dialog Q/C verification.
  let status: EvidenceStatus = state.status;
  if (event.step === 'SUCCESS') status = 'UNVERIFIED';
  if (event.step === 'FAILED' || event.step === 'CANCELLED') status = 'FAILED';
  if (event.step === 'UNVERIFIED') status = 'UNVERIFIED';

  return {
    ...state,
    currentStep: event.step,
    status,
    events: [...state.events, event],
  };
}

export function hasTerminalSuccess(_state: UssdEvidenceState): boolean {
  // Deliberately false: Dialog Q/C approval is required separately.
  return false;
}

// Dialog Q/C verification is required before a sale can be counted.
export function isCountableEvidence(_state: UssdEvidenceState): boolean {
  return false;
}
