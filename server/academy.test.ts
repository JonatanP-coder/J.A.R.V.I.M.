import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { Server } from 'node:http';
import { mountAcademy } from './academy';
import { totalXP } from '../src/academy/model';
import { isCodename } from '../src/academy/codenames';
import { AREAS } from '../src/academy/curriculum';
import { COMPONENTS, MISSIONS, PRESET_CONFIGS } from '../src/data/components';
import { evaluateEngineering } from '../src/utils/engineering';

describe('Private accounts and minimal public leaderboard', () => {
  let server: Server, base: string, cookie = '', userId = '';
  const dataDir = mkdtempSync(path.join(tmpdir(), 'jamt-test-'));
  let profile = { alias: 'EstelarCometa_104', audience: 'adult', knowledge: 'beginner', mode: 'learn' };
  before(async () => {
    process.env.DATA_DIR = dataDir;
    const app = express(); app.use(express.json()); mountAcademy(app);
    server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as any).port}/api/academy/`;
  });
  after(async () => {
    await new Promise<void>(resolve => server.close(() => resolve())); delete process.env.DATA_DIR;
    const resolved = path.resolve(dataDir); assert.ok(resolved.startsWith(path.resolve(tmpdir()) + path.sep)); rmSync(resolved, { recursive: true, force: true });
  });
  async function api(endpoint: string, body?: any, extraHeaders = {}) {
    const response = await fetch(base + endpoint, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
    const setCookie = response.headers.get('set-cookie'); if (setCookie) cookie = setCookie.split(';')[0];
    return { status: response.status, data: await response.json(), response };
  }
  it('returns account errors in the requested language', async () => {
    const es = await api('login', {}, { 'Accept-Language': 'es-CO' });
    const en = await api('login', {}, { 'Accept-Language': 'en-US,en;q=0.9' });
    assert.equal(es.status, 400); assert.equal(en.status, 400);
    assert.equal(es.data.error, 'Credenciales no válidas.');
    assert.equal(en.data.error, 'Invalid credentials.');
  });
  it('rejects free-text PII, unreviewed names and extra identity fields through the API', async () => {
    for (const alias of ['Real Person', 'child@example.com', 'EstelarInventado_104']) assert.equal((await api('register', { profile: { ...profile, alias }, password: 'test-password-2048' })).status, 400);
    assert.equal((await api('register', { profile: { ...profile, email: 'private@example.com' }, password: 'test-password-2048' })).status, 400);
    assert.equal((await api('register', { profile, password: 'test-password-2048', fullName: 'Real Person' })).status, 400);
  });
  it('refuses to store accounts for minors even when publication is requested', async () => {
    for (const audience of ['junior', 'teen']) assert.equal((await api('register', { profile: { ...profile, audience }, password: 'test-password-2048', publicLeaderboard: true })).status, 403);
    assert.equal((await api('leaderboard')).data.entries.length, 0);
  });
  it('creates a password-protected pseudonymous account with an HTTP-only session', async () => {
    const result = await api('register', { profile, password: 'test-password-2048', publicLeaderboard: true });
    assert.equal(result.status, 200); userId = result.data.account.id;
    assert.ok(result.response.headers.get('set-cookie')?.includes('HttpOnly')); assert.ok(result.response.headers.get('set-cookie')?.includes('SameSite=Strict'));
    assert.equal(result.data.passwordHash, undefined);
    assert.equal((await api('register', { profile, password: 'test-password-2048' })).status, 409);
  });
  it('does not award incorrect or repeated daily answers, or trust a client date/score', async () => {
    const lesson = AREAS[0]; await api('lesson', { areaId: lesson.id, answer: 2, xp: 999999 });
    let result = await api('lesson', { areaId: lesson.id, answer: lesson.correct, date: '2020-01-01' }); assert.equal(totalXP(result.data.progress), 30);
    result = await api('lesson', { areaId: lesson.id, answer: lesson.correct }); assert.equal(totalXP(result.data.progress), 30);
    assert.notEqual(result.data.progress.entries[0].date, '2020-01-01');
  });
  it('validates catalogue components and never trusts forged review scores', async () => {
    assert.equal((await api('review', { missionId: MISSIONS[0].id, components: { engine: 'made-up' }, score: 100 })).status, 400);
    let checked = false;
    for (const preset of PRESET_CONFIGS) {
      const selected = Object.fromEntries(Object.entries(preset.components).map(([category, id]) => [category, COMPONENTS.find(component => component.id === id)!]));
      const expected = evaluateEngineering(selected, MISSIONS[0]); if (!expected.aprobado) continue;
      const result = await api('review', { missionId: MISSIONS[0].id, components: preset.components, score: 999999 });
      assert.equal(result.data.result.puntuacion_diseno, expected.puntuacion_diseno); assert.equal(totalXP(result.data.progress), 80);
      assert.equal(totalXP((await api('review', { missionId: MISSIONS[0].id, components: preset.components })).data.progress), 80); checked = true; break;
    }
    assert.ok(checked);
  });
  it('publishes only position, codename and achievements, with no UUID/age/XP/session data', async () => {
    const result = await api('leaderboard'); assert.equal(result.data.entries.length, 1);
    assert.deepEqual(Object.keys(result.data.entries[0]).sort(), ['badge', 'codename', 'level', 'position', 'rank']);
    assert.equal(result.data.self.codename, profile.alias); assert.equal(result.data.entries[0].position, 1);
    assert.doesNotMatch(JSON.stringify(result.data), new RegExp(userId));
    assert.doesNotMatch(JSON.stringify(result.data), /password|salt|session|audience|knowledge|"xp"|"id"/);
  });
  it('sorts a different safe name on the server without changing account ID, credentials or XP', async () => {
    assert.equal((await api('codename', { alias: 'Real Person' })).status, 400);
    const result = await api('codename', {}); assert.equal(result.status, 200); assert.ok(isCodename(result.data.account.alias));
    assert.notEqual(result.data.account.alias, profile.alias); assert.equal(result.data.account.id, userId); assert.equal(totalXP(result.data.progress), 80);
    profile = { ...profile, alias: result.data.account.alias };
    assert.equal((await api('profile', { profile: { ...profile, alias: 'LunarCadete_482' } })).status, 400);
  });
  it('supports withdrawing publication and disconnects before switching to a local minor profile', async () => {
    await api('privacy', { publicLeaderboard: false }); assert.equal((await api('leaderboard')).data.entries.length, 0);
    await api('privacy', { publicLeaderboard: true }); assert.equal((await api('profile', { profile: { ...profile, audience: 'junior' } })).status, 403);
    await api('suspend', {}); assert.equal((await api('leaderboard')).data.entries.length, 0); assert.equal((await api('me')).status, 401);
  });
  it('rejects cross-origin writes and incorrect credentials', async () => {
    assert.equal((await api('lesson', { areaId: 'science', answer: 0 }, { Origin: 'https://untrusted.example' })).status, 403);
    assert.equal((await api('login', { profile, password: 'incorrect-password' })).status, 401);
  });
  it('restores progress after login and persists only sanitized account fields', async () => {
    const result = await api('login', { profile, password: 'test-password-2048' }); assert.equal(result.status, 200); assert.equal(totalXP(result.data.progress), 80);
    const saved = JSON.parse(readFileSync(path.join(dataDir, 'academy.json'), 'utf8'));
    assert.equal(saved.version, 2); assert.equal(saved.users[0].id, userId); assert.equal(saved.users[0].alias, profile.alias);
    assert.doesNotMatch(JSON.stringify(saved), /test-password-2048|Real Person|child@example|private@example/);
  });
});

describe('Privacy migration of existing server accounts', () => {
  it('replaces unsafe legacy aliases and metadata while preserving an active session and progress', async () => {
    const directory = mkdtempSync(path.join(tmpdir(), 'jamt-migration-'));
    const id = randomUUID(), token = randomBytes(32).toString('hex'), salt = randomBytes(16).toString('hex');
    const original = { version: 1, users: [{ id, alias: 'Real Person', salt, passwordHash: scryptSync('migration-password', salt, 64).toString('hex'),
      email: 'private@example.com', createdAt: new Date().toISOString(), profile: { alias: 'Real Person', audience: 'adult', knowledge: 'beginner', mode: 'learn', fullName: 'Real Person' },
      publicLeaderboard: true, progress: { entries: [{ key: 'lesson:2026-11-15:science', date: '2026-11-15', area: 'science', title: 'Real Person', score: 100, xp: 30, email: 'private@example.com' }], completedMissions: {} } }],
      sessions: { [createHash('sha256').update(token).digest('hex')]: { userId: id, expires: Date.now() + 60000 } } };
    writeFileSync(path.join(directory, 'academy.json'), JSON.stringify(original));
    process.env.DATA_DIR = directory; const app = express(); app.use(express.json()); mountAcademy(app);
    const server = app.listen(0, '127.0.0.1'); await new Promise<void>(resolve => server.once('listening', resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/api/academy/me`, { headers: { Cookie: `jamt_session=${token}` } });
      const data = await response.json(); assert.equal(response.status, 200); assert.equal(data.account.id, id); assert.ok(isCodename(data.account.alias)); assert.equal(data.account.publicLeaderboard, false); assert.equal(totalXP(data.progress), 30);
      assert.doesNotMatch(readFileSync(path.join(directory, 'academy.json'), 'utf8'), /Real Person|private@example|fullName|createdAt/);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve())); delete process.env.DATA_DIR;
      assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir()) + path.sep)); rmSync(directory, { recursive: true, force: true });
    }
  });
});
