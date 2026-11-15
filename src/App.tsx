import { useIntegratedText } from './i18n/useIntegratedText';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { GameState, FlightReadinessReviewResult, MissionProfile, MissionStats, SpacecraftComponent } from './types/mission';
import { MISSIONS, COMPONENTS, PRESET_CONFIGS } from './data/components';
import { SpacecraftScene } from './components/SpacecraftScene';
import { TitleScreen } from './components/TitleScreen';
import { HangarHUD } from './components/HangarHUD';
import { ControlDock } from './components/ControlDock';
import { ReviewModal } from './components/ReviewModal';
import { FlightSimulation } from './components/FlightSimulation';
import { DebriefModal } from './components/DebriefModal';
import { DestinationOperations } from './components/DestinationOperations';
import { LaunchSequenceHUD } from './components/LaunchSequenceHUD';
import { requestFlightReadinessReview } from './services/missionApi';
import {
  computeVehicleLaunchProfile,
  createInitialLaunchTelemetry,
  LaunchTelemetry,
} from './utils/launchPhysics';
import { sounds } from './utils/audio';
import { useI18n } from './i18n/I18nContext';
import { UI_COPY } from './i18n/uiCopy';
import { useAcademy } from './context/AcademyContext';
import { MissionTools } from './components/MissionTools';
import { LearnerProfileSelector } from './components/LearnerProfileSelector';
import { computeStats } from './utils/engineering';
import { readStored, writeStored, STORAGE_KEY } from './services/storage';
import { announce, spatialTone } from './services/accessibility';
import { getLocalizedComponent } from './i18n/translations';

export default function App() {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const { profile, access, progress, recordReview, recordMission } = useAcademy();
  const [choosingProfile, setChoosingProfile] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() =>
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1'
      ? 'HANGAR'
      : 'TITLE'
  );
  const [currentMission, setCurrentMission] = useState<MissionProfile>(() => MISSIONS.find(m => m.id === readStored(STORAGE_KEY + ':mission', '')) || MISSIONS[0]);
  const [isExploded, setIsExploded] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [cameraShake, setCameraShake] = useState<boolean>(false);
  const [completedMissions, setCompletedMissions] = useState<Record<string, boolean>>(progress.completedMissions);
  useEffect(() => { setCompletedMissions(progress.completedMissions); }, [progress.completedMissions]);

  // Selected components
  const [selectedComponents, setSelectedComponents] = useState<Record<string, SpacecraftComponent>>(() => {
    const saved = readStored<Record<string, string>>(STORAGE_KEY + ':craft', {});
    const initial: Record<string, SpacecraftComponent> = {
    capsule: COMPONENTS.find((c) => c.id === 'capsula-orion-jr')!,
    solar: COMPONENTS.find((c) => c.id === 'paneles-rosa-desplegables')!,
    oxygen: COMPONENTS.find((c) => c.id === 'oxigeno-criogenico-doble')!,
    shield: COMPONENTS.find((c) => c.id === 'escudo-pica-x')!,
    engine: COMPONENTS.find((c) => c.id === 'motor-pesado-raptor')!,
    payload: COMPONENTS.find((c) => c.id === 'payload-radar-atmosferico')!,
    };
    for (const [category, id] of Object.entries(saved || {})) { const item = COMPONENTS.find(c => c.id === id && c.category === category); if (item) initial[category] = item; }
    return initial;
  });
  useEffect(() => { writeStored(STORAGE_KEY + ':craft', Object.fromEntries(Object.entries(selectedComponents).map(([key, c]) => [key, c.id]))); writeStored(STORAGE_KEY + ':mission', currentMission.id); }, [selectedComponents, currentMission]);

  // One shared engine for all learning profiles, browser and server.
  const stats = useMemo(() => computeStats(selectedComponents), [selectedComponents]);

  // Launch sequence state (linked dynamically to Hangar components)
  const launchProfile = useMemo(
    () => computeVehicleLaunchProfile(selectedComponents, stats),
    [selectedComponents, stats]
  );
  const [launchActive, setLaunchActive] = useState<boolean>(false);
  const [launchTelemetry, setLaunchTelemetry] = useState<LaunchTelemetry>(() =>
    createInitialLaunchTelemetry(
      computeVehicleLaunchProfile(selectedComponents, stats),
      stats
    )
  );
  const [lastLaunchResult, setLastLaunchResult] = useState<LaunchTelemetry | null>(null);

  // Review result state
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [reviewResult, setReviewResult] = useState<FlightReadinessReviewResult | null>(null);
  useEffect(() => {
    if (gameState !== 'REVIEW') return;
    let current = true;
    void requestFlightReadinessReview(selectedComponents, stats, currentMission, lang, profile || undefined)
      .then(result => { if (current) setReviewResult(result); });
    return () => { current = false; };
  }, [lang, profile, gameState, selectedComponents, stats, currentMission]);

  // Debrief state
  const [debriefInfo, setDebriefInfo] = useState<{
    isSuccess: boolean;
    finalStats: MissionStats;
    failReason?: string;
  } | null>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'SELECT' || targetTag === 'TEXTAREA' || targetTag === 'BUTTON' || document.querySelector('dialog[open]')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (gameState === 'TITLE' && (e.key === 'Enter' || e.key === ' ')) {
        sounds.playClick();
        enterHangar();
      } else if (gameState === 'HANGAR') {
        if (e.key === 'e' || e.key === 'E') {
          sounds.playClick();
          setIsExploded((prev) => !prev);
        } else if (e.key === 'm' || e.key === 'M') {
          handleToggleMute();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, profile]);

  const enterHangar = () => { if (!profile) setChoosingProfile(true); else setGameState('HANGAR'); };

  const handleToggleMute = () => {
    const muted = sounds.toggleMute();
    setIsMuted(muted);
  };

  const handleSelectComponent = (comp: SpacecraftComponent) => {
    setSelectedComponents((prev) => ({
      ...prev,
      [comp.category]: comp,
    }));
    spatialTone(comp.category);
    announce({
      es: `Pieza instalada: ${comp.name}. Masa ${comp.weightKg} kilogramos. ${comp.powerW < 0 ? 'Genera' : 'Consume'} ${Math.abs(comp.powerW)} vatios.`,
      en: `Component installed: ${getLocalizedComponent(comp, 'en').name}. Mass ${comp.weightKg} kilograms. ${comp.powerW < 0 ? 'Generates' : 'Consumes'} ${Math.abs(comp.powerW)} watts.`,
    }, 'success');
  };

  const handleApplyPreset = (idx: number) => {
    const preset = PRESET_CONFIGS[idx];
    if (!preset) return;

    const newSelection: Record<string, SpacecraftComponent> = {};
    Object.entries(preset.components).forEach(([cat, id]) => {
      const match = COMPONENTS.find((c) => c.id === id);
      if (match) newSelection[cat] = match;
    });

    setSelectedComponents((prev) => ({
      ...prev,
      ...newSelection,
    }));
  };

  // Request Flight Readiness Review (Task 1)
  const handleRequestReview = async () => {
    setIsEvaluating(true);
    try {
      const result = await requestFlightReadinessReview(selectedComponents, stats, currentMission, lang, profile || undefined);
      setReviewResult(result);
      setGameState('REVIEW');
      void recordReview(currentMission.id, selectedComponents, result.puntuacion_diseno, result.aprobado).catch(() => announce(tx("Evaluación calculada. No se pudo sincronizar el XP; solicita otra revisión con conexión."), 'warning'));
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Enter 3D Launchpad LC-39A sequence
  const handleLaunch = () => {
    setLaunchActive(false);
    setLaunchTelemetry(createInitialLaunchTelemetry(launchProfile, stats));
    setLastLaunchResult(null);
    setGameState('LAUNCH');
  };

  // Validate FRR first; if approved enter 3D Launchpad directly, otherwise open FRR rejection modal
  const handleDirectLaunch = async () => {
    setIsEvaluating(true);
    try {
      const result = await requestFlightReadinessReview(selectedComponents, stats, currentMission, lang, profile || undefined);
      setReviewResult(result);
      void recordReview(currentMission.id, selectedComponents, result.puntuacion_diseno, result.aprobado).catch(() => announce(tx("No se pudo sincronizar la evaluación con el servidor."), 'warning'));
      if (result.aprobado) {
        sounds.playApproval();
        handleLaunch();
      } else {
        setGameState('REVIEW');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Mission Success -> Transition into Phase 2 Destination Operations (Unlocked after passing Phase 1)
  const handleMissionSuccess = (finalStats: MissionStats) => {
    recordMission(currentMission.id, reviewResult?.puntuacion_diseno || 90);
    announce(tx("Tránsito completado. Operaciones en destino desbloqueadas y expediente actualizado."), 'success');
    setCompletedMissions((prev) => ({
      ...prev,
      [currentMission.id]: true,
    }));
    setDebriefInfo({
      isSuccess: true,
      finalStats,
    });
    setGameState('DESTINATION');
  };

  // Mission Fail / Abort
  const handleMissionFailed = (reason: string, finalFlightStats?: MissionStats) => {
    setDebriefInfo({
      isSuccess: false,
      finalStats: finalFlightStats || stats,
      failReason: reason,
    });
    setGameState('DEBRIEF');
  };

  const handleAbortToHangar = () => {
    setLaunchActive(false);
    setGameState('HANGAR');
  };

  return (
    <div className="app-stage relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-white">
      <a href="#hangar-components" className="skip-link">{tx("Saltar a los componentes del hangar")}</a>
      {/* 3D WebGL Canvas Layer for Hangar, Title, Launch & Flight (Hidden during Phase 2 Destination Scene) */}
      {gameState !== 'DESTINATION' && (
        <SpacecraftScene
          selectedComponents={
            selectedComponents as {
              capsule: SpacecraftComponent;
              solar: SpacecraftComponent;
              oxygen: SpacecraftComponent;
              shield: SpacecraftComponent;
              engine: SpacecraftComponent;
              payload: SpacecraftComponent;
            }
          }
          stats={stats}
          isExploded={gameState === 'HANGAR' && isExploded}
          mode={
            gameState === 'TITLE'
              ? 'title'
              : gameState === 'LAUNCH'
              ? 'launch'
              : gameState === 'FLIGHT'
              ? 'flight'
              : 'hangar'
          }
          launchActive={gameState === 'LAUNCH' && launchActive}
          destinationType={currentMission.textureType}
          cameraShake={cameraShake && !access.reducedMotion}
          reducedMotion={access.reducedMotion}
          canvasTitle={UI_COPY[lang].app.dragToRotate}
          onLaunchTelemetry={(telemetry) => setLaunchTelemetry(telemetry)}
          onLaunchComplete={(finalTelemetry) => {
            setLastLaunchResult(finalTelemetry);
            setLaunchTelemetry(finalTelemetry);
            sounds.playApproval();
          }}
        />
      )}

      {/* Screen 1: Title Screen */}
      {gameState === 'TITLE' && (
        <TitleScreen
          onStart={enterHangar}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 2: Hangar / VAB Assembly */}
      {(gameState === 'HANGAR' || gameState === 'REVIEW') && (
        <>
          <HangarHUD
            currentMission={currentMission}
            onSelectMission={(m) => setCurrentMission(m)}
            stats={stats}
            selectedComponents={selectedComponents}
            onApplyPreset={handleApplyPreset}
            onRequestReview={handleRequestReview}
            onDirectLaunch={handleDirectLaunch}
            isEvaluating={isEvaluating}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onReturnTitle={() => setGameState('TITLE')}
            isPhase1Completed={!!completedMissions[currentMission.id]}
            onOpenDestination={() => {
              if (completedMissions[currentMission.id]) {
                setGameState('DESTINATION');
              }
            }}
          />

          <ControlDock
            selectedComponents={selectedComponents}
            onSelectComponent={handleSelectComponent}
            isExploded={isExploded}
            onToggleExploded={() => setIsExploded((prev) => !prev)}
          />
        </>
      )}

      {/* Screen 3: Flight Readiness Review Modal (Task 1) */}
      {gameState === 'REVIEW' && reviewResult && (
        <ReviewModal
          review={reviewResult}
          mission={currentMission}
          stats={stats}
          onLaunch={handleLaunch}
          onClose={() => setGameState('HANGAR')}
        />
      )}

      {/* Screen 3.5: 3D Launch Sequence & Component-Linked Live Telemetry */}
      {gameState === 'LAUNCH' && (
        <LaunchSequenceHUD
          mission={currentMission}
          stats={stats}
          selectedComponents={selectedComponents}
          profile={launchProfile}
          telemetry={launchTelemetry}
          launchActive={launchActive}
          onStartLaunch={() => setLaunchActive(true)}
          onProceedToCruise={() => {
            setLastLaunchResult(launchTelemetry);
            setLaunchActive(false);
            setGameState('FLIGHT');
          }}
          onAbortToHangar={handleAbortToHangar}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 4: In-Flight Simulation & Route Events (Task 2) */}
      {gameState === 'FLIGHT' && (
        <FlightSimulation
          mission={currentMission}
          initialStats={stats}
          selectedComponents={selectedComponents}
          launchResult={lastLaunchResult}
          onMissionSuccess={handleMissionSuccess}
          onMissionFailed={handleMissionFailed}
          onAbort={handleAbortToHangar}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onCameraShakeChange={(shake) => setCameraShake(shake)}
        />
      )}

      {/* Screen 5: Phase 2 Destination Operations & 3D Scientific Outputs */}
      {gameState === 'DESTINATION' && (
        <DestinationOperations
          mission={currentMission}
          finalStats={debriefInfo?.finalStats || stats}
          selectedComponents={selectedComponents}
          onProceedToDebrief={() => {
            if (!debriefInfo) {
              setDebriefInfo({
                isSuccess: true,
                finalStats: stats,
              });
            }
            setGameState('DEBRIEF');
          }}
          onReturnHangar={() => setGameState('HANGAR')}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* Screen 6: Debrief & Wings Graduation */}
      {gameState === 'DEBRIEF' && (
        <DebriefModal
          mission={currentMission}
          finalStats={debriefInfo?.finalStats || stats}
          isSuccess={debriefInfo?.isSuccess ?? true}
          failReason={debriefInfo?.failReason}
          onRestart={() => setGameState('HANGAR')}
          onOpenDestination={() => setGameState('DESTINATION')}
        />
      )}
      <MissionTools components={selectedComponents} stats={stats} mission={currentMission} isMuted={isMuted} gameState={gameState} onSelectComponent={handleSelectComponent} />
      {(choosingProfile || (!profile && gameState !== 'TITLE')) && <LearnerProfileSelector mandatory onClose={() => { setChoosingProfile(false); setGameState('HANGAR'); }} />}
    </div>
  );
}
