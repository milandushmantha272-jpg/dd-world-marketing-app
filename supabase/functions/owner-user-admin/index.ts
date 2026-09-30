import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const clean = (value: unknown) => String(value ?? '').trim();
const OWNER_EMAIL = 'milandushmantha272@gmail.com';
const NON_ACTIVE_BAN_DURATION = '876000h';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'POST required.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  let secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
  if (!secretKey) {
    try {
      const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}');
      secretKey = Object.values(secretKeys)[0] as string | undefined;
    } catch (_) {}
  }
  if (!supabaseUrl || !secretKey) return json({ error: 'Server authentication is not configured.' }, 500);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  try {
    const authorization = req.headers.get('Authorization') || '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Authentication required.' }, 401);

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Invalid authentication session.' }, 401);

    const { data: ownerRow, error: ownerError } = await admin
      .from('users')
      .select('id,email,role,status,employment_status,auth_user_id')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();

    if (ownerError) throw ownerError;
    if (!ownerRow || ownerRow.role !== 'owner' ||
        ownerRow.status !== 'active' ||
        ownerRow.employment_status !== 'ACTIVE') {
      return json({ error: 'Owner authorization required.' }, 403);
    }

    const body = await req.json();
    const action = clean(body.action);

    if (action === 'list') {
      const [{ data: users, error: usersError }, { data: authUsers, error: authUsersError }] = await Promise.all([
        admin.from('users').select('*').in('role', ['agent', 'team_leader']).order('name'),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
      if (usersError) throw usersError;
      if (authUsersError) throw authUsersError;
      const authMap = new Map((authUsers?.users || []).map((u: any) => [u.id, {
        lastSignInAt: u.last_sign_in_at || null,
        bannedUntil: u.banned_until || null,
        emailConfirmed: Boolean(u.email_confirmed_at),
      }]));
      return json({
        ok: true,
        users: (users || []).map((u: any) => ({
          ...u,
          auth_last_sign_in_at: authMap.get(u.auth_user_id)?.lastSignInAt || null,
          auth_banned_until: authMap.get(u.auth_user_id)?.bannedUntil || null,
          auth_email_confirmed: authMap.get(u.auth_user_id)?.emailConfirmed || false,
        })),
      });
    }

    if (action === 'create') {
      const name = clean(body.name);
      const email = clean(body.email).toLowerCase();
      const password = clean(body.password);
      const role = clean(body.role);
      const agentCode = clean(body.agentCode);
      if (!name || !email || !password) return json({ error: 'Name, email and password are required.' }, 400);
      if (password.length < 12) return json({ error: 'Password must be at least 12 characters.' }, 400);
      if (!['agent', 'team_leader'].includes(role)) return json({ error: 'Only Agent or Team Leader accounts can be created here.' }, 400);

      if (agentCode) {
        const { data: duplicate, error: duplicateError } = await admin
          .from('users')
          .select('id')
          .ilike('agent_code', agentCode)
          .limit(1)
          .maybeSingle();
        if (duplicateError) throw duplicateError;
        if (duplicate) return json({ error: 'Agent Code is already registered.' }, 409);
      }

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError || !created.user) throw createError || new Error('Unable to create Auth account.');

      const row = {
        id: created.user.id,
        auth_user_id: created.user.id,
        name,
        email,
        role,
        agent_code: agentCode || null,
        phone: clean(body.phone) || null,
        team_id: clean(body.teamId) || null,
        status: 'pending',
        employment_status: 'INACTIVE',
        id_approval_status: 'PENDING',
      };

      const { error: profileError } = await admin.from('users').insert(row);
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id, true);
        throw profileError;
      }

      await admin.auth.admin.updateUserById(created.user.id, { ban_duration: NON_ACTIVE_BAN_DURATION });
      return json({ ok: true, message: 'Account created. Pending Owner approval.', authUserId: created.user.id });
    }

    const targetId = clean(body.id);
    if (!targetId) return json({ error: 'Target employee id is required.' }, 400);

    const { data: target, error: targetError } = await admin
      .from('users')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target) return json({ error: 'Employee account not found.' }, 404);

    if (target.id === ownerRow.id || target.auth_user_id === ownerRow.auth_user_id ||
        target.role === 'owner' || clean(target.email).toLowerCase() === OWNER_EMAIL) {
      return json({ error: 'Owner account is protected.' }, 403);
    }

    const authUserId = clean(target.auth_user_id);
    if (!authUserId) return json({ error: 'This employee does not have a linked Supabase Auth account.' }, 400);

    if (action === 'update') {
      const authPatch: Record<string, unknown> = {};
      const profilePatch: Record<string, unknown> = {};
      const email = clean(body.email).toLowerCase();
      const name = clean(body.name);
      const phone = clean(body.phone);
      const agentCode = clean(body.agentCode);
      const role = clean(body.role);
      const teamId = clean(body.teamId);

      if (email) { authPatch.email = email; authPatch.email_confirm = true; profilePatch.email = email; }
      if (name) { authPatch.user_metadata = { name }; profilePatch.name = name; }
      if (phone) profilePatch.phone = phone;
      if (agentCode !== '') profilePatch.agent_code = agentCode || null;
      if (['agent', 'team_leader'].includes(role)) profilePatch.role = role;
      if (teamId !== '') profilePatch.team_id = teamId || null;

      const password = clean(body.password);
      if (password) {
        if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
        authPatch.password = password;
      }

      if (Object.keys(authPatch).length) {
        const { error } = await admin.auth.admin.updateUserById(authUserId, authPatch);
        if (error) throw error;
      }
      if (Object.keys(profilePatch).length) {
        const { error } = await admin.from('users').update(profilePatch).eq('id', target.id);
        if (error) throw error;
      }
      return json({ ok: true, message: 'Account details updated successfully.' });
    }

    if (action === 'reset_password') {
      const password = clean(body.password);
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400);
      const { error } = await admin.auth.admin.updateUserById(authUserId, { password });
      if (error) throw error;
      return json({ ok: true, message: 'Employee password reset successfully.' });
    }

    if (action === 'set_status') {
      const status = clean(body.status).toUpperCase();
      if (!['ACTIVE', 'BLOCKED', 'SUSPENDED', 'INACTIVE', 'EXITED'].includes(status)) return json({ error: 'Invalid account status.' }, 400);

      const authPatch = status === 'ACTIVE' ? { ban_duration: 'none' } : { ban_duration: NON_ACTIVE_BAN_DURATION };
      const profilePatch = status === 'ACTIVE'
        ? { status: 'active', employment_status: 'ACTIVE', id_approval_status: 'APPROVED', is_logged_in: false }
        : status === 'BLOCKED'
          ? { status: 'blocked', employment_status: 'INACTIVE', id_approval_status: 'PENDING', is_logged_in: false }
          : status === 'SUSPENDED'
            ? { status: 'suspended', employment_status: 'SUSPENDED', id_approval_status: 'APPROVED', is_logged_in: false }
            : status === 'EXITED'
              ? { status: 'exited', employment_status: 'EXITED', id_approval_status: 'PENDING', is_logged_in: false }
              : { status: 'inactive', employment_status: 'INACTIVE', id_approval_status: 'PENDING', is_logged_in: false };

      const { error: authUpdateError } = await admin.auth.admin.updateUserById(authUserId, authPatch);
      if (authUpdateError) throw authUpdateError;
      const { error: profileUpdateError } = await admin.from('users').update(profilePatch).eq('id', target.id);
      if (profileUpdateError) throw profileUpdateError;
      return json({ ok: true, message: `Account status changed to ${status}.` });
    }

    if (action === 'delete') {
      const authPatch = { ban_duration: NON_ACTIVE_BAN_DURATION };
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(authUserId, authPatch);
      if (authUpdateError) throw authUpdateError;
      const { error: profileUpdateError } = await admin.from('users').update({
        status: 'exited',
        employment_status: 'EXITED',
        id_approval_status: 'PENDING',
        is_logged_in: false,
      }).eq('id', target.id);
      if (profileUpdateError) throw profileUpdateError;
      return json({ ok: true, message: 'Employee safely deactivated as EXITED.' });
    }

    return json({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    console.error('owner-user-admin error:', error);
    return json({ error: error instanceof Error ? error.message : 'Owner account management failed.' }, 500);
  }
});
