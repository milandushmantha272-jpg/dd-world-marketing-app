import type { User as AppUser } from '../types';
import { OWNER_AGENT_CODE, OWNER_EMAIL, OWNER_NAME } from '../config/owner';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

const toAppUser = (row: Record<string, any>, authUserId: string): AppUser => ({
  ...row,
  id: row.id || authUserId,
  name: row.name || '',
  role: row.role || 'agent',
  firebaseUid: undefined,
  authUserId,
  teamId: row.team_id,
  employmentStatus: row.employment_status,
  idApprovalStatus: row.id_approval_status,
  createdAt: row.created_at,
  joinedDate: row.created_at?.slice?.(0, 10),
});

export async function signInWithEmployeeCredentials(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (!data.user) throw new Error('Supabase authentication did not return a user.');
  return data.user;
}

export async function getAuthenticatedEmployeeProfile(authUserId: string): Promise<AppUser> {
  const { data, error } = await supabase.rpc('get_my_employee_profile');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('මෙම Supabase account එකට Owner-approved employee profile එකක් නොමැත.');

  const profile = toAppUser(row as Record<string, any>, authUserId);
  const employment = String(profile.employmentStatus || '').toUpperCase();
  const status = String(profile.status || '').toLowerCase();
  const approval = String(profile.idApprovalStatus || '').toUpperCase();

  if (profile.role !== 'owner' && (status !== 'active' || employment !== 'ACTIVE' || approval !== 'APPROVED')) {
    throw new Error('Owner approval සහ ACTIVE employee status නොමැති account එකකට access ලබා නොදේ.');
  }
  if (profile.role === 'owner' && (status === 'blocked' || employment !== 'ACTIVE')) {
    throw new Error('Owner account එක active තත්ත්වයේ නොමැත.');
  }

  return profile;
}

export async function bootstrapOwnerProfileIfMissing(authUser: { id: string; email?: string | null }): Promise<AppUser | null> {
  const email = authUser.email?.trim().toLowerCase() || '';
  if (email !== OWNER_EMAIL) return null;

  const { data: byAuthId, error: authLookupError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();
  if (authLookupError) throw authLookupError;
  if (byAuthId) return toAppUser(byAuthId, authUser.id);

  const { data: byEmail, error: emailLookupError } = await supabase
    .from('users')
    .select('*')
    .eq('email', OWNER_EMAIL)
    .maybeSingle();
  if (emailLookupError) throw emailLookupError;

  if (byEmail) {
    const { data, error } = await supabase
      .from('users')
      .update({
        auth_user_id: authUser.id,
        name: OWNER_NAME,
        role: 'owner',
        status: 'active',
        employment_status: 'ACTIVE',
        id_approval_status: 'APPROVED',
      })
      .eq('id', byEmail.id)
      .select('*')
      .single();
    if (error) throw error;
    return toAppUser(data, authUser.id);
  }

  const { data, error } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.id,
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      role: 'owner',
      status: 'active',
      employment_status: 'ACTIVE',
      id_approval_status: 'APPROVED',
    })
    .select('*')
    .single();
  if (error) throw error;
  return toAppUser(data, authUser.id);
}

export async function sendOwnerPasswordReset(): Promise<void> {
  const redirectTo = Capacitor.isNativePlatform()
    ? 'com.ddworld.marketing.app://reset-password'
    : (typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined);

  const { error } = await supabase.auth.resetPasswordForEmail(OWNER_EMAIL, {
    redirectTo,
  });
  if (error) throw error;
}

export type OwnerUserAdminPayload = {
  action: 'list' | 'create' | 'update' | 'set_status' | 'delete';
  id?: string;
  name?: string;
  email?: string;
  password?: string;
  role?: 'agent' | 'team_leader' | 'junior_team_leader';
  phone?: string;
  agentCode?: string;
  teamId?: string | null;
  status?: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'INACTIVE';
};

export async function ownerUserAdmin<T = any>(payload: OwnerUserAdminPayload): Promise<T> {
  const { data, error } = await supabase.functions.invoke('owner-user-admin', { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function signOutSupabase(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export { OWNER_EMAIL, OWNER_AGENT_CODE };
