import { LanguageToggle } from './LanguageToggle';
import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useRef } from 'react';
import { MissionProfile, MissionStats } from '../types/mission';
import { Award, RotateCcw, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedMission } from '../i18n/translations';

interface DebriefModalProps {
  mission: MissionProfile;
  finalStats: MissionStats;
  isSuccess: boolean;
  failReason?: string;
  onRestart: () => void;
  onOpenDestination?: () => void;
}

export const DebriefModal: React.FC<DebriefModalProps> = ({
  mission,
  finalStats,
  isSuccess,
  failReason,
  onRestart,
  onOpenDestination,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current!; el.showModal(); return () => el.close(); }, []);
  const t = UI_COPY[lang].debrief;
  const locMission = getLocalizedMission(mission, lang);

  return (
    <dialog ref={dialog} aria-label={tx("Resumen de la misión")} onCancel={e => { e.preventDefault(); onRestart(); }} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div
          className={`px-6 py-5 border-b flex items-center justify-between ${
            isSuccess
              ? 'bg-gradient-to-r from-blue-950/80 to-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400 shadow-lg">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                {t.banner}
              </div>
              <div className="text-lg font-bold font-['Chakra_Petch'] text-white">
                {isSuccess ? t.successTitle : t.failTitle}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4"><div className="flex justify-end"><LanguageToggle compact /></div>
          {isSuccess ? (
            <>
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-sm leading-relaxed">
                {t.successSummary(locMission.destination)}
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">{t.finalOxygen}</div>
                  <div className="text-lg font-bold font-mono text-cyan-300 tabular-nums mt-0.5">
                    {finalStats.oxygenPercent}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">{t.tpsShield}</div>
                  <div className="text-lg font-bold font-mono text-indigo-300 tabular-nums mt-0.5">
                    {finalStats.shieldHealthPercent}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">{t.scienceEarned}</div>
                  <div className="text-lg font-bold font-mono text-amber-300 tabular-nums mt-0.5">
                    +{finalStats.sciencePoints} pts
                  </div>
                </div>
              </div>

              {/* Junior Astronaut Certificate */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="text-xs text-slate-300 leading-snug">
                  <strong className="text-white block font-['Chakra_Petch'] text-sm">
                    {t.badgeTitle}
                  </strong>
                  {t.badgeDesc}
                </div>
              </div>
            </>
          ) : (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm leading-relaxed">
              <strong>{t.abortReasonLabel}</strong> {failReason || t.defaultAbortReason}
              <div className="mt-2 text-xs text-slate-300">
                {t.abortAdvice}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between gap-3">
          {onOpenDestination && isSuccess ? (
            <button
              onClick={() => {
                sounds.playClick();
                onOpenDestination();
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold font-['Chakra_Petch'] text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.openPhase2}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={() => {
              sounds.playClick();
              onRestart();
            }}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold font-['Chakra_Petch'] text-sm tracking-wider uppercase transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.designAnother}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

