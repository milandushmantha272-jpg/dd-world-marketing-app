import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const firebaseAdminApp = getApps().length
  ? getApps()[0]
  : initializeApp({ credential: applicationDefault() });
const adminAuth = getAuth(firebaseAdminApp);
const firestore = getFirestore(firebaseAdminApp);

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

const validateGpsRecord = (record: any) => {
  const latitude = Number(record?.latitude);
  const longitude = Number(record?.longitude);
  const accuracy = Number(record?.accuracy);
  const speed = Number(record?.speed ?? 0);
  const heading = Number(record?.heading ?? 0);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return false;
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return false;
  if (!Number.isFinite(accuracy) || accuracy <= 0 || accuracy > 100) return false;
  if (!Number.isFinite(speed) || speed < 0 || speed > 83) return false;
  if (!Number.isFinite(heading) || heading < 0 || heading > 360) return false;
  return true;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', system: 'DD WORLD Enterprise', mode: 'firebase-first-secure' });
});

const disabled = (_req: express.Request, res: express.Response) => {
  res.status(410).json({ error: 'LEGACY_SYNC_DISABLED', message: 'Use authenticated Firebase + Firestore data flows.' });
};
app.get('/api/sync/state', disabled);
app.post('/api/sync/broadcast', disabled);
app.get('/api/stream', disabled);

app.post('/api/native-gps-sync', requireFirebaseUser, async (req, res) => {
  const record = req.body || {};
  if (!validateGpsRecord(record)) return res.status(400).json({ error: 'INVALID_GPS_RECORD' });
  const uid = String(res.locals.firebaseUser.uid);
  const docRef = await firestore.collection('location_records').add({
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
    timestamp: String(record.timestamp || new Date().toISOString()),
    batteryLevel: Number(record.batteryLevel ?? -1),
    networkStatus: String(record.networkStatus || 'UNKNOWN'),
    gpsStatus: String(record.gpsStatus || 'ACTIVE_HIGH_ACCURACY'),
    appState: String(record.appState || 'BACKGROUND_NATIVE_SERVICE'),
    provider: 'native',
    deviceSignature: String(record.deviceSignature || 'android-native-service'),
    deviceId: String(record.deviceId || 'android-native'),
    source: 'NATIVE_ANDROID_GPS',
    receivedAt: FieldValue.serverTimestamp(),
  });
  return res.json({ success: true, id: docRef.id, userId: uid });
});

app.post('/api/native-gps-batch-sync', requireFirebaseUser, async (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'BATCH_ARRAY_REQUIRED' });
  if (req.body.length > 200) return res.status(413).json({ error: 'BATCH_TOO_LARGE' });
  const uid = String(res.locals.firebaseUser.uid);
  const batch = firestore.batch();
  let accepted = 0;
  for (const record of req.body) {
    if (!validateGpsRecord(record)) continue;
    const ref = firestore.collection('location_records').doc();
    batch.set(ref, {
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
      timestamp: String(record.timestamp || new Date().toISOString()),
      batteryLevel: Number(record.batteryLevel ?? -1),
      networkStatus: String(record.networkStatus || 'UNKNOWN'),
      gpsStatus: String(record.gpsStatus || 'ACTIVE_HIGH_ACCURACY'),
      appState: String(record.appState || 'BACKGROUND_NATIVE_SERVICE'),
      provider: 'native',
      deviceSignature: String(record.deviceSignature || 'android-native-service'),
      deviceId: String(record.deviceId || 'android-native'),
      source: 'NATIVE_ANDROID_GPS',
      receivedAt: FieldValue.serverTimestamp(),
    });
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
    vite.transformIndexHtml(req.originalUrl, '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>')
      .then((html) => res.status(200).set({ 'Content-Type': 'text/html' }).end(html))
      .catch((error) => { vite.ssrFixStacktrace(error as Error); next(error); });
  });
  app.listen(PORT, () => console.log(`DD WORLD secure server listening on ${PORT}`));
};

start().catch((error) => {
  console.error('DD WORLD secure server failed to start:', error);
  process.exit(1);
});
