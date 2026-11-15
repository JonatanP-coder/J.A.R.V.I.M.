import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createAnonymousId, generateCodename, isAnonymousId, isCodename } from './codenames';
import { validProfile } from './model';
import { CADET_STORAGE_KEY, createSecureCadetProfile, loadSecureCadetProfile, saveSecureCadetProfile, withCadetProgress, type LocalStorageAdapter } from '../services/cadetProfile';
class MemoryStorage implements LocalStorageAdapter {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const entry = { key: 'lesson:2026-11-15:technology', date: '2026-11-15', title: 'Tecnología', area: 'technology', score: 100, xp: 30 };
describe('Safe pseudonymous identity', () => {
  it('generates allowlisted names with three digits and avoids allocated names', () => {
    const taken = new Set<string>();
    for (let i = 0; i < 500; i++) { const name = generateCodename(taken); assert.ok(isCodename(name)); assert.match(name, /_[1-9][0-9]{2}$/); assert.ok(!taken.has(name)); taken.add(name); }
  });
  it('rejects manual names, contacts, lookalikes and Unicode normalization tricks', () => {
    for (const name of ['Ana Pérez', 'ana@example.com', '1234567890', 'EstelarCometa_099', 'EstelarCometa_1000', 'EstelarCometa_104\n', 'EstelarCometa_１０４', 'estelarCometa_104', 'CósmicoDesconocido_104', 'CósmicoCometa_104']) assert.equal(isCodename(name), false, name);
    assert.equal(isCodename('CósmicoCometa_482'), true);
    assert.equal(validProfile({ alias: 'EstelarCometa_104', audience: 'junior', knowledge: 'beginner', mode: 'learn', email: 'private@example.com' }), false);
  });
  it('creates distinct UUID v4 values that cannot be inferred from codenames', () => {
    const ids = new Set(Array.from({ length: 100 }, createAnonymousId)); assert.equal(ids.size, 100); ids.forEach(id => assert.ok(isAnonymousId(id)));
  });
  it('persists the same private UUID across reloads and codename changes', () => {
    const storage = new MemoryStorage(); const first = loadSecureCadetProfile(storage);
    const next = withCadetProgress({ ...first, codename: generateCodename([first.codename]), learner: { audience: 'junior', knowledge: 'beginner', mode: 'learn' } }, { entries: [entry], completedMissions: {} });
    assert.ok(saveSecureCadetProfile(next, storage)); const loaded = loadSecureCadetProfile(storage);
    assert.equal(loaded.id, first.id); assert.equal(loaded.codename, next.codename); assert.equal(loaded.achievements.xp, 30); assert.equal(loaded.achievements.level, 1); assert.equal(loaded.achievements.rank, 'Bronce'); assert.ok(loaded.achievements.badges.includes('Primer paso'));
  });
  it('migrates legacy PII out of profiles and logs while preserving learning progress', () => {
    const storage = new MemoryStorage();
    storage.setItem('jamt:academy:v1:profile', JSON.stringify({ alias: 'Ana Pérez', audience: 'teen', knowledge: 'intermediate', mode: 'learn', email: 'ana@example.com' }));
    storage.setItem('jamt:academy:v1:progress', JSON.stringify({ entries: [{ ...entry, title: 'Ana Pérez', email: 'ana@example.com' }], completedMissions: {} }));
    storage.setItem('jamt:log', JSON.stringify([{ text: 'Hola Ana Pérez' }]));
    const loaded = loadSecureCadetProfile(storage);
    assert.ok(isCodename(loaded.codename)); assert.equal(loaded.learner?.audience, 'teen'); assert.equal(loaded.achievements.xp, 30);
    assert.equal(storage.getItem('jamt:academy:v1:profile'), null); assert.equal(storage.getItem('jamt:log'), null);
    assert.doesNotMatch(JSON.stringify([...storage.values]), /Ana|Pérez|ana@example/);
  });
  it('strips undeclared fields and recomputes achievements instead of trusting stored totals', () => {
    const storage = new MemoryStorage(); const cadet = withCadetProgress(createSecureCadetProfile(), { entries: [entry], completedMissions: {} });
    storage.setItem(CADET_STORAGE_KEY, JSON.stringify({ ...cadet, email: 'private@example.com', achievements: { xp: 999999 }, learner: { audience: 'adult', knowledge: 'beginner', mode: 'learn', fullName: 'Real Name' } }));
    const loaded = loadSecureCadetProfile(storage);
    assert.equal(loaded.achievements.xp, 30); assert.doesNotMatch(storage.getItem(CADET_STORAGE_KEY)!, /private@example|fullName|Real Name|999999/);
  });
  it('replaces a tampered codename without changing a valid UUID or losing XP', () => {
    const storage = new MemoryStorage(); const cadet = withCadetProgress(createSecureCadetProfile(), { entries: [entry], completedMissions: {} });
    storage.setItem(CADET_STORAGE_KEY, JSON.stringify({ ...cadet, codename: 'Real Name' })); const loaded = loadSecureCadetProfile(storage);
    assert.equal(loaded.id, cadet.id); assert.ok(isCodename(loaded.codename)); assert.equal(loaded.achievements.xp, 30);
  });
  it('handles corrupt or denied storage without collecting any server identity', () => {
    const storage = new MemoryStorage(); storage.setItem(CADET_STORAGE_KEY, '{broken'); assert.ok(isAnonymousId(loadSecureCadetProfile(storage).id));
    const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() {} };
    const cadet = loadSecureCadetProfile(denied); assert.ok(isAnonymousId(cadet.id)); assert.equal(saveSecureCadetProfile(cadet, denied), false);
  });
});
