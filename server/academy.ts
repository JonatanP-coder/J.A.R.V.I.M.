import express, { type Express, type Request, type Response } from 'express';
import { translate } from '../src/i18n/integratedCopy';
import { createHash, createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { award, badgesFor, EMPTY_PROGRESS, levelFor, rankFor, totalXP, trainingDate, validProfile, type LearnerProfile, type Progress } from '../src/academy/model';
import { generateCodename, isAnonymousId, isCodename } from '../src/academy/codenames';
import { sanitizeProgress, validProgress } from '../src/services/cadetProfile';
import type { PublicLeaderboardEntry } from '../src/types/leaderboard';
import { AREAS } from '../src/academy/curriculum';
import { COMPONENTS, MISSIONS } from '../src/data/components';
import { evaluateEngineering } from '../src/utils/engineering';
import type { SpacecraftComponent } from '../src/types/mission';

interface User { id: string; alias: string; salt: string; passwordHash: string; profile: LearnerProfile; publicLeaderboard: boolean; progress: Progress }
interface Session { userId: string; expires: number }
interface Database { version: 2; users: User[]; sessions: Record<string, Session> }
const onlyKeys = (value: unknown, keys: string[]) => !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => keys.includes(key));

function sendError(req: Request, res: Response, status: number, message: string) {
  const language = req.get('accept-language')?.toLowerCase().startsWith('en') ? 'en' : 'es';
  return res.status(status).json({ error: translate(message, language) });
}

export function mountAcademy(app: Express) {
  const directory = path.resolve(process.env.DATA_DIR || '.data');
  mkdirSync(directory, { recursive: true });
  const filename = path.join(directory, 'academy.json');
  const raw = existsSync(filename) ? JSON.parse(readFileSync(filename, 'utf8')) : { version: 2, users: [], sessions: {} };
  if (![1, 2].includes(raw.version) || !Array.isArray(raw.users) || !raw.sessions) throw new Error('Invalid academy database; refusing to overwrite.');

  // Migration keeps account IDs, credentials, sessions and progress. Old free-text aliases are discarded.
  const reserved = new Set<string>();
  const db: Database = { version: 2, users: [], sessions: {} };
  for (const old of raw.users) {
    if (!isAnonymousId(old.id) || typeof old.salt !== 'string' || !/^[a-f0-9]{128}$/.test(old.passwordHash)) throw new Error('Invalid account record; refusing to overwrite.');
    const alias = isCodename(old.alias) && !reserved.has(old.alias) ? old.alias : generateCodename(reserved);
    reserved.add(alias);
    const profile: LearnerProfile = { alias, audience: old.profile?.audience, knowledge: old.profile?.knowledge, mode: old.profile?.mode };
    if (!validProfile(profile)) throw new Error('Invalid learning preferences; refusing to overwrite.');
    db.users.push({ id: old.id, alias, salt: old.salt, passwordHash: old.passwordHash, profile,
      publicLeaderboard: raw.version === 2 && old.publicLeaderboard === true && profile.audience === 'adult',
      progress: validProgress(old.progress) ? sanitizeProgress(old.progress) : { ...EMPTY_PROGRESS, entries: [], completedMissions: {} } });
  }
  for (const [hash, session] of Object.entries(raw.sessions) as [string, Session][]) {
    if (/^[a-f0-9]{64}$/.test(hash) && db.users.some(user => user.id === session.userId) && Number.isFinite(session.expires) && session.expires > Date.now()) db.sessions[hash] = { userId: session.userId, expires: session.expires };
  }
  const save = () => {
    for (const [hash, session] of Object.entries(db.sessions)) if (session.expires <= Date.now()) delete db.sessions[hash];
    writeFileSync(filename + '.tmp', JSON.stringify(db), { mode: 0o600 }); renameSync(filename + '.tmp', filename);
  };
  if (existsSync(filename) && JSON.stringify(raw) !== JSON.stringify(db)) save();

  const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
  const tokenFor = (req: Request) => /(?:^|;\s*)jamt_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1] || '';
  const userFor = (req: Request) => {
    const session = db.sessions[tokenHash(tokenFor(req))];
    return session && session.expires > Date.now() ? db.users.find(user => user.id === session.userId) : undefined;
  };
  const view = (user: User) => ({ account: { id: user.id, alias: user.alias, publicLeaderboard: user.publicLeaderboard }, profile: user.profile, progress: user.progress });
  const router = express.Router();
  const rateKey = randomBytes(32);
  const limits = new Map<string, { count: number; until: number }>();
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options', 'nosniff');
    if (req.method !== 'GET') {
      const origin = req.get('origin');
      try { if (origin && new URL(origin).host !== req.get('host')) { sendError(req, res, 403, 'Origen no permitido.'); return; } }
      catch { sendError(req, res, 403, 'Origen no válido.'); return; }
      const now = Date.now();
      for (const [key, entry] of limits) if (entry.until < now) limits.delete(key);
      // IP addresses are not retained in rate-limit keys, records or application logs.
      const bucket = createHmac('sha256', rateKey).update(req.ip || 'local').digest('hex');
      const key = bucket + (['/login', '/register'].includes(req.path) ? ':auth' : ':write');
      const current = limits.get(key) || { count: 0, until: now + 15 * 60000 };
      current.count++; limits.set(key, current);
      if (current.count > (key.endsWith(':auth') ? 20 : 500)) { sendError(req, res, 429, 'Demasiados intentos. Espera unos minutos.'); return; }
    }
    next();
  });
  const closeSession = (req: Request, res: Response) => {
    delete db.sessions[tokenHash(tokenFor(req))];
    res.clearCookie('jamt_session', { path: '/', httpOnly: true, sameSite: 'strict' });
  };
  const setSession = (req: Request, res: Response, user: User) => {
    const token = randomBytes(32).toString('hex');
    delete db.sessions[tokenHash(tokenFor(req))];
    db.sessions[tokenHash(token)] = { userId: user.id, expires: Date.now() + 7 * 86400000 }; save();
    res.cookie('jamt_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true' || req.secure, maxAge: 7 * 86400000, path: '/' });
    res.json(view(user));
  };

  router.post('/register', (req, res) => {
    const { profile, password, publicLeaderboard } = req.body || {};
    if (!onlyKeys(req.body, ['profile', 'password', 'publicLeaderboard']) || !validProfile(profile) || typeof password !== 'string' || password.length < 10 || password.length > 128) { sendError(req, res, 400, 'Utiliza un nombre en clave del generador y una contraseña de 10–128 caracteres.'); return; }
    if (profile.audience !== 'adult') { sendError(req, res, 403, 'Los perfiles menores se guardan solo en el dispositivo. No está habilitada su sincronización.'); return; }
    if (db.users.some(user => user.alias === profile.alias)) { sendError(req, res, 409, 'Nombre en clave ya asignado. Sortea otro para registrar la cuenta.'); return; }
    const salt = randomBytes(16).toString('hex');
    const user: User = { id: randomUUID(), alias: profile.alias, salt, passwordHash: scryptSync(password, salt, 64).toString('hex'),
      profile: { alias: profile.alias, audience: profile.audience, knowledge: profile.knowledge, mode: profile.mode },
      publicLeaderboard: publicLeaderboard === true, progress: { entries: [], completedMissions: {} } };
    db.users.push(user); setSession(req, res, user);
  });
  router.post('/login', (req, res) => {
    const { profile, password } = req.body || {};
    if (!onlyKeys(req.body, ['profile', 'password', 'publicLeaderboard']) || !validProfile(profile) || typeof password !== 'string' || password.length > 128) { sendError(req, res, 400, 'Credenciales no válidas.'); return; }
    const user = db.users.find(candidate => candidate.alias === profile.alias);
    const supplied = scryptSync(password, user?.salt || 'unregistered-user', 64);
    if (!user || !timingSafeEqual(supplied, Buffer.from(user.passwordHash, 'hex'))) { sendError(req, res, 401, 'Nombre en clave o contraseña incorrectos.'); return; }
    if (user.profile.audience !== 'adult' || profile.audience !== 'adult') { sendError(req, res, 403, 'Perfil local: la sincronización de menores no está habilitada.'); return; }
    setSession(req, res, user);
  });

  router.get('/leaderboard', (req, res) => {
    const ranked = db.users.filter(user => user.publicLeaderboard && user.profile.audience === 'adult' && isCodename(user.alias))
      .sort((a, b) => totalXP(b.progress) - totalXP(a.progress) || a.alias.localeCompare(b.alias));
    const row = (user: User, index: number): PublicLeaderboardEntry => ({ position: index + 1, codename: user.alias,
      level: levelFor(totalXP(user.progress)), rank: rankFor(totalXP(user.progress)), badge: badgesFor(user.progress).at(-1) || null });
    const current = userFor(req);
    const ownIndex = current ? ranked.findIndex(user => user.id === current.id) : -1;
    res.json({ entries: ranked.slice(0, 100).map(row), self: ownIndex >= 0 ? row(ranked[ownIndex], ownIndex) : null });
  });
  router.post('/logout', (req, res) => { closeSession(req, res); save(); res.json({ ok: true }); });
  router.post('/suspend', (req, res) => {
    const user = userFor(req); if (user) user.publicLeaderboard = false;
    closeSession(req, res); save(); res.json({ ok: true });
  });
  router.use((req, res, next) => {
    const user = userFor(req);
    if (!user) { sendError(req, res, 401, 'Inicia sesión para sincronizar el expediente.'); return; }
    if (user.profile.audience !== 'adult') { sendError(req, res, 403, 'La sincronización de menores no está habilitada.'); return; }
    next();
  });
  router.get('/me', (req, res) => res.json(view(userFor(req)!)));
  router.post('/codename', (req, res) => {
    if (!onlyKeys(req.body, [])) { sendError(req, res, 400, 'Este generador no acepta nombres escritos.'); return; }
    const user = userFor(req)!;
    user.alias = generateCodename(db.users.map(candidate => candidate.alias));
    user.profile = { ...user.profile, alias: user.alias }; save(); res.json(view(user));
  });
  router.post('/profile', (req, res) => {
    const user = userFor(req)!;
    if (!onlyKeys(req.body, ['profile']) || !validProfile(req.body?.profile) || req.body.profile.alias !== user.alias) { sendError(req, res, 400, 'Perfil no válido. Cambia el nombre solo mediante el sorteo.'); return; }
    if (req.body.profile.audience !== 'adult') { sendError(req, res, 403, 'Desconecta la cuenta para continuar con un perfil local de menor.'); return; }
    user.profile = { ...req.body.profile }; save(); res.json(view(user));
  });
  router.post('/privacy', (req, res) => {
    if (!onlyKeys(req.body, ['publicLeaderboard']) || typeof req.body.publicLeaderboard !== 'boolean') { sendError(req, res, 400, 'Preferencia no válida.'); return; }
    const user = userFor(req)!; user.publicLeaderboard = req.body.publicLeaderboard; save(); res.json(view(user));
  });
  router.post('/lesson', (req, res) => {
    const { areaId, answer } = req.body || {}; const area = AREAS.find(candidate => candidate.id === areaId);
    if (!area || !Number.isInteger(answer) || answer < 0 || answer > 2) { sendError(req, res, 400, 'Evaluación no válida.'); return; }
    const user = userFor(req)!; const correct = answer === area.correct; const date = trainingDate();
    if (correct) { user.progress = award(user.progress, { key: `lesson:${date}:${areaId}`, date, area: areaId, title: area.name, score: 100, xp: 30 }); save(); }
    res.json({ correct, progress: user.progress });
  });
  router.post('/review', (req, res) => {
    const { missionId, components } = req.body || {}; const mission = MISSIONS.find(candidate => candidate.id === missionId);
    const selection: Record<string, SpacecraftComponent> = {};
    for (const category of ['capsule', 'solar', 'oxygen', 'shield', 'engine', 'payload']) {
      const component = COMPONENTS.find(candidate => candidate.id === components?.[category] && candidate.category === category); if (component) selection[category] = component;
    }
    if (!mission || Object.keys(selection).length !== 6) { sendError(req, res, 400, 'Diseño o misión no válidos.'); return; }
    const user = userFor(req)!; const result = evaluateEngineering(selection, mission, 'es', user.profile); const date = trainingDate();
    if (result.aprobado) { user.progress = award(user.progress, { key: `review:${date}:${mission.id}`, date, area: 'engineering', title: 'Diseño aprobado · ' + mission.id, score: result.puntuacion_diseno, xp: 50 }); save(); }
    res.json({ result, progress: user.progress });
  });
  app.use('/api/academy', router);
}
