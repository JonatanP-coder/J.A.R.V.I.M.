import { SourceLinks } from './SourceLinks';
import { ContextualText } from './ContextualText';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MissionEvent, MissionEventOption, MissionProfile, MissionStats, SpacecraftComponent } from '../types/mission';
import { requestMissionEvent } from '../services/missionApi';
import { computeVehicleLaunchProfile, LaunchTelemetry } from '../utils/launchPhysics';
import { sounds } from '../utils/audio';
import { AlertTriangle, Battery, Shield, Sparkles, Compass, CheckCircle2, ArrowRight, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedMission } from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';
import { useAcademy } from '../context/AcademyContext';
import { announce, optionCommand, spatialTone, startVoiceCommand } from '../services/accessibility';
import { getFlightEvent } from '../academy/pedagogy';

interface FlightSimulationProps {
  mission: MissionProfile;
  initialStats: MissionStats;
  selectedComponents: Record<string, SpacecraftComponent>;
  launchResult?: LaunchTelemetry | null;
  onMissionSuccess: (finalStats: MissionStats) => void;
  onMissionFailed: (reason: string, finalFlightStats?: MissionStats) => void;
  onAbort: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onCameraShakeChange: (shake: boolean) => void;
}

export const FlightSimulation: React.FC<FlightSimulationProps> = ({
  mission,
  initialStats,
  selectedComponents,
  launchResult,
  onMissionSuccess,
  onMissionFailed,
  onAbort,
  isMuted,
  onToggleMute,
  onCameraShakeChange,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const { profile, access } = useAcademy();
  const eventDialog = useRef<HTMLDialogElement>(null);
  const resultDialog = useRef<HTMLDialogElement>(null);
  const phaseDialog = useRef<HTMLDialogElement>(null);
  const stopEventVoice = useRef<(() => void) | null>(null);
  const lastRadarPing = useRef(0);
  useEffect(() => () => stopEventVoice.current?.(), []);
  const t = UI_COPY[lang].flight;
  const appT = UI_COPY[lang].app;
  const titleT = UI_COPY[lang].title;
  const locMission = getLocalizedMission(mission, lang);

  const launchProfile = useMemo(
    () => computeVehicleLaunchProfile(selectedComponents, initialStats),
    [selectedComponents, initialStats]
  );

  // Flight telemetry state (seeded by orbital insertion telemetry from Launch Sequence)
  const [progress, setProgress] = useState<number>(5);
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState<number>(() =>
    launchResult?.velocityKmh ? Math.max(27800, launchResult.velocityKmh) : 27800
  );
  const [stats, setStats] = useState<MissionStats>(initialStats);

  // Active in-flight event state
  const [activeEvent, setActiveEvent] = useState<MissionEvent | null>(null);
  const [selectedOptionResult, setSelectedOptionResult] = useState<{
    option: MissionEventOption;
    nasaCuriosity: string;
    index: number;
  } | null>(null);
  const [eventTriggeredCount, setEventTriggeredCount] = useState<number>(0);
  // Keep the event index and simulation state; only derive its educational text again.
  const localizedEvent = activeEvent ? getFlightEvent(eventTriggeredCount - 1, lang, profile || undefined) : null;
  const localizedOutcome = selectedOptionResult && localizedEvent ? localizedEvent.opciones[selectedOptionResult.index] : null;
  const [isLoadingEvent, setIsLoadingEvent] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [overlayPaused, setOverlayPaused] = useState(false);
  useEffect(() => {
    const observer = new MutationObserver(() => setOverlayPaused(!!document.querySelector('dialog.academy-dialog[open]')));
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'], childList: true });
    return () => observer.disconnect();
  }, []);
  const [isPhase1Finished, setIsPhase1Finished] = useState<boolean>(false);
  useEffect(() => { if (!isPhase1Finished) return; const el = phaseDialog.current; el?.showModal(); return () => el?.close(); }, [isPhase1Finished]);
  const failureNotifiedRef = useRef<boolean>(false);
  const onMissionFailedRef = useRef(onMissionFailed);
  onMissionFailedRef.current = onMissionFailed;
  const appTRef = useRef(appT);
  appTRef.current = appT;
  const langRef = useRef(lang);
  langRef.current = lang;

  // Detect critical life-support or shield depletion cleanly outside state updaters
  useEffect(() => {
    if (failureNotifiedRef.current) return;
    if (stats.oxygenPercent <= 0) {
      failureNotifiedRef.current = true;
      onMissionFailedRef.current(appTRef.current.oxygenDepletedFail, stats);
    } else if (stats.shieldHealthPercent <= 0) {
      failureNotifiedRef.current = true;
      onMissionFailedRef.current(appTRef.current.shieldDepletedFail, stats);
    }
  }, [stats]);

  // Flight clock loop scaled by selected propulsion ISP & power surplus
  useEffect(() => {
    if (activeEvent || selectedOptionResult || isPaused || overlayPaused || isPhase1Finished || isLoadingEvent) return;

    const ispFactor = Math.min(1.35, Math.max(0.85, launchProfile.ispSec / 380));
    const maxCruiseSpeed = 39800 + Math.round(Math.min(12000, launchProfile.ispSec * 4));
    const progressStep = 1.15 * ispFactor;
    const speedStep = Math.round(85 * ispFactor);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return Math.min(100, prev + progressStep);
      });
      setCurrentSpeedKmh((s) => Math.min(maxCruiseSpeed, s + speedStep));
    }, 250);

    return () => clearInterval(interval);
  }, [activeEvent, selectedOptionResult, isPaused, overlayPaused, isPhase1Finished, isLoadingEvent, launchProfile.ispSec]);

  // Monitor progress milestones cleanly without side effects in state updaters
  useEffect(() => {
    if (activeEvent || selectedOptionResult || isPaused || isPhase1Finished || isLoadingEvent) return;

    if (eventTriggeredCount === 0 && progress >= 35 && progress < 45) {
      triggerEvent(0);
    } else if (eventTriggeredCount === 1 && progress >= 70 && progress < 80) {
      triggerEvent(1);
    } else if (progress >= 100 && !isPhase1Finished) {
      sounds.playVictory();
      setIsPhase1Finished(true);
    }
  }, [progress, eventTriggeredCount, activeEvent, selectedOptionResult, isPaused, isPhase1Finished, isLoadingEvent]);

  // Trigger dynamic event from NASA Logic Engine
  const triggerEvent = async (eventIndex: number) => {
    setIsLoadingEvent(true);
    onCameraShakeChange(true);
    sounds.playAlert();
    sounds.playRadioBeep();

    try {
      const eventData = await requestMissionEvent(
        {
          weightKg: stats.weightKg,
          powerW: stats.netPowerW,
          oxygenPercent: stats.oxygenPercent,
          shieldHealthPercent: stats.shieldHealthPercent,
          progressPercent: Math.round(progress),
        },
        mission,
        eventIndex,
        langRef.current,
        profile || undefined
      );

      setActiveEvent(eventData);
      const narration = (language: 'es' | 'en') => {
        const event = getFlightEvent(eventIndex, language, profile || undefined);
        return `${event.titulo_evento}. ${event.descripcion} ${event.opciones.map((o, i) => `${language === 'en' ? 'Option' : 'Opción'} ${i + 1}: ${o.texto}.`).join(' ')} ${language === 'en' ? 'Choose with keys 1 or 2, the buttons, or a voice command.' : 'Elige con las teclas 1 o 2, con los botones o con un comando de voz.'}`;
      };
      announce({ es: narration('es'), en: narration('en') }, 'warning');
      setEventTriggeredCount((c) => c + 1);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingEvent(false);
      setTimeout(() => onCameraShakeChange(false), 800);
    }
  };

  // Handle Option selection
  const handleSelectOption = (option: MissionEventOption) => {
    sounds.playClick();
    if (option.impacto_escudo < 0 || option.impacto_energia < 0) {
      sounds.playRadioBeep();
    }

    setStats((prev) => {
      const newO2 = Math.max(0, Math.min(100, prev.oxygenPercent + option.impacto_oxigeno));
      const newShield = Math.max(0, Math.min(100, prev.shieldHealthPercent + option.impacto_escudo));
      const newNetPower = prev.netPowerW + option.impacto_energia;

      return {
        ...prev,
        oxygenPercent: newO2,
        shieldHealthPercent: newShield,
        netPowerW: newNetPower,
      };
    });

    setSelectedOptionResult({
      option,
      nasaCuriosity: activeEvent?.dato_curioso_nasa || '',
      index: localizedEvent?.opciones.findIndex(o => o.texto === option.texto) ?? 0,
    });
    const index = localizedEvent?.opciones.findIndex(o => o.texto === option.texto) ?? 0;
    announce({ es: getFlightEvent(eventTriggeredCount - 1, 'es', profile || undefined).opciones[index].mensaje_resultado,
      en: getFlightEvent(eventTriggeredCount - 1, 'en', profile || undefined).opciones[index].mensaje_resultado }, 'success');
  };

  const handleResumeFlight = () => {
    sounds.playThruster(0.8);
    sounds.playClick();
    setActiveEvent(null);
    setSelectedOptionResult(null);
  };
  useEffect(() => {
    const dialog = activeEvent && !selectedOptionResult ? eventDialog.current : selectedOptionResult ? resultDialog.current : null;
    dialog?.showModal(); return () => dialog?.close();
  }, [activeEvent, selectedOptionResult]);
  useEffect(() => {
    const act = (command: string) => {
      if (command === 'pause') setIsPaused(p => !p);
      if (localizedEvent && !selectedOptionResult && (command === 'option1' || command === 'option2')) handleSelectOption(localizedEvent.opciones[command === 'option1' ? 0 : 1]);
      if (command === 'continue' && selectedOptionResult) handleResumeFlight();
    };
    const key = (e: KeyboardEvent) => { if ((e.target as HTMLElement).closest('input,select,textarea') || e.altKey || e.ctrlKey || e.metaKey || document.querySelector('dialog.academy-dialog[open]')) return; if (e.key === '1' || e.key === '2') { e.preventDefault(); act(e.key === '1' ? 'option1' : 'option2'); } if (e.key.toLowerCase() === 'p') act('pause'); };
    const voice = (e: Event) => act((e as CustomEvent).detail);
    window.addEventListener('keydown', key); window.addEventListener('jamt:command', voice);
    return () => { window.removeEventListener('keydown', key); window.removeEventListener('jamt:command', voice); };
  }, [activeEvent, selectedOptionResult, lang, profile, eventTriggeredCount]);
  useEffect(() => {
    const milestone = eventTriggeredCount === 0 ? 35 : eventTriggeredCount === 1 ? 70 : 100;
    const distance = milestone - progress;
    if (!access.narration || !access.radar || isMuted || activeEvent || selectedOptionResult || isPaused || overlayPaused || distance > 15 || distance <= 0 || milestone === 100) return;
    const now = performance.now();
    if (now - lastRadarPing.current >= Math.max(230, distance * 65)) { spatialTone('capsule', distance / 15); lastRadarPing.current = now; }
  }, [progress, eventTriggeredCount, access.narration, access.radar, activeEvent, selectedOptionResult, isMuted, isPaused, overlayPaused]);

  return (
    <div className="absolute inset-0 z-30 pointer-events-none select-none flex flex-col justify-between p-4 sm:p-6">
      {/* Top Mission HUD Cluster */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-blue-950/80 border border-blue-500/40 text-blue-200 text-xs font-mono font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>{t.activeFlight} · {locMission.badge}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300">
            <span>
              {t.destLabel} <span className="text-white font-semibold">{locMission.destination}</span> ({mission.distanceKm})
            </span>
            {launchResult && (
              <span className="px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-amber-300">
                {t.propellantAfterOrbit} {launchResult.fuelPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="secondary-button" aria-pressed={isPaused} onClick={() => setIsPaused(p => !p)}>{isPaused ? tx("▶ Continuar") : tx("Ⅱ Pausa")} <kbd>P</kbd></button>
          <LanguageToggle compact />

          <button
            onClick={() => {
              sounds.playClick();
              onToggleMute();
            }}
            className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 cursor-pointer"
            title={isMuted ? titleT.enableAudio : titleT.muteAudio}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          <button
            onClick={() => {
              sounds.playClick();
              onAbort();
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-700 hover:border-rose-500 text-rose-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.abortHangar}</span>
          </button>
        </div>
      </div>

      {/* Trajectory Waypoints & Progress Bar */}
      <div className="max-w-2xl mx-auto w-full pointer-events-auto mt-2">
        <div className="p-3 rounded-2xl bg-slate-950/85 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between text-xs font-mono text-slate-300 mb-1.5">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>{t.navTrajectory}</span>
            </div>
            <div className="tabular-nums font-bold text-sky-400">
              {t.completedPct(progress.toFixed(1))}
            </div>
          </div>

          {/* Progress bar with milestone indicators */}
          <div className="relative w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Milestones label */}
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2 px-1">
            <span className={progress >= 0 ? 'text-blue-300 font-semibold' : ''}>{t.step1}</span>
            <span className={progress >= 35 ? 'text-amber-300 font-semibold' : ''}>{t.step2}</span>
            <span className={progress >= 70 ? 'text-indigo-300 font-semibold' : ''}>{t.step3}</span>
            <span className={progress >= 95 ? 'text-emerald-400 font-semibold' : ''}>{t.step4(locMission.destination)}</span>
          </div>
        </div>
      </div>

      {/* Dynamic Event Dialog Modal */}
      {activeEvent && !selectedOptionResult && (
        <dialog ref={eventDialog} aria-label={localizedEvent!.titulo_evento} onCancel={e => e.preventDefault()} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto select-none">
          <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-amber-500/50 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Event Warning Header */}
            <div className="px-6 py-4 bg-amber-950/70 border-b border-amber-500/40 text-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
                    {t.eventRibbon}
                  </div>
                  <div className="text-lg font-bold font-['Chakra_Petch'] text-white">
                    {localizedEvent!.titulo_evento}
                  </div>
                </div>
              </div>
              <div className="text-xs font-mono text-amber-300/80">
                {t.stepLabel(progress.toFixed(0))}
              </div>
            </div>

            {/* Event Description */}
            <div className="p-6 space-y-4"><div className="flex justify-end"><LanguageToggle compact /></div>
              <p className="text-sm sm:text-base text-slate-200 font-sans leading-relaxed">
                <ContextualText text={localizedEvent!.descripcion} />
                <SourceLinks sources={localizedEvent!.sources} model />
              </p>
              <p className="text-xs text-sky-200">{tx("Viaje en pausa. Elige con 1 o 2, o usa un botón. No hay límite de tiempo.")}</p>
              <button className="secondary-button" onClick={() => {
                stopEventVoice.current?.();
                stopEventVoice.current = startVoiceCommand(text => {
                  const index = optionCommand(text);
                  if (index !== null) handleSelectOption(localizedEvent!.opciones[index]); else announce(tx("Di opción uno u opción dos. También puedes usar el teclado."), 'warning');
                }, () => {});
              }}>{tx("♩ Elegir por voz")}</button>

              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                {t.selectOrder}
              </div>

              {/* Options Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {localizedEvent!.opciones.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-blue-400 hover:bg-slate-800/90 transition-all text-left flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-white font-['Chakra_Petch'] group-hover:text-blue-300 transition-colors">
                        {opt.texto}
                      </div>
                    </div>

                    {/* Impact Badges */}
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center gap-2 text-[10px] font-mono">
                      {opt.impacto_energia !== 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            opt.impacto_energia > 0
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          ⚡ {opt.impacto_energia > 0 ? `+${opt.impacto_energia}` : opt.impacto_energia}W
                        </span>
                      )}
                      {opt.impacto_oxigeno !== 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            opt.impacto_oxigeno > 0
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          💨 {opt.impacto_oxigeno > 0 ? `+${opt.impacto_oxigeno}%` : `${opt.impacto_oxigeno}%`} O₂
                        </span>
                      )}
                      {opt.impacto_escudo !== 0 && (
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            opt.impacto_escudo > 0
                              ? 'bg-emerald-950 text-emerald-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          🛡️ {opt.impacto_escudo > 0 ? `+${opt.impacto_escudo}%` : `${opt.impacto_escudo}%`} {t.shieldBadge}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </dialog>
      )}

      {/* Selected Option Outcome & NASA Curiosity Dialog */}
      {selectedOptionResult && (
        <dialog ref={resultDialog} aria-label={tx("Resultado de la decisión")} onCancel={e => e.preventDefault()} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm pointer-events-auto select-none">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-blue-500/40 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-blue-950/70 border-b border-blue-500/40 text-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-bold font-['Chakra_Petch'] text-white">
                  {t.protocolDone}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4"><div className="flex justify-end"><LanguageToggle compact /></div>
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 leading-relaxed font-sans">
                {localizedOutcome?.mensaje_resultado}
              </div>

              {/* NASA Educational Curiosity Pill */}
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-300 uppercase mb-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>{t.nasaFactTitle}</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-sans">
                  {localizedEvent && <><ContextualText text={localizedEvent.dato_curioso_nasa} /><SourceLinks sources={localizedEvent.sources} /></>}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleResumeFlight}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold font-['Chakra_Petch'] text-sm tracking-wider uppercase transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
              >
                <span>{t.resumeFlight}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Modal: Phase 1 Success & Phase 2 Unlock */}
      {isPhase1Finished && (
        <dialog ref={phaseDialog} aria-label={tx("Tránsito completado")} onCancel={e => e.preventDefault()} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none pointer-events-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-emerald-500/50 shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-end"><LanguageToggle compact /></div>
            {/* Header Ribbon */}
            <div className="flex items-center gap-3 border-b border-emerald-500/30 pb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  {t.phase1Ribbon}
                </div>
                <h2 className="text-xl font-bold font-['Chakra_Petch'] text-white">
                  {t.phase1Title}
                </h2>
              </div>
            </div>

            {/* Achievement explanation */}
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm leading-relaxed">
              {t.phase1Body(locMission.destination)}
            </div>

            {/* Telemetry Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{t.finalOxygen}</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">{stats.oxygenPercent}%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{t.tpsShield}</div>
                <div className="text-lg font-bold font-mono text-indigo-300 mt-0.5">{stats.shieldHealthPercent}%</div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <div className="text-[10px] font-mono text-slate-400 uppercase">{t.netSurplus}</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">+{stats.netPowerW} W</div>
              </div>
            </div>

            {/* Authorization badge */}
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <strong className="text-white font-['Chakra_Petch'] block">{t.authGrantedTitle}</strong>
                {t.authGrantedDesc}
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  sounds.playClick();
                  sounds.playApproval();
                  onMissionSuccess(stats);
                }}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-bold font-['Chakra_Petch'] text-sm tracking-wider uppercase transition-all shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.enterPhase2}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </dialog>
      )}

      {/* Bottom Live Flight Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pointer-events-auto max-w-4xl mx-auto w-full">
        {/* Speed */}
        <div className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase">{t.orbitalVelocity}</div>
          <div className="text-base font-bold text-white tabular-nums mt-0.5">
            {currentSpeedKmh.toLocaleString()} <span className="text-xs text-slate-400">km/h</span>
          </div>
        </div>

        {/* Energy */}
        <div className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
            <Battery className="w-3 h-3 text-amber-400" />
            <span>{t.netPower}</span>
          </div>
          <div className="text-base font-bold text-emerald-400 tabular-nums mt-0.5">
            +{stats.netPowerW} <span className="text-xs text-slate-400">W</span>
          </div>
        </div>

        {/* Oxygen */}
        <div className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span>{t.o2Support}</span>
          </div>
          <div className="text-base font-bold text-cyan-300 tabular-nums mt-0.5">
            {stats.oxygenPercent}%
          </div>
        </div>

        {/* Shield */}
        <div className="p-2.5 rounded-xl bg-slate-950/85 border border-slate-800 text-xs font-mono">
          <div className="text-[10px] text-slate-400 uppercase flex items-center gap-1">
            <Shield className="w-3 h-3 text-indigo-400" />
            <span>{t.tpsShield}</span>
          </div>
          <div className="text-base font-bold text-indigo-300 tabular-nums mt-0.5">
            {stats.shieldHealthPercent}%
          </div>
        </div>
      </div>
    </div>
  );
};

