import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { mountAcademy } from './server/academy';
import { COMPONENTS, MISSIONS } from './src/data/components';
import { evaluateEngineering } from './src/utils/engineering';
import { getFlightEvent } from './src/academy/pedagogy';
import type { SpacecraftComponent } from './src/types/mission';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const args = process.argv.slice(2);
const flag = (name: string, fallback: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] || fallback : fallback; };
const port = Number(flag('--port', process.env.PORT || '3000'));
const host = flag('--host', '127.0.0.1');
app.use(express.json({ limit: '32kb' }));
app.use((_req, res, next) => {
  res.set('Referrer-Policy', 'no-referrer');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Permissions-Policy', 'camera=(), geolocation=()');
  if (process.env.NODE_ENV === 'production') res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  next();
});
mountAcademy(app);
app.get('/api/health', (_req, res) => res.json({ ok: true, engine: 'deterministic', version: 2, identitySchema: 2 }));
app.post('/api/evaluate-readiness', (req, res) => {
  const mission = MISSIONS.find(m => m.id === req.body?.mission?.id);
  const selection: Record<string, SpacecraftComponent> = {};
  for (const category of ['capsule', 'solar', 'oxygen', 'shield', 'engine', 'payload']) {
    const candidate = req.body?.components?.[category];
    const c = COMPONENTS.find(c => c.category === category && c.id === candidate?.id);
    if (c) selection[category] = c;
  }
  if (!mission || Object.keys(selection).length !== 6) { res.status(400).json({ error: 'Invalid mission or components' }); return; }
  res.json(evaluateEngineering(selection, mission, req.body.lang === 'en' ? 'en' : 'es', req.body.learnerProfile));
});
app.post('/api/mission-event', (req, res) => {
  const index = req.body?.eventIndex;
  if (!Number.isInteger(index) || index < 0 || index > 20) { res.status(400).json({ error: 'Invalid event index' }); return; }
  res.json(getFlightEvent(index, req.body.lang === 'en' ? 'en' : 'es', req.body.learnerProfile));
});
// Configure Vite or Static files
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, 'vite.config.ts'),
      server: {
        middlewareMode: true,
        host,
        port,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // SPA fallback: transform and serve index.html for non-API routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith('/api/')) return next();
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  }

  httpServer.listen(port, host, () => {
    console.log(`Junior Astronaut Mission Trainer: http://${host}:${port}`);
  });
}

startServer();
