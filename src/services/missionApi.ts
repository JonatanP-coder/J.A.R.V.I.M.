import type { MissionProfile, MissionStats, SpacecraftComponent, MissionEvent } from '../types/mission';
import type { LearnerProfile } from '../academy/model';
import { evaluateEngineering } from '../utils/engineering';
import { getFlightEvent } from '../academy/pedagogy';
export async function requestFlightReadinessReview(components: Record<string, SpacecraftComponent>, _stats: MissionStats, mission: MissionProfile, lang: 'es' | 'en' = 'es', learnerProfile?: LearnerProfile) {
  return evaluateEngineering(components, mission, lang, learnerProfile);
}
export async function requestMissionEvent(_stats: unknown, _mission: MissionProfile, eventIndex: number, lang: 'es' | 'en' = 'es', learnerProfile?: LearnerProfile): Promise<MissionEvent> {
  return getFlightEvent(eventIndex, lang, learnerProfile);
}
