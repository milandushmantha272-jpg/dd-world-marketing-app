import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

// Firebase remains only for the legacy Firestore sync layer during migration.
// Authentication is now exclusively verified through Supabase Auth.
const firebaseAdminApp = getApps().length ? getApps()[0] : initializeApp({ credential: applicationDefault() });
const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'ai-studio-ddworldmarketing-a17f9096-827d-46aa-b4ce-ba3e4657b367';
const firestore = getFirestore(firebaseAdminApp, FIRESTORE_DATABASE_ID);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://gbszujosgslsjaiibasa.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_y7AXK7PAs06E66sgfn6aaQ_06WNuS0l';
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

type AuthenticatedUser = { uid: string; email?: string | null };

const getBearerToken = (req: express.Request): string | null => {
  const header = req.header('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] || null;
};

const requireSupabaseUser: express.RequestHandler = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user?.id) return res.status(401).json({ error: 'INVALID_SUPABASE_TOKEN' });
    res.locals.supabaseUser = { uid: data.user.id, email: data.user.email } satisfies AuthenticatedUser;
    next();
  } catch {
    return res.status(401).json({ error: 'INVALID_SUPABASE_TOKEN' });
  }
};

const requireActiveEmployee: express.RequestHandler = async (_req, res, next) => {
  const decoded = res.locals.supabaseUser as AuthenticatedUser | undefined;
  if (!decoded?.uid) return res.status(401).json({ error: 'AUTH_REQUIRED' });
  try {
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', decoded.uid)
      .maybeSingle();
    if (error) return res.status(503).json({ error: 'EMPLOYEE_PROFILE_LOOKUP_FAILED' });
    if (!profile) return res.status(403).json({ error: 'EMPLOYEE_PROFILE_REQUIRED' });

    const role = String(profile.role || ''), status = String(profile.status || '').toLowerCase();
    const employmentStatus = String(profile.employment_status || '').toUpperCase();
    const approval = String(profile.id_approval_status || '').toUpperCase();
    const email = String(profile.email || '').trim().toLowerCase();
    const tokenEmail = String(decoded.email || '').trim().toLowerCase();
    const isOwner = role === 'owner' || role === 'MASTER_LEADER' || profile.id === 'owner-1';
    if (!isOwner && !(status === 'active' && employmentStatus === 'ACTIVE' && approval === 'APPROVED')) {
      return res.status(403).json({ error: 'EMPLOYEE_NOT_ACTIVE' });
    }
    if (email && tokenEmail && email !== tokenEmail) return res.status(403).json({ error: 'IDENTITY_MISMATCH' });
    res.locals.employeeProfile = profile;
    next();
  } catch {
    return res.status(503).json({ error: 'EMPLOYEE_PROFILE_LOOKUP_FAILED' });
  }
};

const isOwnerRequest = (res: express.Response): boolean => {
  const p = res.locals.employeeProfile || {};
  return p.role === 'owner' || p.role === 'MASTER_LEADER' || p.id === 'owner-1';
};
const isSupervisorRequest = (res: express.Response): boolean => {
  const p = res.locals.employeeProfile || {};
  return isOwnerRequest(res) || p.role === 'team_leader' || p.role === 'TEAM_SUPERVISOR';
};

const validateGpsRecord = (r: any) => {
  const latitude=Number(r?.latitude),longitude=Number(r?.longitude),accuracy=Number(r?.accuracy),speed=Number(r?.speed??0),heading=Number(r?.heading??0),altitude=Number(r?.altitude??0),timestampMs=Date.parse(String(r?.timestamp||'')),now=Date.now();
  return Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180&&Number.isFinite(accuracy)&&accuracy>0&&accuracy<=100&&Number.isFinite(speed)&&speed>=0&&speed<=83&&Number.isFinite(heading)&&heading>=0&&heading<=360&&Number.isFinite(altitude)&&altitude>=-500&&altitude<=8848&&Number.isFinite(timestampMs)&&timestampMs<=now&&now-timestampMs<=60000;
};
const buildGpsDocument = (uid:string,r:any)=>({ userId:uid,employeeId:String(r.employeeId||''),agentCode:String(r.agentCode||''),teamId:String(r.teamId||''),trackingSessionId:String(r.trackingSessionId||''),latitude:Number(r.latitude),longitude:Number(r.longitude),accuracy:Number(r.accuracy),speed:Number(r.speed||0),heading:Number(r.heading||0),altitude:Number(r.altitude||0),timestamp:String(r.timestamp),batteryLevel:Number(r.batteryLevel??-1),networkStatus:String(r.networkStatus||'UNKNOWN'),gpsStatus:String(r.gpsStatus||'ACTIVE_HIGH_ACCURACY'),appState:String(r.appState||'BACKGROUND_NATIVE_SERVICE'),provider:'native',deviceSignature:String(r.deviceSignature||''),deviceId:String(r.deviceId||''),source:'NATIVE_ANDROID_GPS',receivedAt:FieldValue.serverTimestamp() });
const collectionNames=['messages','attendance','sales','meetings','leaves','verifications','sms_logs','users','teams','ivr','location_logs','security_alerts','team_targets','agent_targets','weekly_reports'] as const;
const readCollection=async(name:string,limit=500)=>(await firestore.collection(name).limit(limit).get()).docs.map(d=>({id:d.id,...d.data()}));

app.get('/api/health',(_req,res)=>res.json({status:'ok',system:'DD WORLD Enterprise',mode:'supabase-auth-legacy-firestore-sync',firestoreDatabaseId:FIRESTORE_DATABASE_ID}));
app.get('/api/sync/state',requireSupabaseUser,requireActiveEmployee,async(_req,res)=>{try{const [messages,attendance,productSales,meetings,leaves,verifications,smsLogs,users,teams,ivr,locationLogs,securityAlerts,teamTargets,agentTargets,weeklyReports]=await Promise.all(collectionNames.map(readCollection));return res.json({messages,attendance,productSales,meetings,leaves,verifications,smsLogs,users,teams,ivr,locationLogs,securityAlerts,teamTargets,agentTargets,weeklyReports,updatedAt:new Date().toISOString(),source:'firestore'});}catch{ return res.status(503).json({error:'FIRESTORE_SYNC_READ_FAILED'}); }});

const broadcastTypeToCollection:Record<string,string>={NEW_MESSAGE:'messages',ADD_ATTENDANCE:'attendance',ADD_SALE:'sales',UPDATE_USER_GPS:'users',CREATE_MEETING:'meetings',CANCEL_MEETING:'meetings',SUBMIT_LEAVE:'leaves',UPDATE_LEAVE:'leaves',ADD_EZCASH:'ez_cash',ADD_AGENT:'users',ADD_VERIFICATION:'verifications',ADD_SMS_LOG:'sms_logs',UPDATE_TEAM_TARGETS:'team_targets',UPDATE_AGENT_TARGETS:'agent_targets',ADD_COMPANY_WEEKLY_REPORT:'weekly_reports',UPDATE_EMPLOYMENT_STATUS:'users',UPDATE_JOB_POSITION:'users',APPROVE_EMPLOYEE_ID:'users',REJECT_EMPLOYEE_ID:'users',REQUEST_NEW_PHOTO:'users',SUBMIT_EMPLOYEE_PHOTO:'users'};
app.post('/api/sync/broadcast',requireSupabaseUser,requireActiveEmployee,async(req,res)=>{const{type,data}=req.body||{};if(!type||data===undefined)return res.status(400).json({error:'SYNC_EVENT_REQUIRED'});const collectionName=broadcastTypeToCollection[type];if(!collectionName)return res.status(400).json({error:'UNSUPPORTED_SYNC_EVENT'});const callerUid=String((res.locals.supabaseUser as AuthenticatedUser).uid),owner=isOwnerRequest(res),supervisor=isSupervisorRequest(res);if(new Set(['UPDATE_EMPLOYMENT_STATUS','UPDATE_JOB_POSITION','APPROVE_EMPLOYEE_ID','REJECT_EMPLOYEE_ID','REQUEST_NEW_PHOTO','SUBMIT_EMPLOYEE_PHOTO']).has(type)&&!owner)return res.status(403).json({error:'OWNER_ONLY'});if(['ADD_AGENT','UPDATE_TEAM_TARGETS','UPDATE_AGENT_TARGETS','ADD_COMPANY_WEEKLY_REPORT'].includes(type)&&!supervisor)return res.status(403).json({error:'SUPERVISOR_REQUIRED'});try{if(['START_CALL','ACCEPT_CALL','REJECT_CALL','END_CALL'].includes(type))return res.json({success:true,persisted:false,source:'ephemeral-ui-event',userId:callerUid});if(type==='UPDATE_USER_GPS'){const targetId=String(data.id||data.userId||'');if(!targetId)return res.status(400).json({error:'USER_ID_REQUIRED'});if(!owner&&targetId!==callerUid&&data.userId!==callerUid)return res.status(403).json({error:'SELF_ONLY'});await firestore.collection('users').doc(targetId).set({...data,updatedAt:FieldValue.serverTimestamp()},{merge:true});return res.json({success:true,persisted:true,source:'firestore',userId:callerUid});}if(type==='SYNC_USERS_LIST'){if(!owner)return res.status(403).json({error:'OWNER_ONLY'});if(!Array.isArray(data)||data.length>200)return res.status(400).json({error:'USER_LIST_REQUIRED'});const batch=firestore.batch();for(const user of data){const id=String(user?.id||'');if(id)batch.set(firestore.collection('users').doc(id),user,{merge:true});}await batch.commit();return res.json({success:true,persisted:true,source:'firestore'});}const id=typeof data==='object'&&data!==null?String(data.id||''):'';if(type==='CANCEL_MEETING'&&id)await firestore.collection('meetings').doc(id).set({status:'cancelled',cancelledAt:FieldValue.serverTimestamp()},{merge:true});else if(id)await firestore.collection(collectionName).doc(id).set({...data,updatedAt:FieldValue.serverTimestamp()},{merge:true});else await firestore.collection(collectionName).add({...data,createdAt:FieldValue.serverTimestamp()});return res.json({success:true,persisted:true,source:'firestore',userId:callerUid});}catch{return res.status(503).json({error:'FIRESTORE_SYNC_WRITE_FAILED'});}});

app.get('/api/stream',(_req,res)=>{res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('Connection','keep-alive');res.flushHeaders();res.write(`data: ${JSON.stringify({type:'CONNECTED',source:'firestore'})}\n\n`);const heartbeat=setInterval(()=>res.write(`data: ${JSON.stringify({type:'HEARTBEAT',timestamp:new Date().toISOString()})}\n\n`),25000);_req.on('close',()=>clearInterval(heartbeat));});

// Native GPS now sends the Supabase access token directly. Firebase custom-token exchange is intentionally removed.
app.post('/api/native-auth/exchange',(_req,res)=>res.status(410).json({error:'FIREBASE_AUTH_EXCHANGE_REMOVED',message:'Use the Supabase access token directly.'}));
app.post('/api/native-gps-sync',requireSupabaseUser,requireActiveEmployee,async(req,res)=>{const r=req.body||{};if(!validateGpsRecord(r))return res.status(400).json({error:'INVALID_GPS_RECORD'});const uid=String((res.locals.supabaseUser as AuthenticatedUser).uid),p=res.locals.employeeProfile||{},pe=String(p.employee_id||p.id||''),pa=String(p.agent_code||''),ce=String(r.employeeId||''),ca=String(r.agentCode||'');if(pe&&ce&&pe!==ce)return res.status(403).json({error:'EMPLOYEE_ID_MISMATCH'});if(pa&&ca&&pa!==ca)return res.status(403).json({error:'AGENT_CODE_MISMATCH'});const d=await firestore.collection('location_records').add(buildGpsDocument(uid,r));return res.json({success:true,id:d.id,userId:uid});});
app.post('/api/native-gps-batch-sync',requireSupabaseUser,requireActiveEmployee,async(req,res)=>{if(!Array.isArray(req.body))return res.status(400).json({error:'BATCH_ARRAY_REQUIRED'});if(req.body.length>200)return res.status(413).json({error:'BATCH_TOO_LARGE'});const uid=String((res.locals.supabaseUser as AuthenticatedUser).uid),p=res.locals.employeeProfile||{},pe=String(p.employee_id||p.id||''),pa=String(p.agent_code||''),batch=firestore.batch();let accepted=0;for(const r of req.body){if(!validateGpsRecord(r))continue;const ce=String(r.employeeId||''),ca=String(r.agentCode||'');if(pe&&ce&&pe!==ce)continue;if(pa&&ca&&pa!==ca)continue;batch.set(firestore.collection('location_records').doc(),buildGpsDocument(uid,r));accepted++;}if(!accepted)return res.status(400).json({error:'NO_VALID_GPS_RECORDS'});await batch.commit();return res.json({success:true,accepted,userId:uid});});

app.get('/download',(_req,res)=>res.redirect('/?app=ready'));
const start=async()=>{const vite=await createViteServer({server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);app.use(express.static(path.resolve(process.cwd(),'dist')));app.use((req,res,next)=>{if(req.method!=='GET'||req.path.startsWith('/api/'))return next();vite.transformIndexHtml(req.originalUrl,'<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>').then(html=>res.status(200).set({'Content-Type':'text/html'}).end(html)).catch(error=>{vite.ssrFixStacktrace(error as Error);next(error);});});app.listen(PORT,()=>console.log(`DD WORLD secure server listening on ${PORT}`));};
start().catch(error=>{console.error('DD WORLD secure server failed to start:',error);process.exit(1);});
