import { isCodename } from './codenames';

export type Audience = 'junior' | 'teen' | 'adult';
export type Knowledge = 'beginner' | 'intermediate' | 'expert';
export interface LearnerProfile { alias: string; audience: Audience; knowledge: Knowledge; mode: 'learn' | 'challenge' }
export interface AccessPreferences { narration: boolean; captions: boolean; contrast: boolean; reducedMotion: boolean; largeText: boolean; radar: boolean }
export interface TrainingEntry { key: string; date: string; area: string; title: string; score: number; xp: number }
export interface Progress { entries: TrainingEntry[]; completedMissions: Record<string, boolean> }
export const EMPTY_PROGRESS: Progress = { entries: [], completedMissions: {} };
export const DEFAULT_ACCESS: AccessPreferences = { narration: false, captions: true, contrast: false, reducedMotion: false, largeText: false, radar: true };
export const AUDIENCES = {
  junior: { title: 'Explorador Junior', age: '6–12 años', description: 'Una aventura contada desde la cabina.' },
  teen: { title: 'Cadete Espacial', age: '13–17 años', description: 'Explora la misión con preguntas y retos.' },
  adult: { title: 'Ingeniero de Misión', age: '18+ años', description: 'Informes de misión con un estilo directo.' },
};
export function validProfile(value: unknown): value is LearnerProfile {
  const p = value as LearnerProfile;
  return !!p && Object.keys(p).every(key => ['alias', 'audience', 'knowledge', 'mode'].includes(key)) && isCodename(p.alias) &&
    ['junior', 'teen', 'adult'].includes(p.audience) && ['beginner', 'intermediate', 'expert'].includes(p.knowledge) && ['learn', 'challenge'].includes(p.mode);
}
export function trainingDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type)!.value).join('-');
}
export function weekDates(date = trainingDate()) {
  const d = new Date(date + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return Array.from({ length: 7 }, (_, i) => { const day = new Date(d); day.setUTCDate(d.getUTCDate() + i); return day.toISOString().slice(0, 10); });
}
export function totalXP(progress: Progress) { return progress.entries.reduce((sum, e) => sum + e.xp, 0); }
export function rankFor(xp: number) { return xp >= 2000 ? 'Diamante' : xp >= 1000 ? 'Platino' : xp >= 500 ? 'Oro' : xp >= 200 ? 'Plata' : 'Bronce'; }
export function levelFor(xp: number) { return xp >= 1500 ? 4 : xp >= 600 ? 3 : xp >= 200 ? 2 : 1; }
export const LEVELS = ['Exploración', 'Construcción', 'Ingeniería', 'Misión profesional'];
export function streakFor(progress: Progress, today = trainingDate()) {
  const dates = new Set(progress.entries.map(e => e.date));
  const d = new Date(today + 'T12:00:00Z');
  if (!dates.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let streak = 0;
  while (dates.has(d.toISOString().slice(0, 10))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  return streak;
}
export function award(progress: Progress, entry: TrainingEntry): Progress {
  if (progress.entries.some(e => e.key === entry.key)) return progress;
  return { ...progress, entries: [...progress.entries, entry].slice(-3000) };
}
export function badgesFor(progress: Progress) {
  const badges: string[] = [];
  if (progress.entries.length) badges.push('Primer paso');
  if (new Set(progress.entries.map(e => e.area)).size >= 7) badges.push('Formación integral');
  if (streakFor(progress) >= 3) badges.push('Órbita constante');
  if (Object.keys(progress.completedMissions).length) badges.push('Alas de exploración');
  if (totalXP(progress) >= 1500) badges.push('Especialista de misión');
  return badges;
}
