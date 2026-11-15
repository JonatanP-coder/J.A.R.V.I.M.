import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { award, EMPTY_PROGRESS, trainingDate, weekDates, streakFor, totalXP, validProfile } from './model';
import { AREAS } from './curriculum';
import { COMPONENTS, MISSIONS } from '../data/components';
import { computeStats, evaluateEngineering } from '../utils/engineering';
import { getFlightEvent } from './pedagogy';
const components = Object.fromEntries(['capsule', 'solar', 'oxygen', 'shield', 'engine', 'payload'].map(category => [category, COMPONENTS.find(c => c.category === category)!]));
describe('Educational profiles preserve one physical model', () => {
  it('preserves approval, score and telemetry across age and knowledge', () => {
    const original = computeStats(components);
    const results = ['junior', 'teen', 'adult'].flatMap(audience => ['beginner', 'intermediate', 'expert'].map(knowledge => evaluateEngineering(components, MISSIONS[0], 'es', { alias: 'Test', audience, knowledge, mode: 'learn' } as any)));
    results.forEach(result => { assert.equal(result.aprobado, results[0].aprobado); assert.equal(result.puntuacion_diseno, results[0].puntuacion_diseno); });
    assert.deepEqual(computeStats(components), original);
  });
  it('keeps event impacts identical with simplified explanations and offline operation', () => {
    for (const index of [0, 1, 2, 3]) {
      const base = getFlightEvent(index); const simple = getFlightEvent(index, 'es', { alias: 'Test', audience: 'junior', knowledge: 'beginner', mode: 'learn' });
      assert.notEqual(simple.descripcion, base.descripcion);
      simple.opciones.forEach((o, i) => { for (const key of ['impacto_energia', 'impacto_oxigeno', 'impacto_escudo'] as const) assert.equal(o[key], base.opciones[i][key]); });
    }
  });
});
describe('Daily learning and persistence invariants', () => {
  it('uses Bogotá midnight instead of UTC midnight', () => { assert.equal(trainingDate(new Date('2026-11-16T04:59:00Z')), '2026-11-15'); assert.equal(trainingDate(new Date('2026-11-16T05:00:00Z')), '2026-11-16'); });
  it('never awards the same daily activity twice', () => { const entry = { key: 'lesson:2026-11-15:science', date: '2026-11-15', title: 'Science', area: 'science', score: 100, xp: 30 }; const p = award(award(EMPTY_PROGRESS, entry), entry); assert.equal(totalXP(p), 30); assert.equal(p.entries.length, 1); });
  it('counts streaks through yesterday without removing earned XP', () => { const entries = ['2026-11-13', '2026-11-14'].map(date => ({ key: date, date, title: 'Practice', area: 'science', score: 100, xp: 30 })); assert.equal(streakFor({ ...EMPTY_PROGRESS, entries }, '2026-11-15'), 2); assert.equal(streakFor({ ...EMPTY_PROGRESS, entries }, '2026-11-17'), 0); assert.equal(totalXP({ ...EMPTY_PROGRESS, entries }), 60); });
  it('builds a Monday-to-Sunday week and all seven accessible areas', () => { assert.deepEqual(weekDates('2026-11-15'), ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']); assert.equal(new Set(AREAS.map(a => a.id)).size, 7); });
  it('rejects corrupt profile data and allows adults to start as beginners', () => { assert.equal(validProfile({}), false); assert.equal(validProfile({ alias: '<script>', audience: 'adult', knowledge: 'expert', mode: 'learn' }), false); assert.equal(validProfile({ alias: 'EstelarCometa_104', audience: 'adult', knowledge: 'beginner', mode: 'learn' }), true); });
});
