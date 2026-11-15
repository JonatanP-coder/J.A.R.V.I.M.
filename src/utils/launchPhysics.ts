import { MissionStats, SpacecraftComponent } from '../types/mission';

export type LaunchPhase =
  | 'prelaunch'
  | 'ignition'
  | 'liftoff'
  | 'max_q'
  | 'mesosphere'
  | 'orbital_insertion';

export type PlumeStyle = 'cryo' | 'kerolox' | 'ion';

export interface VehicleLaunchProfile {
  dryMassKg: number;
  propellantMassKg: number;
  totalMassKg: number;
  engineId: string;
  engineName: string;
  isHeavyEngine: boolean;
  baseThrustN: number;
  effectiveMaxThrustN: number;
  ispSec: number;
  fuelBurnRatePctPerSec: number;
  powerEfficiencyBonus: number;
  batteryCapacityWh: number;
  dragCoeff: number;
  thermalLimitFactor: number;
  plumeStyle: PlumeStyle;
  shakeIntensity: number;
  initialTwr: number;
  payloadName: string;
  hasRoverPayload: boolean;
}

export interface LaunchTelemetry {
  phase: LaunchPhase;
  elapsedSec: number;
  altitudeKm: number;
  velocityKmh: number;
  velocityMs: number;
  thrustKN: number;
  throttlePercent: number;
  accelerationG: number;
  fuelPercent: number;
  batteryPercent: number;
  netPowerW: number;
  dynamicPressureKPa: number;
  currentMassKg: number;
  twr: number;
  visualAltitudeUnits: number;
  progressPercent: number;
  isComplete: boolean;
}

export const TARGET_ORBIT_ALTITUDE_KM = 120.0;
const G0 = 9.80665;

/**
 * Derives physical flight characteristics strictly from the user's selected Hangar components.
 */
export function computeVehicleLaunchProfile(
  selectedComponents: Record<string, SpacecraftComponent>,
  stats: MissionStats
): VehicleLaunchProfile {
  const engine = selectedComponents.engine;
  const solar = selectedComponents.solar;
  const capsule = selectedComponents.capsule;
  const shield = selectedComponents.shield;
  const payload = selectedComponents.payload;

  const dryMassKg = Math.max(450, stats.weightKg || 1200);
  // Propellant stage scales modestly with vehicle dry mass (~35% of dry mass for orbital insertion delta-v)
  const propellantMassKg = Math.round(dryMassKg * 0.35);
  const totalMassKg = dryMassKg;

  // 1. Engine physical parameters
  let baseThrustN = 28500;
  let ispSec = 311;
  let fuelBurnRatePctPerSec = 4.5;
  let plumeStyle: PlumeStyle = 'kerolox';
  let shakeIntensity = 0.78;
  const engineId = engine?.id || 'motor-bipropelente-merlin';

  if (engineId === 'motor-pesado-raptor' || engine?.isHeavyEngine) {
    baseThrustN = 47500;
    ispSec = 380;
    fuelBurnRatePctPerSec = 3.9;
    plumeStyle = 'cryo';
    shakeIntensity = 1.0;
  } else if (engineId === 'propulsor-ionico-hall') {
    baseThrustN = 22800;
    ispSec = 1650;
    fuelBurnRatePctPerSec = 1.65;
    plumeStyle = 'ion';
    shakeIntensity = 0.48;
  }

  // 2. Solar / High-efficiency power bus impact on turbopump & electric ion efficiency
  let solarEfficiencyBase = 0.03;
  let batteryCapacityWh = 1500;
  if (solar?.id === 'paneles-ultraflex-triple') {
    solarEfficiencyBase = 0.12;
    batteryCapacityWh = 2400;
  } else if (solar?.id === 'micro-paneles-helio-silicio') {
    solarEfficiencyBase = -0.02;
    batteryCapacityWh = 950;
  }

  const netPowerBonus = Math.max(-0.08, Math.min(0.10, stats.netPowerW / 2400));
  const powerEfficiencyBonus = solarEfficiencyBase + netPowerBonus;
  const effectiveMaxThrustN = Math.round(baseThrustN * (1 + powerEfficiencyBonus));

  // 3. Capsule aerodynamic profile
  let dragCoeff = 0.31;
  if (capsule?.id === 'modulo-apolo-nextgen') dragCoeff = 0.25;
  else if (capsule?.id === 'cabina-dragon-explorer') dragCoeff = 0.36;

  // 4. Shield thermal rating
  let thermalLimitFactor = 1.1;
  if (shield?.id === 'escudo-pica-x') thermalLimitFactor = 1.3;
  else if (shield?.id === 'blindaje-polietileno-boro') thermalLimitFactor = 1.18;
  else if (shield?.id === 'malla-ceramica-ultraligera') thermalLimitFactor = 0.92;

  const initialTwr = effectiveMaxThrustN / (totalMassKg * G0);

  return {
    dryMassKg,
    propellantMassKg,
    totalMassKg,
    engineId,
    engineName: engine?.name || 'Propulsor Estándar',
    isHeavyEngine: !!engine?.isHeavyEngine || engineId === 'motor-pesado-raptor',
    baseThrustN,
    effectiveMaxThrustN,
    ispSec,
    fuelBurnRatePctPerSec,
    powerEfficiencyBonus,
    batteryCapacityWh,
    dragCoeff,
    thermalLimitFactor,
    plumeStyle,
    shakeIntensity,
    initialTwr: Math.round(initialTwr * 100) / 100,
    payloadName: payload?.name || 'Instrumentación Científica',
    hasRoverPayload: payload?.id === 'payload-rover-autonomo',
  };
}

export function createInitialLaunchTelemetry(
  profile: VehicleLaunchProfile,
  stats: MissionStats
): LaunchTelemetry {
  return {
    phase: 'prelaunch',
    elapsedSec: 0,
    altitudeKm: 0,
    velocityKmh: 0,
    velocityMs: 0,
    thrustKN: 0,
    throttlePercent: 0,
    accelerationG: 1.0,
    fuelPercent: 100,
    batteryPercent: 100,
    netPowerW: stats.netPowerW,
    dynamicPressureKPa: 0,
    currentMassKg: profile.totalMassKg,
    twr: profile.initialTwr,
    visualAltitudeUnits: 0,
    progressPercent: 0,
    isComplete: false,
  };
}

/**
 * Advances the launch simulation by `dt` seconds using real component-linked physics.
 * Heavy engines & light capsules produce higher acceleration (G-force) and climb faster;
 * heavier payloads (like the 210 kg Rover) and dense capsules slow atmospheric climb and draw more fuel.
 */
export function stepLaunchPhysics(
  prev: LaunchTelemetry,
  profile: VehicleLaunchProfile,
  stats: MissionStats,
  dt: number
): LaunchTelemetry {
  if (prev.isComplete || prev.phase === 'prelaunch') return prev;

  const clampedDt = Math.min(0.05, Math.max(0.001, dt));
  const elapsedSec = prev.elapsedSec + clampedDt;

  // Ignition spool-up during first 1.25s while launch clamps hold the craft on the pad
  const IGNITION_HOLD_SEC = 1.25;
  const isHoldDown = elapsedSec < IGNITION_HOLD_SEC;

  // Atmospheric density decays exponentially with altitude (scale height ~8.5 km)
  const altM = prev.altitudeKm * 1000;
  const airDensity = 1.225 * Math.exp(-prev.altitudeKm / 8.5);

  // Max-Q throttle modulation around 10-25 km if thermal shield rating is lighter
  let throttle = 1.0;
  if (isHoldDown) {
    throttle = Math.min(1.0, 0.2 + (elapsedSec / IGNITION_HOLD_SEC) * 0.8);
  } else if (prev.altitudeKm > 8 && prev.altitudeKm < 26 && profile.thermalLimitFactor < 1.0) {
    throttle = 0.88;
  }

  // Propellant depletion reduces vehicle mass dynamically
  const fuelBurn = profile.fuelBurnRatePctPerSec * throttle * clampedDt;
  const fuelPercent = Math.max(8, prev.fuelPercent - fuelBurn);
  const burnedMass = profile.propellantMassKg * ((100 - fuelPercent) / 100);
  const currentMassKg = Math.max(profile.dryMassKg * 0.72, profile.totalMassKg - burnedMass * 0.45);

  const thrustN = profile.effectiveMaxThrustN * throttle;
  const thrustKN = Math.round((thrustN / 1000) * 10) / 10;

  // Gravity decreases with altitude (Earth radius 6371 km)
  const earthRadiusKm = 6371;
  const localG = G0 * Math.pow(earthRadiusKm / (earthRadiusKm + prev.altitudeKm), 2);
  const twr = thrustN / (currentMassKg * localG);

  // Dynamic pressure q = 0.5 * rho * v^2 (using scaled physical ascent velocity)
  const aeroDragN =
    0.5 * airDensity * prev.velocityMs * prev.velocityMs * profile.dragCoeff * 1.45;
  const dynamicPressureKPa = Math.round(((0.5 * airDensity * prev.velocityMs * prev.velocityMs) / 1000) * 10) / 10;

  let velocityMs = prev.velocityMs;
  let altitudeKm = prev.altitudeKm;
  let accelerationG = 1.0;

  if (!isHoldDown) {
    // Physical net vertical acceleration in m/s^2
    const rawAccelMs2 = Math.max(1.8, (thrustN - aeroDragN) / currentMassKg - localG);
    accelerationG = Math.round((1 + rawAccelMs2 / G0) * 100) / 100;

    // Ascent pacing scales directly with physical acceleration so heavy vs light configurations visibly differ
    // Typical rawAccelMs2 ranges from ~6 m/s² (heavy Merlin) to ~24 m/s² (light Raptor)
    // Scale to achieve orbital velocity (~7,800 m/s) & 120 km altitude over ~10-15 seconds of flight
    const accelRatio = Math.max(0.55, Math.min(2.4, rawAccelMs2 / 14.0));
    const speedGainMs = (540 + rawAccelMs2 * 24) * accelRatio * clampedDt;
    velocityMs = Math.min(8200, velocityMs + speedGainMs);

    // Altitude integration (vertical component increases as pitch clears tower, reaching ~120 km)
    const verticalRateKmS = (3.8 + (velocityMs / 8000) * 12.5) * (0.7 + accelRatio * 0.35);
    altitudeKm = Math.min(TARGET_ORBIT_ALTITUDE_KM, altitudeKm + verticalRateKmS * clampedDt);
  } else {
    accelerationG = Math.round((1 + (throttle * 0.25)) * 100) / 100;
  }

  // Electrical bus & battery dynamics during thrust
  // Above 35 km solar arrays receive unobstructed orbital sunlight
  const sunlightFactor = altitudeKm > 35 ? 1.15 : 0.72 + (altitudeKm / 35) * 0.28;
  const activeThrustDrawW = profile.engineId === 'propulsor-ionico-hall' ? 220 * throttle : 95 * throttle;
  const effectiveGeneratedW = stats.powerGeneratedW * sunlightFactor;
  const netPowerW = Math.round(effectiveGeneratedW - (stats.powerConsumedW + activeThrustDrawW));
  const batteryDeltaPct = ((netPowerW / profile.batteryCapacityWh) * clampedDt) * 18;
  const batteryPercent = Math.max(15, Math.min(100, prev.batteryPercent + batteryDeltaPct));

  // Determine Launch Phase
  let phase: LaunchPhase = 'ignition';
  if (!isHoldDown) {
    if (altitudeKm < 6) phase = 'liftoff';
    else if (altitudeKm < 38) phase = 'max_q';
    else if (altitudeKm < TARGET_ORBIT_ALTITUDE_KM) phase = 'mesosphere';
    else phase = 'orbital_insertion';
  }

  const progressPercent = Math.min(100, (altitudeKm / TARGET_ORBIT_ALTITUDE_KM) * 100);
  const isComplete = altitudeKm >= TARGET_ORBIT_ALTITUDE_KM;

  // Map 0..120 km non-linearly to dramatic 3D visual climb (0..180 world units)
  const visualAltitudeUnits = isHoldDown
    ? 0
    : Math.pow(altitudeKm / TARGET_ORBIT_ALTITUDE_KM, 0.85) * 165;

  return {
    phase,
    elapsedSec,
    altitudeKm: Math.round(altitudeKm * 100) / 100,
    velocityKmh: Math.round(velocityMs * 3.6),
    velocityMs: Math.round(velocityMs),
    thrustKN,
    throttlePercent: Math.round(throttle * 100),
    accelerationG,
    fuelPercent: Math.round(fuelPercent * 10) / 10,
    batteryPercent: Math.round(batteryPercent * 10) / 10,
    netPowerW,
    dynamicPressureKPa,
    currentMassKg: Math.round(currentMassKg),
    twr: Math.round(twr * 100) / 100,
    visualAltitudeUnits,
    progressPercent: Math.round(progressPercent * 10) / 10,
    isComplete,
  };
}
