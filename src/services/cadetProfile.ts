import { createAnonymousId, generateCodename, isAnonymousId, isCodename, type Codename } from '../academy/codenames';
import { badgesFor, EMPTY_PROGRESS, levelFor, rankFor, totalXP, validProfile, type LearnerProfile, type Progress } from '../academy/model';
import { AREAS } from '../academy/curriculum';
import { MISSIONS } from '../data/components';

export const CADET_STORAGE_KEY = 'jamt:cadet:v2';
export interface LocalStorageAdapter { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export interface SecureCadetProfile {
  schemaVersion: 2;
  /** Private UUID, never included in leaderboard DTOs, certificates or URLs. */
  id: string;
  codename: Codename;
  learner: Omit<LearnerProfile, 'alias'> | null;
  progress: Progress;
  achievements: { xp: number; level: number; rank: string; badges: string[] };
}
function browserStorage(): LocalStorageAdapter | null { try { return localStorage; } catch { return null; } }
function read(storage: LocalStorageAdapter | null, key: string): unknown { try { return JSON.parse(storage?.getItem(key) || 'null'); } catch { return null; } }
export function validProgress(value: unknown): value is Progress {
  const p = value as Progress;
  return !!p && Array.isArray(p.entries) && p.entries.length <= 3000 && p.entries.every(e =>
    typeof e.key === 'string' && typeof e.date === 'string' && typeof e.area === 'string' && typeof e.title === 'string' && Number.isFinite(e.xp) && e.xp >= 0 && Number.isFinite(e.score)) &&
    !!p.completedMissions && typeof p.completedMissions === 'object' && !Array.isArray(p.completedMissions) && Object.values(p.completedMissions).every(v => typeof v === 'boolean');
}
/** Rebuild labels from trusted catalogs instead of carrying free-text legacy metadata. */
export function sanitizeProgress(progress: Progress): Progress {
  const entries: Progress['entries'] = [];
  const seen = new Set<string>();
  for (const entry of progress.entries) {
    const match = /^(lesson|review|mission):(\d{4}-\d{2}-\d{2}):([a-z0-9_-]+)$/.exec(entry.key);
    if (!match || seen.has(entry.key) || !Number.isFinite(entry.xp) || !Number.isFinite(entry.score)) continue;
    const [, kind, date, target] = match;
    const area = AREAS.find(candidate => candidate.id === target);
    const mission = MISSIONS.find(candidate => candidate.id === target);
    if ((kind === 'lesson' && !area) || (kind !== 'lesson' && !mission)) continue;
    seen.add(entry.key);
    entries.push({ key: entry.key, date, area: kind === 'lesson' ? area!.id : kind === 'review' ? 'engineering' : 'operations',
      title: kind === 'lesson' ? area!.name : (kind === 'review' ? 'Diseño aprobado · ' : 'Tránsito completado · ') + mission!.id,
      score: Math.max(0, Math.min(100, entry.score)), xp: Math.max(0, Math.min(80, entry.xp)) });
  }
  return { entries, completedMissions: Object.fromEntries(MISSIONS.filter(mission => progress.completedMissions[mission.id] === true).map(mission => [mission.id, true])) };
}
export function createSecureCadetProfile(): SecureCadetProfile {
  return { schemaVersion: 2, id: createAnonymousId(), codename: generateCodename(), learner: null,
    progress: { entries: [], completedMissions: {} }, achievements: { xp: 0, level: 1, rank: 'Bronce', badges: [] } };
}
export function withCadetProgress(cadet: SecureCadetProfile, progress: Progress): SecureCadetProfile {
  const xp = totalXP(progress);
  return { ...cadet, progress, achievements: { xp, level: levelFor(xp), rank: rankFor(xp), badges: badgesFor(progress) } };
}
function safeLearner(value: unknown): SecureCadetProfile['learner'] {
  const p = value as LearnerProfile;
  if (!p) return null;
  const candidate = { alias: 'EstelarCometa_104', audience: p.audience, knowledge: p.knowledge, mode: p.mode };
  return validProfile(candidate) ? { audience: p.audience, knowledge: p.knowledge, mode: p.mode } : null;
}
export function saveSecureCadetProfile(cadet: SecureCadetProfile, storage = browserStorage()): boolean {
  if (!storage || !isAnonymousId(cadet.id) || !isCodename(cadet.codename) || !validProgress(cadet.progress)) return false;
  const learner = safeLearner(cadet.learner);
  // Explicit serialization prevents fullName/email/unknown properties leaking into storage.
  const clean = withCadetProgress({ schemaVersion: 2, id: cadet.id, codename: cadet.codename, learner, progress: EMPTY_PROGRESS, achievements: cadet.achievements }, sanitizeProgress(cadet.progress));
  try { storage.setItem(CADET_STORAGE_KEY, JSON.stringify(clean)); return true; } catch { return false; }
}
export function loadSecureCadetProfile(storage = browserStorage()): SecureCadetProfile {
  const stored = read(storage, CADET_STORAGE_KEY) as SecureCadetProfile | null;
  if (stored?.schemaVersion === 2) {
    const fresh = createSecureCadetProfile();
    const clean = withCadetProgress({ ...fresh, id: isAnonymousId(stored.id) ? stored.id : fresh.id, codename: isCodename(stored.codename) ? stored.codename : fresh.codename, learner: safeLearner(stored.learner) }, validProgress(stored.progress) ? sanitizeProgress(stored.progress) : EMPTY_PROGRESS);
    if (!isCodename(stored.codename)) { try { storage?.removeItem('jamt:log'); } catch {} }
    saveSecureCadetProfile(clean, storage); return clean;
  }
  const cadet = createSecureCadetProfile();
  const legacy = read(storage, 'jamt:academy:v1:profile');
  const legacyProgress = read(storage, 'jamt:academy:v1:progress');
  cadet.learner = safeLearner(legacy);
  const migrated = withCadetProgress(cadet, validProgress(legacyProgress) ? sanitizeProgress(legacyProgress) : EMPTY_PROGRESS);
  saveSecureCadetProfile(migrated, storage);
  // Prior aliases may contain PII. Never retain them or their narration history.
  for (const key of ['jamt:academy:v1:profile', 'jamt:academy:v1:progress', 'jamt:log']) { try { storage?.removeItem(key); } catch {} }
  return migrated;
}
