import express from 'express';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    system: 'DD WORLD Enterprise',
    mode: 'firebase-first',
  });
});

// Legacy in-memory synchronization endpoints are intentionally disabled.
// Sensitive state must not be exposed through unauthenticated HTTP routes.
const disabled = (_req: express.Request, res: express.Response) => {
  res.status(410).json({
    error: 'LEGACY_SYNC_DISABLED',
    message: 'Use Firebase Authentication + Firestore for application data.',
  });
};

app.get('/api/sync/state', disabled);
app.post('/api/sync/broadcast', disabled);
app.get('/api/stream', disabled);
app.post('/api/native-gps-sync', disabled);
app.post('/api/native-gps-batch-sync', disabled);

app.get('/download', (_req, res) => {
  res.redirect('/?app=ready');
});

const start = async () => {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);
  app.use(express.static(path.resolve(process.cwd(), 'dist')));

  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    try {
      const template = await vite.transformIndexHtml(req.originalUrl, '<!doctype html><html><head></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });

  app.listen(PORT, () => {
    console.log(`DD WORLD secure server listening on ${PORT}`);
  });
};

start().catch((error) => {
  console.error('DD WORLD secure server failed to start:', error);
  process.exit(1);
});
