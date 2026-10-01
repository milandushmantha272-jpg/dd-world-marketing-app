import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const allowed: Record<string, string[]> = {
  agent: ['agent'],
  management: ['owner', 'team_leader', 'junior_team_leader'],
  audit: ['dialog_officer'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, 405);

  const token = (req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '')
    .trim();
  if (!token) return json({ error: 'Authentication required.' }, 401);

  const body = await req.json().catch(() => ({}));
  const app = String(body.app_target || '').trim().toLowerCase();
  if (!allowed[app]) return json({ error: 'Unknown application target.' }, 400);

  const url = Deno.env.get('SUPABASE_URL');
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
  const secret = keys.default || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !secret) return json({ error: 'Server authentication is not configured.' }, 500);

  const admin = createClient(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return json({ error: 'Invalid session.' }, 401);

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('role,status,employment_status,id_approval_status')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return json({ error: 'Employee profile not found.' }, 403);
  }

  const role = String(profile.role || '').trim().toLowerCase();
  const status = String(profile.status || '').trim().toLowerCase();
  const employment = String(profile.employment_status || '').trim().toUpperCase();
  const approval = String(profile.id_approval_status || '').trim().toUpperCase();

  const active = role === 'owner'
    ? status === 'active' && employment === 'ACTIVE'
    : status === 'active' && employment === 'ACTIVE' && approval === 'APPROVED';

  if (!active || !allowed[app].includes(role)) {
    return json({ error: 'Application bundle is not authorized for this account.' }, 403);
  }

  return json({ authorized: true, app_target: app, role });
});
