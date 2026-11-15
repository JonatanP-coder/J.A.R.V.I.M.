import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState, useCallback, useEffect } from 'react';
import {
  MissionProfile,
  MissionStats,
  SpacecraftComponent,
  DestinationChallengeResult,
} from '../types/mission';
import { getMissionScienceReport } from '../data/scienceData';
import {
  DestinationScene,
  MarsDriveInput,
  MarsTelemetry,
  MarsCollectibleSample,
  MoonTelemetry,
  L2Telemetry,
} from './DestinationScene';
import { ScienceDataReport } from './ScienceDataReport';
import { sounds } from '../utils/audio';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import {
  getLocalizedMission,
  getMarsSampleShortLabel,
  MARS_SAMPLE_COPY,
} from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';
import { announce, spatialTone } from '../services/accessibility';
import { useAcademy } from '../context/AcademyContext';
import {
  Activity,
  AlertTriangle,
  Award,
  Battery,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Crosshair,
  FileText,
  Flame,
  Radio,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Target,
  Thermometer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';

interface DestinationOperationsProps {
  mission: MissionProfile;
  finalStats: MissionStats;
  selectedComponents: Record<string, SpacecraftComponent>;
  onProceedToDebrief: () => void;
  onReturnHangar: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const DestinationOperations: React.FC<DestinationOperationsProps> = ({
  mission,
  finalStats,
  selectedComponents,
  onProceedToDebrief,
  onReturnHangar,
  isMuted,
  onToggleMute,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const { access, profile } = useAcademy();
  const t = UI_COPY[lang].dest;
  const titleT = UI_COPY[lang].title;
  const reportT = UI_COPY[lang].report;
  const localizedMission = getLocalizedMission(mission, lang);

  const [showReport, setShowReport] = useState<boolean>(false);
  const [showCompletionModal, setShowCompletionModal] = useState<boolean>(false);

  // -------------------------------------------------------------
  // 1. MARS STATE: WASD ROVER DRIVING, SAMPLES & DRILLING
  // -------------------------------------------------------------
  const [marsDriveInput, setMarsDriveInput] = useState<MarsDriveInput>({
    forward: false,
    backward: false,
    turnLeft: false,
    turnRight: false,
    holdExtract: false,
  });
  const [marsTelem, setMarsTelem] = useState<MarsTelemetry>({
    roverX: 0,
    roverY: 0,
    roverZ: 3.0,
    headingDeg: 0,
    speedKmh: 0,
    distanceToBeaconM: 22.8,
    targetReached: false,
    collisionWarning: null,
    drillingProgress: 0,
    collectedSampleIds: [],
    recentSampleName: null,
    nearSample: null,
    holdExtractProgress: 0,
    isHoldingExtract: false,
  });
  const [marsHullIntegrity, setMarsHullIntegrity] = useState<number>(100);
  const [marsBatteryWh, setMarsBatteryWh] = useState<number>(100);
  const [marsCompleted, setMarsCompleted] = useState<boolean>(false);
  const [collectedSamples, setCollectedSamples] = useState<MarsCollectibleSample[]>([]);
  const [lastSampleCollected, setLastSampleCollected] = useState<MarsCollectibleSample | null>(null);

  // -------------------------------------------------------------
  // 2. MOON STATE: ORBITAL MANEUVER NRHO INSERTION
  // -------------------------------------------------------------
  const [moonPitch, setMoonPitch] = useState<number>(-20);
  const [moonThrust, setMoonThrust] = useState<boolean>(false);
  const [moonPropellant, setMoonPropellant] = useState<number>(100);
  const [moonTelem, setMoonTelem] = useState<MoonTelemetry>({
    pitchAngleDeg: -20,
    isThrusting: false,
    periluneKm: 4200,
    apoluneKm: 88000,
    orbitLockPercent: 0,
    isLocked: false,
  });
  const [moonCompleted, setMoonCompleted] = useState<boolean>(false);

  // Drain propellant smoothly while AJ10 burn is held
  useEffect(() => {
    if (!moonThrust || moonCompleted) return;
    const timer = window.setInterval(() => {
      setMoonPropellant((p) => Math.max(15, +(p - 0.6).toFixed(1)));
    }, 150);
    return () => window.clearInterval(timer);
  }, [moonThrust, moonCompleted]);

  // -------------------------------------------------------------
  // 3. LAGRANGE L2 STATE: OPTICAL MIRROR & SUNSHIELD CALIBRATION
  // -------------------------------------------------------------
  const [l2SelectedSegment, setL2SelectedSegment] = useState<number | null>(2);
  const [l2CalibratedSegments, setL2CalibratedSegments] = useState<number[]>([]);
  const [l2SunshieldTensioned, setL2SunshieldTensioned] = useState<boolean>(false);
  const [l2Telem, setL2Telem] = useState<L2Telemetry>({
    selectedSegmentId: 2,
    calibratedSegments: [],
    misalignedSegments: [2, 6, 11, 15],
    sunshieldTensioned: false,
    wavefrontErrorNm: 440,
    strehlRatio: 0.22,
    isFullyCalibrated: false,
  });
  const [l2Completed, setL2Completed] = useState<boolean>(false);
  const [operationsPaused, setOperationsPaused] = useState(false);
  useEffect(() => { announce(profile?.knowledge === 'beginner' ? tx("Llegaste al destino. Sigue las instrucciones de la consola y revisa la telemetría. Puedes hacer una pausa cuando quieras.") : tx("Operaciones en destino activas. Revisa los objetivos y la telemetría de la consola.")); }, []);
  useEffect(() => { if (marsTelem.collisionWarning) announce(tx("Atención, obstáculo. ") + marsTelem.collisionWarning, 'warning'); }, [marsTelem.collisionWarning]);
  useEffect(() => { if (marsTelem.nearSample) announce(tx("Muestra cerca. Mantén E o activa la extracción en la consola.")); }, [marsTelem.nearSample?.id]);
  useEffect(() => {
    if (!access.narration || !access.radar || isMuted || mission.textureType !== 'mars' || operationsPaused) return;
    const timer = setInterval(() => spatialTone('capsule', Math.min(1, marsTelem.distanceToBeaconM / 25)), Math.max(350, marsTelem.distanceToBeaconM * 80));
    return () => clearInterval(timer);
  }, [access.narration, access.radar, isMuted, mission.textureType, operationsPaused, Math.round(marsTelem.distanceToBeaconM)]);

  // Challenge evaluation
  const getChallengeResult = (): DestinationChallengeResult => {
    const cr = t.challengeResults;
    if (mission.textureType === 'mars') {
      const achieved = marsCompleted || marsTelem.targetReached;
      return {
        achieved,
        score: achieved ? Math.max(85, Math.round(marsHullIntegrity)) : 40,
        title: achieved ? cr.marsWinTitle : cr.marsLoseTitle,
        notes: achieved ? cr.marsWinNotes(collectedSamples.length) : cr.marsLoseNotes,
        telemetrySummary: cr.marsSummary(
          marsTelem.distanceToBeaconM,
          collectedSamples.length,
          marsHullIntegrity
        ),
      };
    } else if (mission.textureType === 'moon') {
      const achieved = moonCompleted || moonTelem.orbitLockPercent >= 90;
      return {
        achieved,
        score: achieved ? Math.max(80, Math.round(moonPropellant)) : 45,
        title: achieved ? cr.moonWinTitle : cr.moonLoseTitle,
        notes: achieved ? cr.moonWinNotes : cr.moonLoseNotes,
        telemetrySummary: cr.moonSummary(
          moonTelem.periluneKm,
          moonTelem.apoluneKm,
          moonTelem.orbitLockPercent
        ),
      };
    } else {
      const achieved = l2Completed || l2Telem.isFullyCalibrated;
      return {
        achieved,
        score: achieved ? 100 : Math.round(l2Telem.strehlRatio * 100),
        title: achieved ? cr.l2WinTitle : cr.l2LoseTitle,
        notes: achieved ? cr.l2WinNotes : cr.l2LoseNotes,
        telemetrySummary: cr.l2Summary(
          l2Telem.wavefrontErrorNm,
          l2Telem.strehlRatio,
          l2CalibratedSegments.length
        ),
      };
    }
  };

  const operationsReport = (language: 'es' | 'en') => {
    if (mission.textureType === 'mars') return language === 'en'
      ? `Rover status: beacon distance ${marsTelem.distanceToBeaconM.toFixed(1)} meters. Heading ${marsTelem.headingDeg.toFixed(0)} degrees. Integrity ${marsHullIntegrity} percent. Samples collected ${collectedSamples.length} of 3. ${marsTelem.nearSample ? 'A sample is within reach.' : 'No samples within reach.'}`
      : `Estado del rover: distancia a la baliza ${marsTelem.distanceToBeaconM.toFixed(1)} metros. Rumbo ${marsTelem.headingDeg.toFixed(0)} grados. Integridad ${marsHullIntegrity} por ciento. Muestras recogidas ${collectedSamples.length} de 3. ${marsTelem.nearSample ? 'Hay una muestra al alcance.' : 'No hay muestras al alcance.'}`;
    if (mission.textureType === 'moon') return language === 'en'
      ? `Lunar insertion. Perilune ${Math.round(moonTelem.periluneKm)} kilometers, target 3000. Apolune ${Math.round(moonTelem.apoluneKm)} kilometers, target 70000. Capture ${moonTelem.orbitLockPercent} percent. Pitch ${moonPitch} degrees, target minus 20 degrees.`
      : `Inserción lunar. Perilunio ${Math.round(moonTelem.periluneKm)} kilómetros, objetivo 3000. Apolunio ${Math.round(moonTelem.apoluneKm)} kilómetros, objetivo 70000. Captura ${moonTelem.orbitLockPercent} por ciento. Cabeceo ${moonPitch} grados, objetivo menos 20 grados.`;
    return language === 'en'
      ? `Telescope: wavefront error ${Math.round(l2Telem.wavefrontErrorNm)} nanometers. Target below 35. Calibrated segments ${l2CalibratedSegments.length} of 4. Sunshield ${l2SunshieldTensioned ? 'tensioned' : 'pending'}.`
      : `Telescopio: error ${Math.round(l2Telem.wavefrontErrorNm)} nanómetros. Objetivo menos de 35. Segmentos calibrados ${l2CalibratedSegments.length} de 4. Parasol ${l2SunshieldTensioned ? 'tensado' : 'pendiente'}.`;
  };
  const challengeResult = getChallengeResult();
  const payload = selectedComponents.payload;
  const scienceReport = getMissionScienceReport(
    mission.id,
    payload?.id || 'payload-rover-autonomo',
    finalStats,
    challengeResult,
    lang
  );

  // Mars Collision Callback
  const handleMarsCollision = useCallback((_obstacleName: string) => {
    setMarsHullIntegrity((prev) => Math.max(15, prev - 10));
    setMarsBatteryWh((prev) => Math.max(15, prev - 2));
  }, []);

  // Mars Sample Collected Callback
  const handleMarsSampleCollected = useCallback((sample: MarsCollectibleSample) => {
    setCollectedSamples((prev) => {
      if (prev.some((s) => s.id === sample.id)) return prev;
      return [...prev, sample];
    });
    setLastSampleCollected(sample);
    setTimeout(() => {
      setLastSampleCollected((current) => (current?.id === sample.id ? null : current));
    }, 4500);
  }, []);

  // Mars Success: AUTOMATIC COMPLETION ON ARRIVAL AS REQUESTED
  const handleMarsSuccess = useCallback(() => {
    setMarsCompleted(true);
    setShowCompletionModal(true);
  }, []);

  // Moon Success Callback
  const handleMoonSuccess = useCallback(() => {
    setMoonThrust(false);
    setMoonCompleted(true);
    setShowCompletionModal(true);
  }, []);

  // L2 Success Callback
  const handleL2Success = useCallback(() => {
    setL2Completed(true);
    setShowCompletionModal(true);
    sounds.playVictory();
  }, []);

  // Calibrate an individual mirror segment
  const handleCalibrateSegment = (segmentId: number) => {
    if (l2CalibratedSegments.includes(segmentId)) return;
    sounds.playCalibrationLock();
    const updated = [...l2CalibratedSegments, segmentId];
    setL2CalibratedSegments(updated);
    if (updated.length >= 4 && l2SunshieldTensioned) {
      handleL2Success();
    }
  };

  // Toggle Sunshield Tension
  const handleToggleSunshield = () => {
    sounds.playClick();
    const next = !l2SunshieldTensioned;
    setL2SunshieldTensioned(next);
    if (next) {
      sounds.playTelemetryPing();
      if (l2CalibratedSegments.length >= 4) {
        handleL2Success();
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-white select-none">
      {/* 3D Destination WebGL Canvas with physical elevation matching */}
      <DestinationScene
        paused={operationsPaused}
        destinationType={mission.textureType}
        selectedComponents={selectedComponents}
        isMuted={isMuted}
        marsDriveInput={marsDriveInput}
        onMarsTelemetryUpdate={setMarsTelem}
        onMarsCollision={handleMarsCollision}
        onMarsSampleCollected={handleMarsSampleCollected}
        onMarsSuccess={handleMarsSuccess}
        moonPitch={moonPitch}
        moonThrust={moonThrust && !operationsPaused}
        onMoonTelemetryUpdate={setMoonTelem}
        onMoonSuccess={handleMoonSuccess}
        l2SelectedSegment={l2SelectedSegment}
        l2CalibratedSegments={l2CalibratedSegments}
        l2SunshieldTensioned={l2SunshieldTensioned}
        onL2SelectSegment={(id) => setL2SelectedSegment(id)}
        onL2TelemetryUpdate={setL2Telem}
        onL2Success={handleL2Success}
      />
      <div className="destination-access-tools">
        <button className="secondary-button" aria-pressed={operationsPaused} onClick={() => { setOperationsPaused(p => !p); setMoonThrust(false); setMarsDriveInput({ forward: false, backward: false, turnLeft: false, turnRight: false, holdExtract: false }); }}>{operationsPaused ? tx("▶ Continuar operaciones") : tx("Ⅱ Pausar operaciones")}</button>
        <button className="secondary-button" onClick={() => announce({ es: operationsReport('es'), en: operationsReport('en') }, 'info', true)}>{tx("⌁ Leer telemetría de operaciones")}</button>
      </div>

      {/* Top Telemetry & Control Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-5 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          {/* Brand & Return */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                sounds.playClick();
                onReturnHangar();
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-colors text-xs font-mono backdrop-blur-md cursor-pointer"
              title={t.hangarTitle}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.hangarBtn}</span>
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs font-mono backdrop-blur-md shadow-lg shadow-blue-950/40">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  challengeResult.achieved ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="font-bold">{t.phase2Banner}</span>
              <span className="text-slate-400">· {localizedMission.destination}</span>
            </div>
          </div>

          {/* Environmental Metrics */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.lightLatency}</span>
              <span className="text-amber-300 font-bold">{scienceReport.commsLatencyFormatted}</span>
            </div>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <div className="flex items-center gap-1.5 text-slate-300">
              <Thermometer className="w-3.5 h-3.5 text-rose-400" />
              <span>{t.tempLabel}</span>
              <span className="text-rose-300 font-bold truncate max-w-[165px]" title={scienceReport.environmentConditions.temperature}>
                {scienceReport.environmentConditions.temperature.match(/[+-]?\d+(?:\.\d+)?\s*°C/g)?.join(' / ') ||
                  scienceReport.environmentConditions.temperature.split('(')[0].trim()}
              </span>
            </div>

            <div className="w-px h-4 bg-slate-700 mx-1" />

            <div className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.statusLabel}</span>
              <span
                className={`font-bold ${challengeResult.achieved ? 'text-emerald-400' : 'text-amber-400'}`}
              >
                {challengeResult.achieved ? t.statusDone : t.statusActive}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playClick();
                setShowReport(true);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
                challengeResult.achieved
                  ? 'bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 shadow-emerald-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 border border-blue-400 shadow-blue-600/30'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>
                {challengeResult.achieved ? t.viewOptimalReport : t.viewReports}
              </span>
            </button>

            <button
              onClick={() => {
                sounds.playClick();
                onProceedToDebrief();
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>{t.diplomaBtn}</span>
            </button>

            <LanguageToggle compact />

            <button
              onClick={onToggleMute}
              className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? titleT.enableAudio : titleT.muteAudio}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Mars Sample Collection Live Banner Notification */}
        {lastSampleCollected && (() => {
          const localized = MARS_SAMPLE_COPY[lang][lastSampleCollected.id];
          const displayName = localized ? localized.name : lastSampleCollected.name;
          const displayMineral = localized ? localized.mineral : lastSampleCollected.mineral;
          return (
            <div className="self-center px-4 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400 text-emerald-200 text-xs font-mono flex items-center gap-2 shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" style={{ animationDuration: '3s' }} />
              <span className="font-bold">
                {t.sampleBannerPrefix} {displayName} ({displayMineral})
              </span>
            </div>
          );
        })()}
      </div>

      {/* ========================================================================= */}
      {/* MISSION-SPECIFIC INTERACTIVE CONSOLE (BOTTOM DOCK) */}
      {/* ========================================================================= */}

      {/* 1. MARS: 3D ROVER DRIVING CONSOLE */}
      {mission.textureType === 'mars' && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto max-w-md w-full p-4 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold uppercase text-white">
                {t.marsConsoleTitle}
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                marsCompleted
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              }`}
            >
              {marsCompleted ? t.marsDoneBadge : t.marsActiveBadge}
            </span>
          </div>

          {/* Telemetry Readouts */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.distToBeacon}</div>
              <div className="text-cyan-300 font-bold text-sm">
                {marsTelem.targetReached ? t.goalMeta : `${marsTelem.distanceToBeaconM} m`}
              </div>
              <div className="text-[9px] text-slate-400 pt-0.5">
                X:{marsTelem.roverX.toFixed(1)} Z:{marsTelem.roverZ.toFixed(1)}
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.speedLabel}</div>
              <div className="text-white font-bold text-sm">{marsTelem.speedKmh} km/h</div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.integrityLabel}</div>
              <div
                className={`font-bold text-sm ${
                  marsHullIntegrity < 40 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {marsHullIntegrity}%
              </div>
            </div>
          </div>

          {/* NASA Geological Samples Cache */}
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <span className="text-slate-400">{t.samplesHeader}</span>
              <span className="text-amber-400 font-bold">{collectedSamples.length}/3</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[10px] font-mono">
              <div
                className={`px-2 py-1 rounded border text-center ${
                  collectedSamples.some((s) => s.id === 'sample-hematita')
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
                title={MARS_SAMPLE_COPY[lang]['sample-hematita'].name}
              >
                {getMarsSampleShortLabel('sample-hematita', lang)}{' '}
                {collectedSamples.some((s) => s.id === 'sample-hematita') ? '✓' : '...'}
              </div>

              <div
                className={`px-2 py-1 rounded border text-center ${
                  collectedSamples.some((s) => s.id === 'sample-yeso')
                    ? 'bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
                title={MARS_SAMPLE_COPY[lang]['sample-yeso'].name}
              >
                {getMarsSampleShortLabel('sample-yeso', lang)}{' '}
                {collectedSamples.some((s) => s.id === 'sample-yeso') ? '✓' : '...'}
              </div>

              <div
                className={`px-2 py-1 rounded border text-center ${
                  collectedSamples.some((s) => s.id === 'sample-filosilicatos')
                    ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300 font-bold'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
                title={MARS_SAMPLE_COPY[lang]['sample-filosilicatos'].name}
              >
                {getMarsSampleShortLabel('sample-filosilicatos', lang)}{' '}
                {collectedSamples.some((s) => s.id === 'sample-filosilicatos') ? '✓' : '...'}
              </div>
            </div>
          </div>

          {/* Collision Alert Banner */}
          {marsTelem.collisionWarning && (
            <div className="p-2 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{t.collisionPrefix} {marsTelem.collisionWarning}</span>
            </div>
          )}

          {/* Driving Controls & Virtual D-Pad */}
          {!marsTelem.targetReached ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>{t.pilotControls}</span>
                <span className="text-cyan-400">{t.wasdHint}</span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMarsDriveInput(p => ({ ...p, turnLeft: true })); } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setMarsDriveInput(p => ({ ...p, turnLeft: false })); }}
                  onBlur={() => setMarsDriveInput(p => ({ ...p, turnLeft: false }))}
                  onMouseDown={() => setMarsDriveInput((p) => ({ ...p, turnLeft: true }))}
                  onMouseUp={() => setMarsDriveInput((p) => ({ ...p, turnLeft: false }))}
                  onMouseLeave={() => setMarsDriveInput((p) => ({ ...p, turnLeft: false }))}
                  onTouchStart={() => setMarsDriveInput((p) => ({ ...p, turnLeft: true }))}
                  onTouchEnd={() => setMarsDriveInput((p) => ({ ...p, turnLeft: false }))}
                  onTouchCancel={() => setMarsDriveInput((p) => ({ ...p, turnLeft: false }))}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 cursor-pointer"
                  title={t.strafeLeftTitle}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex flex-col gap-2">
                  <button
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMarsDriveInput(p => ({ ...p, forward: true })); } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setMarsDriveInput(p => ({ ...p, forward: false })); }}
                  onBlur={() => setMarsDriveInput(p => ({ ...p, forward: false }))}
                  onMouseDown={() => setMarsDriveInput((p) => ({ ...p, forward: true }))}
                    onMouseUp={() => setMarsDriveInput((p) => ({ ...p, forward: false }))}
                    onMouseLeave={() => setMarsDriveInput((p) => ({ ...p, forward: false }))}
                    onTouchStart={() => setMarsDriveInput((p) => ({ ...p, forward: true }))}
                    onTouchEnd={() => setMarsDriveInput((p) => ({ ...p, forward: false }))}
                    onTouchCancel={() => setMarsDriveInput((p) => ({ ...p, forward: false }))}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 cursor-pointer"
                    title={t.forwardTitle}
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>

                  <button
                    onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMarsDriveInput(p => ({ ...p, backward: true })); } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setMarsDriveInput(p => ({ ...p, backward: false })); }}
                  onBlur={() => setMarsDriveInput(p => ({ ...p, backward: false }))}
                  onMouseDown={() => setMarsDriveInput((p) => ({ ...p, backward: true }))}
                    onMouseUp={() => setMarsDriveInput((p) => ({ ...p, backward: false }))}
                    onMouseLeave={() => setMarsDriveInput((p) => ({ ...p, backward: false }))}
                    onTouchStart={() => setMarsDriveInput((p) => ({ ...p, backward: true }))}
                    onTouchEnd={() => setMarsDriveInput((p) => ({ ...p, backward: false }))}
                    onTouchCancel={() => setMarsDriveInput((p) => ({ ...p, backward: false }))}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 cursor-pointer"
                    title={t.backwardTitle}
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>

                <button
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMarsDriveInput(p => ({ ...p, turnRight: true })); } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setMarsDriveInput(p => ({ ...p, turnRight: false })); }}
                  onBlur={() => setMarsDriveInput(p => ({ ...p, turnRight: false }))}
                  onMouseDown={() => setMarsDriveInput((p) => ({ ...p, turnRight: true }))}
                  onMouseUp={() => setMarsDriveInput((p) => ({ ...p, turnRight: false }))}
                  onMouseLeave={() => setMarsDriveInput((p) => ({ ...p, turnRight: false }))}
                  onTouchStart={() => setMarsDriveInput((p) => ({ ...p, turnRight: true }))}
                  onTouchEnd={() => setMarsDriveInput((p) => ({ ...p, turnRight: false }))}
                  onTouchCancel={() => setMarsDriveInput((p) => ({ ...p, turnRight: false }))}
                  className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 active:scale-95 text-slate-200 cursor-pointer"
                  title={t.strafeRightTitle}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile/Touch Extract [E] Button */}
              <div className="pt-1.5">
                <button
                  onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setMarsDriveInput(p => ({ ...p, holdExtract: true })); } }}
                  onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') setMarsDriveInput(p => ({ ...p, holdExtract: false })); }}
                  onBlur={() => setMarsDriveInput(p => ({ ...p, holdExtract: false }))}
                  onMouseDown={() => setMarsDriveInput((p) => ({ ...p, holdExtract: true }))}
                  onMouseUp={() => setMarsDriveInput((p) => ({ ...p, holdExtract: false }))}
                  onMouseLeave={() => setMarsDriveInput((p) => ({ ...p, holdExtract: false }))}
                  onTouchStart={() => setMarsDriveInput((p) => ({ ...p, holdExtract: true }))}
                  onTouchEnd={() => setMarsDriveInput((p) => ({ ...p, holdExtract: false }))}
                  onTouchCancel={() => setMarsDriveInput((p) => ({ ...p, holdExtract: false }))}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    marsDriveInput.holdExtract
                      ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30'
                      : marsTelem.nearSample
                      ? 'bg-amber-950/70 border-amber-500/70 text-amber-300 hover:bg-amber-900/60 animate-pulse'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={t.holdExtractTitle}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      marsDriveInput.holdExtract ? 'bg-white animate-ping' : 'bg-cyan-400'
                    }`}
                  />
                  <span>{t.holdExtractBtn}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs font-mono text-center space-y-1">
              <div className="text-emerald-300 font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.targetReachedTitle}</span>
              </div>
              <p className="text-[11px] text-slate-300">
                {t.targetReachedDesc}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating Center-Bottom UI Overlay for Hold 'E' Sample Extraction */}
      {mission.textureType === 'mars' && !marsCompleted && marsTelem.nearSample && (() => {
        const nearLocalized = MARS_SAMPLE_COPY[lang][marsTelem.nearSample.id];
        const nearName = nearLocalized ? nearLocalized.name : marsTelem.nearSample.name;
        const nearMineral = nearLocalized ? nearLocalized.mineral : marsTelem.nearSample.mineral;
        return (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-auto transition-all duration-300 w-max max-w-sm">
            {marsTelem.isHoldingExtract ? (
              // Active Extraction Progress Card (Visible ONLY when holding 'E')
              <div className="flex flex-col items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-slate-950/95 border border-cyan-500/60 shadow-2xl shadow-cyan-950/80 backdrop-blur-md min-w-[300px] max-w-sm animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                    </span>
                    <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300">
                      {t.drillingActive}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white tabular-nums">
                    {marsTelem.holdExtractProgress ?? 0}%
                  </span>
                </div>

                <div className="w-full text-left">
                  <div className="text-xs font-medium text-slate-100 truncate">
                    {nearName}
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 truncate">
                    {nearMineral} · {marsTelem.nearSample.nasaMission}
                  </div>
                </div>

                {/* Progress Bar Container */}
                <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-cyan-400 to-emerald-400 rounded-full transition-all duration-75 shadow-lg shadow-cyan-500/40"
                    style={{ width: `${marsTelem.holdExtractProgress ?? 0}%` }}
                  />
                </div>

                <div className="text-[9px] font-mono text-slate-400 text-center tracking-tight">
                  {t.holdUntil100}
                </div>
              </div>
            ) : (
              // Proximity Prompt (When in range but not holding 'E')
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/95 border border-amber-500/60 shadow-xl backdrop-blur-md animate-bounce max-w-sm">
                <div className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/60 text-amber-300 font-mono font-bold text-xs shrink-0">
                  E
                </div>
                <div className="text-xs font-mono text-slate-200 truncate">
                  <span className="text-amber-400 font-bold">{t.holdPromptPrefix}</span>{' '}
                  <span className="text-white font-medium">{nearName}</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 2. MOON: ORBITAL MANEUVER NRHO INSERTION CONSOLE */}
      {mission.textureType === 'moon' && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto max-w-md w-full p-4 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold uppercase text-white">
                {t.moonConsoleTitle}
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                moonTelem.orbitLockPercent >= 90
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300'
              }`}
            >
              {moonTelem.orbitLockPercent >= 90 ? t.moonLockedBadge : t.moonActiveBadge}
            </span>
          </div>

          {/* Real-Time Orbital Gauges */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.periluneLabel}</div>
              <div
                className={`font-bold text-sm ${
                  Math.abs(moonTelem.periluneKm - 3000) < 300 ? 'text-emerald-400' : 'text-cyan-300'
                }`}
              >
                {moonTelem.periluneKm} km
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.apoluneLabel}</div>
              <div
                className={`font-bold text-sm ${
                  Math.abs(moonTelem.apoluneKm - 70000) < 4000 ? 'text-emerald-400' : 'text-cyan-300'
                }`}
              >
                {Math.round(moonTelem.apoluneKm / 1000)}k km
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.captureLabel}</div>
              <div className="text-emerald-400 font-bold text-sm">{moonTelem.orbitLockPercent}%</div>
            </div>
          </div>

          {/* Pitch Angle Slider Control */}
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">{t.pitchLabel}</span>
              <span
                className={`font-bold ${
                  moonPitch >= -26 && moonPitch <= -14 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {moonPitch}° ({t.pitchTarget})
              </span>
            </div>
            <input
              type="range"
              aria-label={tx("Cabeceo de retropropulsión, en grados")}
              min="-45"
              max="45"
              value={moonPitch}
              onChange={(e) => setMoonPitch(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>

          {/* Burn Action Button */}
          <button className="secondary-button" aria-pressed={moonThrust} disabled={operationsPaused} onClick={() => setMoonThrust(p => !p)}>{moonThrust ? tx("■ Detener impulso continuo") : tx("▶ Activar impulso sin mantener pulsado")}</button>
          <button
            onMouseDown={() => {
              setMoonThrust(true);
            }}
            onMouseUp={() => setMoonThrust(false)}
            onMouseLeave={() => setMoonThrust(false)}
            onTouchStart={() => {
              setMoonThrust(true);
            }}
            onTouchEnd={() => setMoonThrust(false)}
            onTouchCancel={() => setMoonThrust(false)}
            className={`w-full py-3 px-4 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
              moonThrust
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white scale-98 shadow-orange-600/30'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-cyan-600/20'
            }`}
          >
            <Flame className={`w-4 h-4 ${moonThrust ? 'animate-bounce text-yellow-300' : ''}`} />
            <span>{moonThrust ? t.burnActive : t.burnHold}</span>
          </button>
        </div>
      )}

      {/* 3. LAGRANGE L2: OPTICAL MIRROR & SUNSHIELD CALIBRATION CONSOLE */}
      {mission.textureType === 'deep_space' && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto max-w-md w-full p-4 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl backdrop-blur-md space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold uppercase text-white">
                {t.l2ConsoleTitle}
              </span>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                l2Telem.isFullyCalibrated
                  ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                  : 'bg-amber-950/80 border-amber-500/40 text-amber-300'
              }`}
            >
              {l2Telem.isFullyCalibrated ? t.l2OptimalBadge : t.l2MisalignedBadge}
            </span>
          </div>

          {/* Optical Metrics */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.wavefrontLabel}</div>
              <div
                className={`font-bold text-sm ${
                  l2Telem.wavefrontErrorNm < 40 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {l2Telem.wavefrontErrorNm} nm ({t.wavefrontTarget})
              </div>
            </div>

            <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-[10px] text-slate-400">{t.strehlLabel}</div>
              <div
                className={`font-bold text-sm ${
                  l2Telem.strehlRatio > 0.85 ? 'text-emerald-400' : 'text-cyan-300'
                }`}
              >
                {l2Telem.strehlRatio} / 1.0
              </div>
            </div>
          </div>

          {/* Segment Selector Matrix */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between">
              <span>{t.aberrationHeader}</span>
              <span className="text-amber-400">
                {t.calibratedCount(l2CalibratedSegments.length)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[2, 6, 11, 15].map((segId) => {
                const isCalibrated = l2CalibratedSegments.includes(segId);
                const isSelected = l2SelectedSegment === segId;
                return (
                  <button
                    key={segId}
                    onClick={() => {
                      sounds.playClick();
                      setL2SelectedSegment(segId);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isCalibrated
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                        : isSelected
                          ? 'bg-amber-600 border-amber-400 text-white shadow-md'
                          : 'bg-slate-900 border-amber-500/30 text-amber-300 hover:border-amber-400'
                    }`}
                  >
                    Seg #{segId + 1} {isCalibrated ? '✓' : '!'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions: Calibrate Selected + Tension Sunshield */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => {
                if (l2SelectedSegment !== null) handleCalibrateSegment(l2SelectedSegment);
              }}
              disabled={l2SelectedSegment === null || l2CalibratedSegments.includes(l2SelectedSegment)}
              className={`w-full py-2.5 px-3 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 border transition-all ${
                l2SelectedSegment !== null && !l2CalibratedSegments.includes(l2SelectedSegment)
                  ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-600/30 cursor-pointer'
                  : 'bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>
                {l2SelectedSegment !== null && l2CalibratedSegments.includes(l2SelectedSegment)
                  ? t.segCalibrated(l2SelectedSegment + 1)
                  : t.segCalibrateCta((l2SelectedSegment ?? 0) + 1)}
              </span>
            </button>

            <button
              onClick={handleToggleSunshield}
              className={`w-full py-2 px-3 rounded-xl font-mono text-xs font-bold uppercase flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                l2SunshieldTensioned
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>
                {l2SunshieldTensioned ? t.sunshieldDone : t.sunshieldCta}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AUTOMATIC TRAINING COMPLETION MODAL */}
      {/* Displays immediately upon arriving at the target waypoint or completing */}
      {/* the destination challenge without needing manual button pressing */}
      {/* ========================================================================= */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-2xl p-6 space-y-5 text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                    {t.completionRibbon}
                  </div>
                  <h2 className="text-xl font-bold font-['Chakra_Petch'] text-white">
                    {t.completionTitle}
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                title={reportT.closeTitle}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-slate-200 leading-relaxed">
                {mission.textureType === 'mars' && t.completionMars}
                {mission.textureType === 'moon' && t.completionMoon}
                {mission.textureType === 'deep_space' && t.completionL2}
              </p>

              {/* Achievements Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{t.scienceScoreLabel}</div>
                  <div className="text-emerald-400 font-bold text-base mt-0.5">
                    {challengeResult.score}% {t.certifiedSuffix}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    {mission.textureType === 'mars' ? t.marsSamplesLabel : t.osdrDataLabel}
                  </div>
                  <div className="text-cyan-300 font-bold text-base mt-0.5">
                    {mission.textureType === 'mars'
                      ? t.samplesCollectedSummary(collectedSamples.length)
                      : t.telemetryNominal100}
                  </div>
                </div>
              </div>

              {mission.textureType === 'mars' && collectedSamples.length > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1">
                  <div className="text-[10px] font-bold text-emerald-300">
                    {t.samplesIncludedHeader}
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-0.5 pl-3 list-disc">
                    {collectedSamples.map((s) => {
                      const loc = MARS_SAMPLE_COPY[lang][s.id];
                      return (
                        <li key={s.id}>
                          <span className="text-white font-semibold">{loc ? loc.name : s.name}</span> (
                          {loc ? loc.mineral : s.mineral}) · {s.nasaMission}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                onClick={() => {
                  sounds.playClick();
                  setShowCompletionModal(false);
                  setShowReport(true);
                }}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-colors cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{t.viewOsdrReportBtn}</span>
              </button>

              <button
                onClick={() => {
                  sounds.playClick();
                  onProceedToDebrief();
                }}
                className="w-full sm:w-1/2 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-colors cursor-pointer"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>{t.graduationDiplomaBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Science Report Modal */}
      {showReport && (
        <ScienceDataReport
          report={scienceReport}
          onClose={() => setShowReport(false)}
          onProceedToDebrief={onProceedToDebrief}
          onReturnHangar={onReturnHangar}
        />
      )}
    </div>
  );
};
