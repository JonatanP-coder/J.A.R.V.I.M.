import { ContextualText } from './ContextualText';
import { adaptiveText } from '../academy/adaptive';
import { useAcademy } from '../context/AcademyContext';
import React, { useState } from 'react';
import { MissionProfile, MissionStats, SpacecraftComponent } from '../types/mission';
import { MISSIONS, PRESET_CONFIGS } from '../data/components';
import { CheckCircle2, AlertTriangle, Battery, Gauge, Shield, DollarSign, Rocket, RotateCcw, Volume2, VolumeX, Sparkles, Lock, X } from 'lucide-react';
import { sounds } from '../utils/audio';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedMission, PRESET_COPY } from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';
import { GlossaryTerm } from './MissionTools';

interface HangarHUDProps {
  currentMission: MissionProfile;
  onSelectMission: (mission: MissionProfile) => void;
  stats: MissionStats;
  selectedComponents: Record<string, SpacecraftComponent>;
  onApplyPreset: (presetIndex: number) => void;
  onRequestReview: () => void;
  isEvaluating: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onReturnTitle: () => void;
  isPhase1Completed?: boolean;
  onOpenDestination?: () => void;
  onDirectLaunch?: () => void;
}

export const HangarHUD: React.FC<HangarHUDProps> = ({
  currentMission,
  onSelectMission,
  stats,
  selectedComponents,
  onApplyPreset,
  onRequestReview,
  isEvaluating,
  isMuted,
  onToggleMute,
  onReturnTitle,
  isPhase1Completed = false,
  onOpenDestination,
  onDirectLaunch,
}) => {
  const { lang } = useI18n();
  const { profile } = useAcademy();
  const t = UI_COPY[lang].hangar;
  const titleT = UI_COPY[lang].title;
  const presets = PRESET_COPY[lang];

  const [showLockedModal, setShowLockedModal] = useState<boolean>(false);
  const isHeavy = selectedComponents.engine?.isHeavyEngine;
  const isWeightViolation = stats.weightKg > 1500 && !isHeavy;
  const isPowerViolation = stats.powerGeneratedW < stats.powerConsumedW;
  const isOxygenViolation = stats.oxygenPercent < currentMission.minOxygen;
  const isShieldViolation = stats.shieldHealthPercent < currentMission.minShield;

  const hasAnyCriticalViolation = isWeightViolation || isPowerViolation || isOxygenViolation || isShieldViolation || stats.budgetUSD > currentMission.maxBudget;

  return (
    <>
      <div className="hangar-hud absolute top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-5 select-none flex flex-col gap-3">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Brand & Return */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sounds.playClick();
              onReturnTitle();
            }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-colors text-xs font-mono cursor-pointer"
            title={t.homeTitle}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.homeBtn}</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-md bg-blue-950/60 border border-blue-600/30 text-blue-300 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{t.vabBanner}</span>
          </div>
        </div>

        {/* Mission Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800">
          {MISSIONS.map((m) => {
            const isSelected = m.id === currentMission.id;
            const locMission = getLocalizedMission(m, lang);
            return (
              <button
                key={m.id}
                onClick={() => {
                  sounds.playClick();
                  onSelectMission(m);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-['Chakra_Petch'] transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {locMission.badge}
              </button>
            );
          })}
        </div>

        {/* Preset Selector, Phase 2 Status, Language & Audio */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t.presetAria}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              if (!isNaN(idx)) {
                sounds.playClick();
                onApplyPreset(idx);
              }
            }}
            value=""
            className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700 text-xs font-mono text-slate-300 hover:border-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="" disabled>{t.presetPlaceholder}</option>
            {PRESET_CONFIGS.map((p, idx) => (
              <option key={idx} value={idx}>
                {presets[idx]?.name || p.name}
              </option>
            ))}
          </select>

          {isPhase1Completed ? (
            <button
              onClick={() => {
                sounds.playClick();
                sounds.playTelemetryPing();
                onOpenDestination?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-xs font-mono font-medium transition-colors shadow-sm cursor-pointer"
              title={t.phase2UnlockedTitle}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.phase2Unlocked}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sounds.playAlert();
                setShowLockedModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 hover:border-amber-500/60 text-slate-400 hover:text-amber-300 text-xs font-mono font-medium transition-colors cursor-pointer"
              title={t.phase2LockedTitle}
            >
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.phase2Locked}</span>
            </button>
          )}

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
        </div>
      </div>

      {/* Perimeter Status Clusters (NASA Telemetry Readouts in tabular-nums) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 pointer-events-auto">
        {/* 1. Mass / Weight Limit (Rule 1) */}
        <div
          className={`p-2.5 rounded-xl border transition-colors ${
            isWeightViolation
              ? 'bg-red-950/80 border-red-500/80 text-red-200'
              : 'bg-slate-900/85 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-blue-400" />
              <GlossaryTerm term="Masa">{t.massLabel}</GlossaryTerm>
            </span>
            {isWeightViolation ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono tabular-nums text-white">
              {stats.weightKg}
            </span>
            <span className="text-xs font-mono text-slate-400">/ 1500 kg</span>
          </div>
          <div className="text-[10px] font-mono truncate mt-0.5">
            {isWeightViolation ? (
              <span className="text-red-300 font-semibold">{t.heavyRequired}</span>
            ) : isHeavy ? (
              <span className="text-emerald-400">{t.heavyActive}</span>
            ) : (
              <span className="text-slate-400">{t.mediumLimitOk}</span>
            )}
          </div>
        </div>

        {/* 2. Electrical Balance (Rule 2) */}
        <div
          className={`p-2.5 rounded-xl border transition-colors ${
            isPowerViolation
              ? 'bg-red-950/80 border-red-500/80 text-red-200'
              : 'bg-slate-900/85 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-amber-400" />
              <GlossaryTerm term="Balance energético">{t.powerLabel}</GlossaryTerm>
            </span>
            {isPowerViolation ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span
              className={`text-lg font-bold font-mono tabular-nums ${
                isPowerViolation ? 'text-red-300' : 'text-emerald-400'
              }`}
            >
              {stats.netPowerW >= 0 ? `+${stats.netPowerW}` : stats.netPowerW}
            </span>
            <span className="text-xs font-mono text-slate-400">{t.netWatts}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
            {t.powerBreakdown(stats.powerGeneratedW, stats.powerConsumedW)}
          </div>
          {isPowerViolation && <p className="mt-1 text-xs leading-snug"><ContextualText text={adaptiveText('power.deficit', profile, lang)} /></p>}
        </div>

        {/* 3. Oxygen Level (Rule 3) */}
        <div
          className={`p-2.5 rounded-xl border transition-colors ${
            isOxygenViolation
              ? 'bg-red-950/80 border-red-500/80 text-red-200'
              : 'bg-slate-900/85 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <GlossaryTerm term="Soporte vital">{t.oxygenLabel}</GlossaryTerm>
            </span>
            {isOxygenViolation ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono tabular-nums text-white">
              {stats.oxygenPercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({t.minPrefix} {currentMission.minOxygen}%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
            {isOxygenViolation ? (
              <span className="text-red-300 font-semibold">{t.oxygenLow}</span>
            ) : (
              <span className="text-emerald-400">{t.oxygenNominal}</span>
            )}
          </div>
        </div>

        {/* 4. Shield Health (Rule 3) */}
        <div
          className={`p-2.5 rounded-xl border transition-colors ${
            isShieldViolation
              ? 'bg-red-950/80 border-red-500/80 text-red-200'
              : 'bg-slate-900/85 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              <GlossaryTerm term="TPS">{t.shieldLabel}</GlossaryTerm>
            </span>
            {isShieldViolation ? (
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-bold font-mono tabular-nums text-white">
              {stats.shieldHealthPercent}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              ({t.minPrefix} {currentMission.minShield}%)
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
            {isShieldViolation ? (
              <span className="text-red-300 font-semibold">{t.shieldLow}</span>
            ) : (
              <span className="text-emerald-400">{t.shieldNominal}</span>
            )}
          </div>
        </div>

        {/* 5. Budget & FRR / Launch Actions */}
        <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-slate-900/85 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>{t.budgetLabel}</span>
            </span>
            <span className="text-[10px] font-mono">
              ${(stats.budgetUSD / 1000).toFixed(0)}k / ${(currentMission.maxBudget / 1000).toFixed(0)}k
            </span>
          </div>

          <div className="mt-2 flex gap-1.5">
            <button
              onClick={() => {
                sounds.playRadioBeep();
                sounds.playClick();
                onRequestReview();
              }}
              disabled={isEvaluating}
              className={`flex-1 py-1.5 px-2 rounded-lg font-semibold font-['Chakra_Petch'] text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                hasAnyCriticalViolation
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{isEvaluating ? t.evaluating : t.requestFrr}</span>
            </button>

            {!hasAnyCriticalViolation && onDirectLaunch && (
              <button
                onClick={() => {
                  sounds.playRadioBeep();
                  sounds.playClick();
                  onDirectLaunch();
                }}
                disabled={isEvaluating}
                className="py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold font-['Chakra_Petch'] text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-lg shadow-emerald-600/30"
                title={t.directLaunchTitle}
              >
                <span>{t.directLaunch}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Modal: Phase 1 Prerequisite Explanation */}
    {showLockedModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md pointer-events-auto select-none">
        <div className="relative w-full max-w-lg rounded-2xl bg-slate-950 border border-amber-500/50 shadow-2xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
                  {t.lockedModalRibbon}
                </div>
                <h3 className="text-base font-bold font-['Chakra_Petch'] text-white">
                  {t.lockedModalTitle}
                </h3>
              </div>
            </div>

            <button
              onClick={() => {
                sounds.playClick();
                setShowLockedModal(false);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
            {t.lockedModalLead}
          </div>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                1
              </span>
              <div>
                <strong className="text-white">{t.lockedStep1Title}</strong>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.lockedStep1Desc}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                2
              </span>
              <div>
                <strong className="text-white">{t.lockedStep2Title}</strong>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.lockedStep2Desc}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-blue-900/60 border border-blue-500/40 text-blue-300 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                3
              </span>
              <div>
                <strong className="text-white">{t.lockedStep3Title}</strong>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {t.lockedStep3Desc}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => {
                sounds.playClick();
                setShowLockedModal(false);
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-blue-600/30 cursor-pointer"
            >
              {t.lockedModalCta}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
};

