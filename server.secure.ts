import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const firebaseAdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault() });
const adminAuth = getAuth(firebaseAdminApp);

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID ||
  'ai-studio-ddworldmarketing-a17f9096-827d-46aa-b4ce-ba3e4657b367';
const firestore = getFirestore(firebaseAdminApp, FIRESTORE_DATABASE_ID);

const getBearerToken = (req: express.Request): string | null => {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] || null;
};

const requireFirebaseUser: express.RequestHandler = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const decoded = await adminAuth.verifyIdToken(token, true);
    res.locals.firebaseUser = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_FIREBASE_TOKEN' });
  }
};

const requireActiveEmployee: express.RequestHandler = async (_req, res, next) => {
  const decoded = res.locals.firebaseUser as DecodedIdToken | undefined;
  if (!decoded?.uid) return res.status(401).json({ error: 'AUTH_REQUIRED' });

  try {
    const profile = await firestore.collection('users').doc(decoded.uid).get();
    if (!profile.exists) return res.status(403).json({ error: 'EMPLOYEE_PROFILE_REQUIRED' });

    const data = profile.data() || {};
    const role = String(data.role || '');
    const status = String(data.status || '').toLowerCase();
    const employmentStatus = String(data.employmentStatus || '').toUpperCase();
    const approval = String(data.idApprovalStatus || '').toUpperCase();
    const email = String(data.email || '').trim().toLowerCase();
    const tokenEmail = String(decoded.email || '').trim().toLowerCase();

    const isOwner = role === 'owner' || role === 'MASTER_LEADER' || data.id === 'owner-1';
    const active = status === 'active' && employmentStatus === 'ACTIVE' && approval === 'APPROVED';
    if (!isOwner && !active) return res.status(403).json({ error: 'EMPLOYEE_NOT_ACTIVE' });
    if (email && tokenEmail && email !== tokenEmail) return res.status(403).json({ error: 'IDENTITY_MISMATCH' });

    res.locals.employeeProfile = data;
    next();
  } catch {
    return res.status(503).json({ error: 'EMPLOYEE_PROFILE_LOOKUP_FAILED' });
  }
};

const isOwnerRequest = (res: express.Response): boolean => {
  const profile = res.locals.employeeProfile || {};
  return profile.role === 'owner' || profile.role === 'MASTER_LEADER' || profile.id === 'owner-1';
};

const isSupervisorRequest = (res: express.Response): boolean => {
  const profile = res.locals.employeeProfile || {};
  return isOwnerRequest(res) || profile.role === 'team_leader' || profile.role === 'TEAM_SUPERVISOR';
};

const validateGpsRecord = (record: any) => {
  const latitude = Number(record?.latitude);
  const longitude = Number(record?.longitude);
  const accuracy = Number(record?.accuracy);
  const speed = Number(record?.speed ?? 0);
  const heading = Number(record?.heading ?? 0);
  const altitude = Number(record?.altitude ?? 0);
  const timestampMs = Date.parse(String(record?.timestamp || ''));
  const now = Date.now();

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100) return false;
  if (!Number.isFinite(speed) || speed < 0 || speed > 83) return false;
  if (!Number.isFinite(heading) || heading < 0 || heading > 360) return false;
  if (!Number.isFinite(altitude) || altitude < -500 || altitude > 8848) return false;
  if (!Number.isFinite(timestampMs) || timestampMs > now || now - timestampMs > 60000) return false;
  return true;
};

const buildGpsDocument = (uid: string, record: any) => ({
  userId: uid,
  employeeId: String(record.employeeId || ''),
  agentCode: String(record.agentCode || ''),
  teamId: String(record.teamId || ''),
  trackingSessionId: String(record.trackingSessionId || ''),
  latitude: Number(record.latitude),
  longitude: Number(record.longitude),
  accuracy: Number(record.accuracy),
  speed: Number(record.speed || 0),
  heading: Number(record.heading || 0),
  altitude: Number(record.altitude || 0),
  timestamp: String(record.timestamp),
  batteryLevel: Number(record.batteryLevel ?? -1),
  networkStatus: String(record.networkStatus || 'UNKNOWN'),
  gpsStatus: String(record.gpsStatus || 'ACTIVE_HIGH_ACCURACY'),
  appState: String(record.appState || 'BACKGROUND_NATIVE_SERVICE'),
  provider: 'native',
  deviceSignature: String(record.deviceSignature || ''),
  deviceId: String(record.deviceId || ''),
  source: 'NATIVE_ANDROID_GPS',
  receivedAt: FieldValue.serverTimestamp(),
});

const collectionNames = [
  'messages', 'attendance', 'sales', 'meetings', 'leaves', 'verifications',
  'sms_logs', 'users', 'teams', 'ivr', 'location_logs', 'security_alerts',
  'team_targets', 'agent_targets', 'weekly_reports'
] as const;

const readCollection = async (name: string, limit = 500) => {
  const snapshot = await firestore.collection(name).limit(limit).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'DD WORLD Enterprise',
    mode: 'firebase-first-secure',
    firestoreDatabaseId: FIRESTORE_DATABASE_ID,
  });
});

// Backward-compatible sync API. It is now authenticated and Firestore-backed;
// there is no in-memory/disk cloud state source of truth.
app.get('/api/sync/state', requireFirebaseUser, requireActiveEmployee, async (_req, res) => {
  try {
    const [messages, attendance, productSales, meetings, leaves, verifications, smsLogs, users, teams, ivr, locationLogs, securityAlerts, teamTargets, agentTargets, weeklyReports] = await Promise.all(
      collectionNames.map((name) => readCollection(name)),
    );
    return res.json({
      messages,
      attendance,
      productSales,
      meetings,
      leaves,
      verifications,
      smsLogs,
      users,
      teams,
      ivr,
      locationLogs,
      securityAlerts,
      teamTargets,
      agentTargets,
      weeklyReports,
      updatedAt: new Date().toISOString(),
      source: 'firestore',
    });
  } catch (error) {
    console.error('Firestore sync state read failed:', error);
    return res.status(503).json({ error: 'FIRESTORE_SYNC_READ_FAILED' });
  }
});

const broadcastTypeToCollection: Record<string, string> = {
  NEW_MESSAGE: 'messages',
  ADD_ATTENDANCE: 'attendance',
  ADD_SALE: 'sales',
  UPDATE_USER_GPS: 'users',
  CREATE_MEETING: 'meetings',
  CANCEL_MEETING: 'meetings',
  SUBMIT_LEAVE: 'leaves',
  UPDATE_LEAVE: 'leaves',
  ADD_EZCASH: 'ez_cash',
  ADD_AGENT: 'users',
  ADD_VERIFICATION: 'verifications',
  ADD_SMS_LOG: 'sms_logs',
  UPDATE_TEAM_TARGETS: 'team_targets',
  UPDATE_AGENT_TARGETS: 'agent_targets',
  ADD_COMPANY_WEEKLY_REPORT: 'weekly_reports',
  UPDATE_EMPLOYMENT_STATUS: 'users',
  UPDATE_JOB_POSITION: 'users',
  APPROVE_EMPLOYEE_ID: 'users',
  REJECT_EMPLOYEE_ID: 'users',
  REQUEST_NEW_PHOTO: 'users',
  SUBMIT_EMPLOYEE_PHOTO: 'users',
};

app.post('/api/sync/broadcast', requireFirebaseUser, requireActiveEmployee, async (req, res) => {
  const { type, data } = req.body || {};
  if (!type || data === undefined) return res.status(400).json({ error: 'SYNC_EVENT_REQUIRED' });

  const collectionName = broadcastTypeToCollection[type];
  if (!collectionName) return res.status(400).json({ error: 'UNSUPPORTED_SYNC_EVENT' });

  const callerUid = String((res.locals.firebaseUser as DecodedIdToken).uid);
  const actorIsOwner = isOwnerRequest(res);
  const actorIsSupervisor = isSupervisorRequest(res);

  const protectedOwnerEvents = new Set(['UPDATE_EMPLOYMENT_STATUS', 'UPDATE_JOB_POSITION', 'APPROVE_EMPLOYEE_ID', 'REJECT_EMPLOYEE_ID', 'REQUEST_NEW_PHOTO', 'SUBMIT_EMPLOYEE_PHOTO']);
  if (protectedOwnerEvents.has(type) && !actorIsOwner) return res.status(403).json({ error: 'OWNER_ONLY' });
  if (['ADD_AGENT', 'UPDATE_TEAM_TARGETS', 'UPDATE_AGENT_TARGETS', 'ADD_COMPANY_WEEKLY_REPORT'].includes(type) && !actorIsSupervisor) {
    return res.status(403).json({ error: 'SUPERVISOR_REQUIRED' });
  }

  try {
    if (type === 'START_CALL' || type === 'ACCEPT_CALL' || type === 'REJECT_CALL' || type === 'END_CALL') {
      return res.json({ success: true, persisted: false, source: 'ephemeral-ui-event', userId: callerUid });
    }

    if (type === 'UPDATE_USER_GPS') {
      const targetId = String(data.id || data.userId || '');
      if (!targetId) return res.status(400).json({ error: 'USER_ID_REQUIRED' });
      if (!actorIsOwner && targetId !== callerUid && data.userId !== callerUid) {
        return res.status(403).json({ error: 'SELF_ONLY' });
      }
      await firestore.collection('users').doc(targetId).set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ success: true, persisted: true, source: 'firestore', userId: callerUid });
    }

    if (type === 'SYNC_USERS_LIST') {
      if (!actorIsOwner) return res.status(403).json({ error: 'OWNER_ONLY' });
      if (!Array.isArray(data) || data.length > 200) return res.status(400).json({ error: 'USER_LIST_REQUIRED' });
      const batch = firestore.batch();
      for (const user of data) {
        const id = String(user?.id || '');
        if (!id) continue;
        batch.set(firestore.collection('users').doc(id), user, { merge: true });
      }
      await batch.commit();
      return res.json({ success: true, persisted: true, source: 'firestore' });
    }

    const id = typeof data === 'object' && data !== null ? String(data.id || '') : '';
    if (type === 'CANCEL_MEETING' && id) {
      await firestore.collection('meetings').doc(id).set({ status: 'cancelled', cancelledAt: FieldValue.serverTimestamp() }, { merge: true });
    } else if (id) {
      await firestore.collection(collectionName).doc(id).set({ ...data, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    } else {
      await firestore.collection(collectionName).add({ ...data, createdAt: FieldValue.serverTimestamp() });
    }

    return res.json({ success: true, persisted: true, source: 'firestore', userId: callerUid });
  } catch (error) {
    console.error('Firestore sync write failed:', error);
    return res.status(503).json({ error: 'FIRESTORE_SYNC_WRITE_FAILED' });
  }
});

// EventSource is kept as a non-sensitive connection heartbeat only. Cross-device
// data delivery is provided by Firestore onSnapshot listeners.
app.get('/api/stream', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', source: 'firestore' })}\n\n`);
  const heartbeat = setInterval(() => res.write(`data: ${JSON.stringify({ type: 'HEARTBEAT', timestamp: new Date().toISOString() })}\n\n`), 25000);
  _req.on('close', () => clearInterval(heartbeat));
});

app.post('/api/native-auth/exchange', requireFirebaseUser, requireActiveEmployee, async (_req, res) => {
  const decoded = res.locals.firebaseUser as DecodedIdToken;
  try {
    const customToken = await adminAuth.createCustomToken(decoded.uid, { ddWorldNative: true });
    return res.json({ success: true, customToken });
  } catch {
    return res.status(500).json({ error: 'NATIVE_TOKEN_EXCHANGE_FAILED' });
  }
});

app.post('/api/native-gps-sync', requireFirebaseUser, requireActiveEmployee, async (req, res) => {
  const record = req.body || {};
  if (!validateGpsRecord(record)) return res.status(400).json({ error: 'INVALID_GPS_RECORD' });

  const uid = String((res.locals.firebaseUser as DecodedIdToken).uid);
  const profile = res.locals.employeeProfile || {};
  const claimedEmployeeId = String(record.employeeId || '');
  const profileEmployeeId = String(profile.employeeId || profile.id || '');
  const claimedAgentCode = String(record.agentCode || '');
  const profileAgentCode = String(profile.agentCode || '');

  if (profileEmployeeId && claimedEmployeeId && profileEmployeeId !== claimedEmployeeId) {
    return res.status(403).json({ error: 'EMPLOYEE_ID_MISMATCH' });
  }
  if (profileAgentCode && claimedAgentCode && profileAgentCode !== claimedAgentCode) {
    return res.status(403).json({ error: 'AGENT_CODE_MISMATCH' });
  }

  const docRef = await firestore.collection('location_records').add(buildGpsDocument(uid, record));
  return res.json({ success: true, id: docRef.id, userId: uid });
});

app.post('/api/native-gps-batch-sync', requireFirebaseUser, requireActiveEmployee, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'BATCH_ARRAY_REQUIRED' });
  if (req.body.length > 200) return res.status(413).json({ error: 'BATCH_TOO_LARGE' });

  const uid = String((res.locals.firebaseUser as DecodedIdToken).uid);
  const profile = res.locals.employeeProfile || {};
  const profileEmployeeId = String(profile.employeeId || profile.id || '');
  const profileAgentCode = String(profile.agentCode || '');
  const batch = firestore.batch();
  let accepted = 0;

  for (const record of req.body) {
    if (!validateGpsRecord(record)) continue;
    const claimedEmployeeId = String(record.employeeId || '');
    const claimedAgentCode = String(record.agentCode || '');
    if (profileEmployeeId && claimedEmployeeId && profileEmployeeId !== claimedEmployeeId) continue;
    if (profileAgentCode && claimedAgentCode && profileAgentCode !== claimedAgentCode) continue;

    const ref = firestore.collection('location_records').doc();
    batch.set(ref, buildGpsDocument(uid, record));
    accepted += 1;
  }

  if (accepted === 0) return res.status(400).json({ error: 'NO_VALID_GPS_RECORDS' });
  await batch.commit();
  return res.json({ success: true, accepted, userId: uid });
});

app.get('/download', (_req, res) => res.redirect('/?app=ready'));

const start = async () => {
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
  app.use(express.static(path.resolve(process.cwd(), 'dist')));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    vite.transformIndexHtml(
      req.originalUrl,
      '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    )
      .then((html) => res.status(200).set({ 'Content-Type': 'text/html' }).end(html))
      .catch((error) => {
        vite.ssrFixStacktrace(error as Error);
        next(error);
      });
  });
  app.listen(PORT, () => console.log(`DD WORLD secure server listening on ${PORT}`));
};

start().catch((error) => {
  console.error('DD WORLD secure server failed to start:', error);
  process.exit(1);
});
