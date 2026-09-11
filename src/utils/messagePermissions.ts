import { UserRole } from '../types';

/**
 * DD WORLD MARKETING internal communication policy.
 * Dialog Officers are a restricted liaison role: only Owner <-> Dialog Officer
 * communication is permitted. Agents/TLs must route through the Owner.
 */
export const canSendInternalMessage = (
  senderRole: UserRole,
  receiverRole: UserRole
): boolean => {
  if (senderRole === 'owner') {
    return receiverRole === 'dialog_officer' || receiverRole === 'team_leader' || receiverRole === 'agent';
  }
  if (senderRole === 'dialog_officer') {
    return receiverRole === 'owner';
  }
  if (senderRole === 'team_leader') {
    return receiverRole === 'owner' || receiverRole === 'agent';
  }
  if (senderRole === 'agent') {
    return receiverRole === 'team_leader';
  }
  return false;
};

export const isDialogOfficerPrivateChannel = (
  senderRole: UserRole,
  receiverRole: UserRole
): boolean =>
  (senderRole === 'owner' && receiverRole === 'dialog_officer') ||
  (senderRole === 'dialog_officer' && receiverRole === 'owner');
