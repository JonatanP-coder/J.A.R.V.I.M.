import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCameraBasisXZ,
  computeStrafeTargetVelocity,
  dampAngleShortest,
  getRoverModelYaw,
  getWheelSteerAndRoll,
} from '../roverKinematics.ts';
import {
  computeVehicleLaunchProfile,
  createInitialLaunchTelemetry,
  stepLaunchPhysics,
  type LaunchTelemetry,
} from '../launchPhysics.ts';
import { COMPONENTS } from '../../data/components.ts';
import type { MissionStats, SpacecraftComponent } from '../../types/mission.ts';

function pick(id: string): SpacecraftComponent {
  const found = COMPONENTS.find((c) => c.id === id);
  if (!found) throw new Error(`Component not found: ${id}`);
  return found;
}

describe('Mars Rover Directional Strafe & Camera Rotation Sync', () => {
  it('computes strict right-handed screen Right vector (Forward × Up) at initial theta=PI', () => {
    // At theta = PI, camera sits at -Z looking toward +Z
    const basis = getCameraBasisXZ(Math.PI);
    assert.ok(Math.abs(basis.fwdX) < 1e-6);
    assert.ok(basis.fwdZ > 0.999);
    // Standing at -Z facing +Z with +Y up, screen right is -X
    assert.ok(basis.rightX < -0.999);
    assert.ok(Math.abs(basis.rightZ) < 1e-6);

    const strafeRight = computeStrafeTargetVelocity(0, 1, basis, 3.0);
    const strafeLeft = computeStrafeTargetVelocity(0, -1, basis, 3.0);
    assert.ok(strafeRight.vx < -2.99);
    assert.ok(strafeLeft.vx > 2.99);
  });

  it('keeps A (left) and D (right) strictly aligned when camera orbits 90° and 180°', () => {
    // At theta = 0, camera sits at +Z looking toward -Z -> screen right is +X
    const basis0 = getCameraBasisXZ(0);
    const right0 = computeStrafeTargetVelocity(0, 1, basis0, 3.0);
    const left0 = computeStrafeTargetVelocity(0, -1, basis0, 3.0);
    assert.ok(right0.vx > 2.99);
    assert.ok(left0.vx < -2.99);

    // At theta = +PI/2, camera sits at +X looking toward -X -> screen right is -Z
    const basis90 = getCameraBasisXZ(Math.PI / 2);
    const right90 = computeStrafeTargetVelocity(0, 1, basis90, 3.0);
    const left90 = computeStrafeTargetVelocity(0, -1, basis90, 3.0);
    assert.ok(right90.vz < -2.99);
    assert.ok(left90.vz > 2.99);
  });

  it('rotates rover yaw in the EXACT same left/right direction as camera rotation', () => {
    const baseTheta = Math.PI;
    // Turning camera left increases sphericalTheta
    const leftBasis = getCameraBasisXZ(baseTheta + 0.4);
    // Turning camera right decreases sphericalTheta
    const rightBasis = getCameraBasisXZ(baseTheta - 0.4);

    // Three.js rotation.y = +yaw maps +Z to (sin(yaw), 0, cos(yaw))
    const leftYaw = getRoverModelYaw(leftBasis.camGazeAngle);
    const rightYaw = getRoverModelYaw(rightBasis.camGazeAngle);

    assert.ok(leftYaw > 0, 'Left camera turn must yield positive rover.rotation.y');
    assert.ok(rightYaw < 0, 'Right camera turn must yield negative rover.rotation.y');
    assert.ok(Math.abs(Math.sin(leftYaw) - leftBasis.fwdX) < 1e-6);
    assert.ok(Math.abs(Math.cos(leftYaw) - leftBasis.fwdZ) < 1e-6);
  });

  it('interpolates across the ±PI seam along shortest arc without 360° flip', () => {
    const start = Math.PI - 0.05;
    const target = -Math.PI + 0.05;
    const next = dampAngleShortest(start, target, 10, 0.05);
    // Shortest step moves toward +PI (crosses +PI -> wraps cleanly near PI, distance < 0.1)
    const angularDist = Math.abs(Math.atan2(Math.sin(next - start), Math.cos(next - start)));
    assert.ok(angularDist < 0.15, `Expected small shortest-arc step, got ${angularDist}`);
  });

  it('steers wheels into strafe direction properly', () => {
    const rightStrafe = getWheelSteerAndRoll(0, 1);
    const leftStrafe = getWheelSteerAndRoll(0, -1);
    assert.ok(rightStrafe.steerAngleRad < -1.5 && rightStrafe.rollSign === 1);
    assert.ok(leftStrafe.steerAngleRad > 1.5 && leftStrafe.rollSign === 1);
  });
});

describe('Component-Linked Launch Physics & Telemetry', () => {
  const heavyComponents: Record<string, SpacecraftComponent> = {
    capsule: pick('capsula-orion-jr'),
    solar: pick('paneles-ultraflex-triple'),
    oxygen: pick('oxigeno-criogenico-doble'),
    shield: pick('escudo-pica-x'),
    engine: pick('motor-pesado-raptor'),
    payload: pick('payload-rover-autonomo'),
  };

  const lightMerlinComponents: Record<string, SpacecraftComponent> = {
    capsule: pick('modulo-apolo-nextgen'),
    solar: pick('micro-paneles-helio-silicio'),
    oxygen: pick('oxigeno-criogenico-doble'),
    shield: pick('escudo-pica-x'),
    engine: pick('motor-bipropelente-merlin'),
    payload: pick('payload-rover-autonomo'),
  };

  function calcStats(comps: Record<string, SpacecraftComponent>): MissionStats {
    let weightKg = 0;
    let powerConsumedW = 0;
    let powerGeneratedW = 0;
    let budgetUSD = 0;
    let oxygenPercent = 0;
    let shieldHealthPercent = 0;
    let sciencePoints = 0;
    for (const c of Object.values(comps)) {
      weightKg += c.weightKg;
      budgetUSD += c.costUSD;
      if (c.powerW < 0) powerGeneratedW += Math.abs(c.powerW);
      else powerConsumedW += c.powerW;
      oxygenPercent += c.oxygenBonus || 0;
      shieldHealthPercent += c.shieldBonus || 0;
      sciencePoints += c.scienceBonus || 0;
    }
    return {
      weightKg,
      powerConsumedW,
      powerGeneratedW,
      netPowerW: powerGeneratedW - powerConsumedW,
      budgetUSD,
      oxygenPercent,
      shieldHealthPercent,
      sciencePoints,
    };
  }

  it('produces distinctly higher thrust and acceleration with Raptor heavy engine + UltraFlex solar than Merlin', () => {
    const heavyStats = calcStats(heavyComponents);
    const merlinStats = calcStats(lightMerlinComponents);

    const raptorProfile = computeVehicleLaunchProfile(heavyComponents, heavyStats);
    const merlinProfile = computeVehicleLaunchProfile(lightMerlinComponents, merlinStats);

    assert.ok(raptorProfile.effectiveMaxThrustN > merlinProfile.effectiveMaxThrustN);
    assert.ok(raptorProfile.initialTwr > merlinProfile.initialTwr);

    // Step both through ignition + 3 seconds of liftoff
    let raptorState: LaunchTelemetry = { ...createInitialLaunchTelemetry(raptorProfile, heavyStats), phase: 'ignition' };
    let merlinState: LaunchTelemetry = { ...createInitialLaunchTelemetry(merlinProfile, merlinStats), phase: 'ignition' };

    for (let i = 0; i < 80; i++) {
      raptorState = stepLaunchPhysics(raptorState, raptorProfile, heavyStats, 0.05);
      merlinState = stepLaunchPhysics(merlinState, merlinProfile, merlinStats, 0.05);
    }

    assert.ok(raptorState.altitudeKm > merlinState.altitudeKm, 'Raptor should climb higher in 4s');
    assert.ok(raptorState.velocityMs > merlinState.velocityMs, 'Raptor should reach higher velocity in 4s');
    assert.ok(raptorState.currentMassKg < raptorProfile.totalMassKg, 'Mass should decrease as propellant burns');
  });

  it('reaches 120 km orbital insertion cleanly', () => {
    const stats = calcStats(heavyComponents);
    const profile = computeVehicleLaunchProfile(heavyComponents, stats);
    let state: LaunchTelemetry = { ...createInitialLaunchTelemetry(profile, stats), phase: 'ignition' };

    for (let i = 0; i < 400 && !state.isComplete; i++) {
      state = stepLaunchPhysics(state, profile, stats, 0.05);
    }

    assert.equal(state.isComplete, true);
    assert.equal(state.phase, 'orbital_insertion');
    assert.ok(state.altitudeKm >= 120);
    assert.ok(state.fuelPercent > 8 && state.fuelPercent < 100);
  });
});
