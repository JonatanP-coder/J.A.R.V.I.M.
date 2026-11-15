import { useIntegratedText } from '../i18n/useIntegratedText';
import React, { useEffect, useRef } from 'react';
import { FlightReadinessReviewResult, MissionProfile, MissionStats } from '../types/mission';
import { CheckCircle2, XCircle, Compass, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { getLocalizedMission } from '../i18n/translations';
import { LanguageToggle } from './LanguageToggle';
import { announce } from '../services/accessibility';

interface ReviewModalProps {
  review: FlightReadinessReviewResult;
  mission: MissionProfile;
  stats: MissionStats;
  onLaunch: () => void;
  onClose: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  review,
  mission,
  onLaunch,
  onClose,
}) => {
  const tx = useIntegratedText();
  const { lang } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current!; el.showModal(); announce(review.dictamen_tecnico, review.aprobado ? 'success' : 'warning'); return () => el.close(); }, []);
  const t = UI_COPY[lang].review;
  const locMission = getLocalizedMission(mission, lang);

  useEffect(() => {
    if (review.aprobado) {
      sounds.playApproval();
    } else {
      sounds.playRejection();
    }
  }, [review.aprobado]);

  return (
    <dialog ref={dialog} aria-label={tx("Revisión de preparación para el vuelo")} onCancel={e => { e.preventDefault(); onClose(); }} className="legacy-dialog fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header Ribbon */}
        <div
          className={`px-6 py-4 flex items-center justify-between border-b ${
            review.aprobado
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {review.aprobado ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                {t.headerTag}
              </div>
              <div className="text-lg font-bold font-['Chakra_Petch']">
                {review.aprobado ? t.approvedTitle : t.rejectedTitle}
              </div>
            </div>
          </div>

          {/* Design Score Badge */}
          <div className="text-right">
            <div className="text-[10px] font-mono uppercase text-slate-400">{t.designScore}</div>
            <div
              className={`text-2xl font-black font-mono tabular-nums ${
                review.aprobado ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {review.puntuacion_diseno}
              <span className="text-xs text-slate-400">/100</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5"><div className="flex justify-end"><LanguageToggle compact /></div>
          {/* Progress bar of score */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
              <span>{t.scoreLabel}</span>
              <span className="font-semibold text-slate-200">{review.puntuacion_diseno}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  review.aprobado
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                    : 'bg-gradient-to-r from-rose-600 to-amber-500'
                }`}
                style={{ width: `${Math.max(5, review.puntuacion_diseno)}%` }}
              />
            </div>
          </div>

          {/* Mission & Target context */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-slate-400">{t.missionPrefix} </span>
              <span className="text-white font-bold">{locMission.name}</span>
            </div>
            <div>
              <span className="text-slate-400">{t.destPrefix} </span>
              <span className="text-sky-300 font-bold">{locMission.destination}</span>
            </div>
          </div>

          {/* Technical Assessment */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-blue-400 uppercase mb-2">
              <Compass className="w-4 h-4" />
              <span>{t.verdictHeading}</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {review.dictamen_tecnico}
            </p>
          </div>

          {/* NASA Educational Note */}
          <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-amber-300 uppercase mb-2">
              <Sparkles className="w-4 h-4" />
              <span>{t.lessonHeading}</span>
            </div>
            <p className="text-sm text-blue-100/90 leading-relaxed font-sans">
              {review.consejo_nasa}
            </p>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-900/60 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t.backHangar}</span>
          </button>

          {review.aprobado && (
            <button
              onClick={() => {
                sounds.playThruster(1.5);
                sounds.playRadioBeep();
                onLaunch();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold font-['Chakra_Petch'] text-sm tracking-wider uppercase transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer"
            >
              <span>{t.goLaunchpad}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
};

