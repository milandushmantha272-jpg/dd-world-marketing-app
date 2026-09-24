import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { SignJWT, importPKCS8 } from 'npm:jose@6.1.0';

type RequestBody = {
  recipientIds?: string[];
  broadcast?: boolean;
  title?: string;
  body?: string;
  page?: string;
  type?: string;
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const firebaseServiceAccountRaw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON') || '';

const admin = createClient(supabaseUrl, serviceRoleKey);

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const getAccessToken = async () => {
  const account = JSON.parse(firebaseServiceAccountRaw) as {
    client_email: string;
    private_key: string;
    project_id: string;
  };
  const key = await importPKCS8(account.private_key, 'RS256');
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  if (!tokenResponse.ok) throw new Error('Unable to obtain Firebase access token.');
  const tokenData = await tokenResponse.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error('Firebase access token missing.');
  return { accessToken: tokenData.access_token, projectId: account.project_id };
};

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'POST required' }, 405);

  const authHeader = request.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) return jsonResponse({ error: 'Authentication required.' }, 401);

  const { data: authData, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !authData.user) return jsonResponse({ error: 'Invalid authentication.' }, 401);

  const { data: sender, error: senderError } = await admin
    .from('users')
    .select('id,role,status,employment_status,id_approval_status')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (senderError || !sender || sender.role !== 'owner' || sender.status !== 'active' || sender.employment_status !== 'ACTIVE') {
    return jsonResponse({ error: 'Only an active Owner can send push notifications.' }, 403);
  }

  let payload: RequestBody;
  try { payload = await request.json() as RequestBody; } catch { return jsonResponse({ error: 'Invalid JSON.' }, 400); }

  const title = String(payload.title || '').trim().slice(0, 120);
  const body = String(payload.body || '').trim().slice(0, 2000);
  const page = typeof payload.page === 'string' ? payload.page.trim().slice(0, 100) : '';
  const type = typeof payload.type === 'string' ? payload.type.trim().slice(0, 60) : 'owner_push';
  if (!title || !body) return jsonResponse({ error: 'Title and body are required.' }, 400);

  let recipientQuery = admin
    .from('users')
    .select('id')
    .eq('status', 'active')
    .eq('employment_status', 'ACTIVE')
    .eq('id_approval_status', 'APPROVED');

  if (payload.broadcast) {
    recipientQuery = recipientQuery.eq('role', 'agent');
  } else {
    const ids = Array.isArray(payload.recipientIds) ? [...new Set(payload.recipientIds)].slice(0, 200) : [];
    if (!ids.length) return jsonResponse({ error: 'At least one recipient is required.' }, 400);
    recipientQuery = recipientQuery.in('id', ids).eq('role', 'agent');
  }

  const { data: recipients, error: recipientError } = await recipientQuery;
  if (recipientError) return jsonResponse({ error: recipientError.message }, 400);
  const recipientIds = (recipients || []).map((r) => r.id);
  if (!recipientIds.length) return jsonResponse({ sent: 0, recipients: 0, message: 'No active Agent recipients found.' });

  const rows = recipientIds.map((user_id) => ({
    user_id,
    title,
    body,
    type,
    page: page || null,
    read: false,
  }));
  const { error: notificationError } = await admin.from('notifications').insert(rows);
  if (notificationError) return jsonResponse({ error: notificationError.message }, 500);

  const { data: devices, error: deviceError } = await admin
    .from('push_device_tokens')
    .select('id,fcm_token,user_id')
    .in('user_id', recipientIds)
    .eq('active', true);

  if (deviceError) return jsonResponse({ error: deviceError.message, notificationsCreated: rows.length }, 500);
  if (!devices?.length) return jsonResponse({ sent: 0, notificationsCreated: rows.length, recipients: recipientIds.length });

  if (!firebaseServiceAccountRaw) {
    return jsonResponse({ sent: 0, notificationsCreated: rows.length, recipients: recipientIds.length, error: 'FCM server credential is not configured.' }, 503);
  }

  const { accessToken, projectId } = await getAccessToken();
  let sent = 0;
  let disabled = 0;

  for (const device of devices) {
    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: device.fcm_token,
          notification: { title, body },
          data: { page, type, notificationType: type },
          android: { priority: 'HIGH', notification: { channel_id: 'dd_world_marketing', click_action: 'FLUTTER_NOTIFICATION_CLICK' } },
        },
      }),
    });

    if (response.ok) {
      sent++;
    } else {
      const errorText = await response.text();
      if (/UNREGISTERED|INVALID_ARGUMENT/i.test(errorText)) {
        await admin.from('push_device_tokens').update({ active: false, updated_at: new Date().toISOString() }).eq('id', device.id);
        disabled++;
      }
    }
  }

  return jsonResponse({ sent, devices: devices.length, disabled, notificationsCreated: rows.length, recipients: recipientIds.length });
});
