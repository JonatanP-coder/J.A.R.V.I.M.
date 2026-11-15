import React from 'react';
import { MissionProfile, MissionStats, SpacecraftComponent } from '../types/mission';
import { LaunchTelemetry, TARGET_ORBIT_ALTITUDE_KM, VehicleLaunchProfile } from '../utils/launchPhysics';
import { sounds } from '../utils/audio';
import {
  Activity,
  ArrowRight,
  Battery,
  Flame,
  Fuel,
  Gauge,
  Rocket,
  RotateCcw,
  Shield,
  Sparkles,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedComponent, getLocalizedMission } from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';

interface LaunchSequenceHUDProps {
  mission: MissionProfile;
  stats: MissionStats;
  selectedComponents: Record<string, SpacecraftComponent>;
  profile: VehicleLaunchProfile;
  telemetry: LaunchTelemetry;
  launchActive: boolean;
  onStartLaunch: () => void;
  onProceedToCruise: () => void;
  onAbortToHangar: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const PHASE_ORDER: LaunchTelemetry['phase'][] = [
  'ignition',
  'liftoff',
  'max_q',
  'mesosphere',
  'orbital_insertion',
];

export const LaunchSequenceHUD: React.FC<LaunchSequenceHUDProps> = ({
  mission,
  stats,
  selectedComponents,
  profile,
  telemetry,
  launchActive,
  onStartLaunch,
  onProceedToCruise,
  onAbortToHangar,
  isMuted,
  onToggleMute,
}) => {
  const { lang } = useI18n();
  const t = UI_COPY[lang].launch;
  const titleT = UI_COPY[lang].title;

  const locMission = getLocalizedMission(mission, lang);
  const engineName = getLocalizedComponent(selectedComponents.engine, lang).name || profile.engineName;
  const capsuleName = getLocalizedComponent(selectedComponents.capsule, lang).name;
  const payloadName = getLocalizedComponent(selectedComponents.payload, lang).name;

  const phaseOrder = ['prelaunch', ...PHASE_ORDER];
  const currentPhaseIdx = phaseOrder.indexOf(telemetry.phase);
  const machNumber = (telemetry.velocityMs / 343).toFixed(1);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Cluster: Status Bar + Active Ascent Stage Stepper */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-blue-950/85 border border-blue-500/40 text-blue-200 text-xs font-mono font-bold flex items-center gap-2 backdrop-blur-md shadow-lg">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  telemetry.isComplete
                    ? 'bg-emerald-400'
                    : launchActive
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-sky-400'
                }`}
              />
              <span>
                {telemetry.isComplete
                  ? t.statusComplete
                  : launchActive
                  ? t.statusActive
                  : t.statusReady}
              </span>
            </div>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 backdrop-blur-md">
              <span>{locMission.badge}</span>
              <span className="text-slate-600">·</span>
              <span className="text-cyan-300 font-semibold">{engineName}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle compact />

            <button
              onClick={() => {
                sounds.playClick();
                onToggleMute();
              }}
              className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 cursor-pointer backdrop-blur-md"
              title={isMuted ? titleT.enableAudio : titleT.muteAudio}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onAbortToHangar();
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-950/85 border border-rose-700 hover:border-rose-500 text-rose-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.abortToHangar}</span>
            </button>
          </div>
        </div>

        {/* Active Ascent Top-Center Stage Sequence Stepper */}
        {launchActive && (
          <div className="max-w-2xl mx-auto w-full pointer-events-auto">
            <div className="p-3 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-2xl backdrop-blur-md">
              <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>{t.ascentTitle} · {capsuleName}</span>
                </div>
                <div className="tabular-nums font-bold text-emerald-400">
                  {telemetry.altitudeKm.toFixed(1)} / {TARGET_ORBIT_ALTITUDE_KM} km
                </div>
              </div>

              <div className="relative w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-sky-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${telemetry.progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2 px-1">
                {PHASE_ORDER.map((stepId, i) => {
                  const isDoneOrActive = currentPhaseIdx >= i + 1;
                  return (
                    <span
                      key={stepId}
                      className={
                        telemetry.phase === stepId
                          ? 'text-amber-300 font-bold'
                          : isDoneOrActive
                          ? 'text-emerald-400 font-semibold'
                          : ''
                      }
                    >
                      {t.phases[stepId as keyof typeof t.phases]}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pre-Launch Left Floating Component Performance Profile */}
      {!launchActive && (
        <div className="my-auto max-w-md w-full pointer-events-auto rounded-2xl bg-slate-950/90 border border-blue-500/40 shadow-2xl backdrop-blur-md p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 font-bold">
                  {t.vabHeader}
                </div>
                <h2 className="text-base font-bold font-['Chakra_Petch'] text-white">
                  {t.padReadyTitle}
                </h2>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
              TWR {profile.initialTwr}x
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.assembledMass}</div>
              <div className="text-white font-bold text-sm tabular-nums mt-0.5">
                {profile.totalMassKg.toLocaleString()} kg
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {profile.hasRoverPayload ? t.includesRover : payloadName}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.maxThrust}</div>
              <div className="text-amber-300 font-bold text-sm tabular-nums mt-0.5">
                {(profile.effectiveMaxThrustN / 1000).toFixed(1)} kN
              </div>
              <div className="text-[10px] text-emerald-400 truncate mt-0.5">
                ISP {profile.ispSec} s · {profile.isHeavyEngine ? t.heavyEngine : t.mediumEngine}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.solarBus}</div>
              <div className="text-cyan-300 font-bold text-sm tabular-nums mt-0.5">
                {stats.netPowerW >= 0 ? `+${stats.netPowerW}` : stats.netPowerW} W
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                {t.batteryUnit} {profile.batteryCapacityWh} Wh ({profile.powerEfficiencyBonus >= 0 ? '+' : ''}
                {Math.round(profile.powerEfficiencyBonus * 100)}% {t.thrustUnit})
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.maxQProtection}</div>
              <div className="text-indigo-300 font-bold text-sm tabular-nums mt-0.5">
                {stats.shieldHealthPercent}% TPS
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                Cd {profile.dragCoeff.toFixed(2)} · {capsuleName}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-slate-400 bg-slate-900/70 border border-slate-800/80 rounded-xl p-2.5">
            {t.padHint}
          </div>

          <button
            onClick={() => {
              sounds.playThruster(1.6);
              sounds.playRadioBeep();
              onStartLaunch();
            }}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-bold font-['Chakra_Petch'] text-sm tracking-wider uppercase shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2.5 cursor-pointer transition-all active:scale-[0.99]"
          >
            <Flame className="w-5 h-5" />
            <span>{t.startLaunch}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Orbital Insertion Complete Banner or Live Ascent Bottom Telemetry Cluster */}
      {launchActive && (
        <div className="space-y-3 pointer-events-auto max-w-5xl mx-auto w-full">
          {telemetry.isComplete ? (
            <div className="p-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 shadow-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
                    {t.mecoTitle}
                  </div>
                  <div className="text-sm sm:text-base font-bold font-['Chakra_Petch'] text-white">
                    {t.escapeSummary(telemetry.velocityKmh.toLocaleString(), telemetry.fuelPercent)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  sounds.playClick();
                  sounds.playTelemetryPing();
                  onProceedToCruise();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold font-['Chakra_Petch'] text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/30 shrink-0 cursor-pointer"
              >
                <span>{t.proceedCruise}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800/90 text-[11px] font-mono text-slate-300 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {t.liveMass} <strong className="text-white tabular-nums">{telemetry.currentMassKg} kg</strong>
                </span>
                <span className="text-slate-600">|</span>
                <span>
                  {t.dynamicPressure}{' '}
                  <strong className="text-cyan-300 tabular-nums">{telemetry.dynamicPressureKPa} kPa</strong>
                </span>
              </div>
              {telemetry.altitudeKm > 15 && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onProceedToCruise();
                  }}
                  className="text-sky-400 hover:text-sky-300 underline cursor-pointer text-[11px]"
                >
                  {t.skipToCruise}
                </button>
              )}
            </div>
          )}

          {/* Futuristic 5-Card Real-Time Telemetry Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
            {/* 1. Altitude */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md font-mono">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5 text-sky-400" />
                <span>{t.altitude}</span>
              </div>
              <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                {telemetry.altitudeKm.toFixed(2)} <span className="text-xs text-slate-400">km</span>
              </div>
              <div className="text-[10px] text-sky-300 tabular-nums mt-0.5">
                {Math.round(telemetry.altitudeKm * 1000).toLocaleString()} m AGL
              </div>
            </div>

            {/* 2. Velocity */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md font-mono">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t.velocity}</span>
              </div>
              <div className="text-lg font-bold text-cyan-300 tabular-nums mt-0.5">
                {telemetry.velocityKmh.toLocaleString()} <span className="text-xs text-slate-400">km/h</span>
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                {telemetry.velocityMs.toLocaleString()} m/s · Mach {machNumber}
              </div>
            </div>

            {/* 3. Thrust & G-Force */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md font-mono">
              <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.activeThrust}</span>
              </div>
              <div className="text-lg font-bold text-amber-300 tabular-nums mt-0.5">
                {telemetry.thrustKN.toFixed(1)} <span className="text-xs text-slate-400">kN</span>
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums mt-0.5">
                {telemetry.accelerationG.toFixed(2)} G · TWR {telemetry.twr.toFixed(2)}
              </div>
            </div>

            {/* 4. Fuel / Propellant */}
            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md font-mono">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-orange-400" />
                  <span>{t.propellant}</span>
                </span>
                <span className="text-orange-300 font-bold tabular-nums">{telemetry.fuelPercent.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-2">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-150"
                  style={{ width: `${telemetry.fuelPercent}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 tabular-nums mt-1.5">
                {t.throttle} {telemetry.throttlePercent}% · ISP {profile.ispSec}s
              </div>
            </div>

            {/* 5. Energy & Battery */}
            <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/90 border border-slate-800 backdrop-blur-md font-mono">
              <div className="text-[10px] text-slate-400 uppercase flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Battery className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.busEnergy}</span>
                </span>
                <span className="text-emerald-300 font-bold tabular-nums">{telemetry.batteryPercent.toFixed(0)}%</span>
              </div>
              <div className="text-lg font-bold text-emerald-400 tabular-nums mt-0.5">
                {telemetry.netPowerW >= 0 ? `+${telemetry.netPowerW}` : telemetry.netPowerW}{' '}
                <span className="text-xs text-slate-400">W</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Gauge className="w-3 h-3 text-slate-500" />
                <span>{profile.batteryCapacityWh} Wh</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

