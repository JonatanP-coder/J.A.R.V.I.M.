import es from './adaptive-es.json';
import en from './adaptive-en.json';
import type { Audience, Knowledge, LearnerProfile } from './model';
import type { Language } from '../i18n/I18nContext';
import type { SpacecraftComponent } from '../types/mission';

export type AgeGroup = 'junior' | 'cadete' | 'ingeniero';
export type KnowledgeLevel = 'principiante' | 'intermedio' | 'avanzado';
export type AdaptiveDictionary = Record<string, Record<AgeGroup, Record<KnowledgeLevel, string>>>;
export type AdaptiveKey = keyof typeof es;
export type TeachingProfile = Pick<LearnerProfile, 'audience' | 'knowledge'>;
type Catalog = Record<AdaptiveKey, AdaptiveDictionary[string]>;
export const dictionaries = { es, en } satisfies Record<Language, Catalog>;

// Keep stored profile values and account records compatible with previous versions.
const ageGroup: Record<Audience, AgeGroup> = { junior: 'junior', teen: 'cadete', adult: 'ingeniero' };
const knowledgeLevel: Record<Knowledge, KnowledgeLevel> = {
  beginner: 'principiante', intermediate: 'intermedio', expert: 'avanzado',
};
export function adaptiveText(key: AdaptiveKey, profile: TeachingProfile | null | undefined, lang: Language) {
  const age = ageGroup[profile?.audience ?? 'junior'];
  const level = knowledgeLevel[profile?.knowledge ?? 'beginner'];
  return dictionaries[lang][key][age][level];
}

export const componentConcept = {
  capsule: 'Masa', solar: 'Balance energético', oxygen: 'Soporte vital',
  shield: 'TPS', engine: 'Propulsión', payload: 'Telemetría',
} as const satisfies Record<SpacecraftComponent['category'], AdaptiveKey>;
export const lessonConcept = {
  science: 'Radiación', technology: 'Balance energético', engineering: 'Empuje',
  wellbeing: 'Soporte vital', communication: 'Telemetría', teamwork: 'FRR', operations: 'Radiación',
} as const satisfies Record<string, AdaptiveKey>;
export const eventTeachingKey = {
  'solar-storm': 'event.solar-storm',
  'micrometeoroids': 'event.micrometeoroids',
  'oxygen-regulator': 'event.oxygen-regulator',
  'signal-loss': 'event.signal-loss',
  'gravity-assist': 'event.gravity-assist',
} as const satisfies Record<string, AdaptiveKey>;
