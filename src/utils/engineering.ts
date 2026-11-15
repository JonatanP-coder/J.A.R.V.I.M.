import { adaptiveText } from '../academy/adaptive';
import type { MissionProfile, MissionStats, SpacecraftComponent, FlightReadinessReviewResult } from '../types/mission';
import type { LearnerProfile } from '../academy/model';
export function computeStats(components: Record<string, SpacecraftComponent>): MissionStats {
  const stats: MissionStats = { weightKg: 0, powerConsumedW: 0, powerGeneratedW: 0, netPowerW: 0, budgetUSD: 0, oxygenPercent: 0, shieldHealthPercent: 0, sciencePoints: 0 };
  Object.values(components).forEach(c => {
    stats.weightKg += c.weightKg; stats.budgetUSD += c.costUSD;
    if (c.powerW < 0) stats.powerGeneratedW -= c.powerW; else stats.powerConsumedW += c.powerW;
    stats.oxygenPercent += c.oxygenBonus || 0; stats.shieldHealthPercent += c.shieldBonus || 0; stats.sciencePoints += c.scienceBonus || 0;
  });
  stats.oxygenPercent = Math.min(100, stats.oxygenPercent); stats.shieldHealthPercent = Math.min(100, stats.shieldHealthPercent);
  stats.netPowerW = stats.powerGeneratedW - stats.powerConsumedW;
  return stats;
}
export function engineeringChecks(c: Record<string, SpacecraftComponent>, s: MissionStats, m: MissionProfile) {
  return { mass: s.weightKg <= 1500 || !!c.engine?.isHeavyEngine, power: s.netPowerW >= 0,
    oxygen: s.oxygenPercent >= m.minOxygen, shield: s.shieldHealthPercent >= m.minShield, budget: s.budgetUSD <= m.maxBudget };
}
export function evaluateEngineering(c: Record<string, SpacecraftComponent>, m: MissionProfile, lang: 'es' | 'en' = 'es', profile?: LearnerProfile): FlightReadinessReviewResult {
  const s = computeStats(c); const checks = engineeringChecks(c, s, m);
  const failures = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
  const labels = lang === 'es' ? { mass: 'masa: requiere motor pesado', power: 'potencia: generación insuficiente', oxygen: `oxígeno: mínimo ${m.minOxygen}%`, shield: `escudo: mínimo ${m.minShield}%`, budget: `presupuesto: máximo $${m.maxBudget}` } : { mass: 'mass: heavy engine required', power: 'power: insufficient generation', oxygen: `oxygen: minimum ${m.minOxygen}%`, shield: `shield: minimum ${m.minShield}%`, budget: `budget: maximum $${m.maxBudget}` };
  const aprobado = !failures.length;
  const score = aprobado ? Math.min(100, Math.round(85 + Math.min(10, s.netPowerW / 10) + (s.oxygenPercent >= m.minOxygen + 15 ? 5 : 0))) : Math.max(15, Math.min(65, 100 - failures.length * 22 - (!checks.mass ? 15 : 0) - (!checks.power ? 15 : 0)));
  const limits = failures.map(key => labels[key as keyof typeof labels]).join('; ');
  const guidance = adaptiveText(checks.power ? 'FRR' : 'power.deficit', profile, lang);
  return { aprobado, puntuacion_diseno: score,
    dictamen_tecnico: limits ? guidance + ' ' + limits + '.' : guidance,
    consejo_nasa: lang === 'en' ? 'Educational model: these thresholds and scores are not NASA flight certification. Compare generation, consumption and life support before launch.' : 'Modelo educativo: estos umbrales y puntuaciones no son una certificación de vuelo de NASA. Compara generación, consumo y soporte vital antes de despegar.' };
}
export function shipReport(c: Record<string, SpacecraftComponent>, s: MissionStats, m: MissionProfile, lang: 'es' | 'en' = 'es') {
  const checks = engineeringChecks(c, s, m);
  if (lang === 'en') return `Ship status. Rule 1, mass: ${s.weightKg} kilograms. ${checks.mass ? 'Correct.' : 'A heavy engine is required.'} Rule 2, power balance: ${s.netPowerW} net watts. ${checks.power ? 'Sufficient generation.' : 'Install more generation or reduce consumption.'} Rule 3, life support and protection: oxygen ${s.oxygenPercent} percent, minimum ${m.minOxygen}. Shielding ${s.shieldHealthPercent} percent, minimum ${m.minShield}. ${checks.oxygen && checks.shield ? 'Correct.' : 'Check life support and protection systems.'} Budget ${s.budgetUSD} of ${m.maxBudget} dollars. ${checks.budget ? 'Within the limit.' : 'Over the limit.'}`;
  return `Estado de la nave. Regla 1, masa: ${s.weightKg} kilogramos. ${checks.mass ? 'Correcta.' : 'Necesitas motor pesado.'} Regla 2, balance energético: ${s.netPowerW} vatios netos. ${checks.power ? 'Generación suficiente.' : 'Instala más generación o reduce consumo.'} Regla 3, soporte vital y protección: oxígeno ${s.oxygenPercent} por ciento, mínimo ${m.minOxygen}. Escudo ${s.shieldHealthPercent} por ciento, mínimo ${m.minShield}. ${checks.oxygen && checks.shield ? 'Correctos.' : 'Revisa los sistemas de soporte y protección.'} Presupuesto ${s.budgetUSD} de ${m.maxBudget} dólares. ${checks.budget ? 'Dentro del límite.' : 'Excede el límite.'}`;
}
