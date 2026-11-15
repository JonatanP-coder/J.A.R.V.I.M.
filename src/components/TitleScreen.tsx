import React from 'react';
import { Volume2, VolumeX, Rocket, Award } from 'lucide-react';
import { sounds } from '../utils/audio';
import { useI18n } from '../i18n/I18nContext';
import { UI_COPY } from '../i18n/uiCopy';
import { LanguageToggle } from './LanguageToggle';

interface TitleScreenProps {
  onStart: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({ onStart, isMuted, onToggleMute }) => {
  const { lang } = useI18n();
  const t = UI_COPY[lang].title;

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-between pointer-events-none p-6 sm:p-10 select-none">
      {/* Top Header Lockup */}
      <div className="flex items-center justify-between w-full pointer-events-auto gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-blue-400 font-mono font-bold text-lg shadow-lg shadow-blue-500/20">
            ▲
          </div>
          <div>
            <div className="text-xs font-mono font-semibold tracking-widest text-blue-400 uppercase">
              {t.eventTag}
            </div>
            <div className="text-sm font-semibold text-slate-200">
              {t.controlCenter}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <button
            onClick={() => {
              sounds.playClick();
              onToggleMute();
            }}
            className="px-3 py-2 rounded-lg bg-slate-900/80 border border-slate-700/80 hover:border-slate-500 text-slate-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-mono cursor-pointer"
            title={isMuted ? t.enableAudio : t.muteAudio}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
            <span>{isMuted ? t.muted : t.audioOn}</span>
          </button>
        </div>
      </div>

      {/* Hero Title Lockup over negative space */}
      <div className="max-w-2xl my-auto pointer-events-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-300 text-xs font-mono mb-4">
          <Award className="w-3.5 h-3.5 text-blue-400" />
          <span>{t.programBadge}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold font-['Chakra_Petch'] text-white tracking-tight leading-none uppercase drop-shadow-md">
          Junior Astronaut <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
            Mission Trainer
          </span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-slate-300 font-sans leading-relaxed max-w-xl">
          {t.heroSubtitle}
        </p>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-3 my-6 max-w-lg">
          <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">{t.rule1Title}</div>
            <div className="text-slate-200 font-medium mt-0.5">{t.rule1Desc}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">{t.rule2Title}</div>
            <div className="text-slate-200 font-medium mt-0.5">{t.rule2Desc}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="text-slate-400 font-mono text-[10px] uppercase">{t.rule3Title}</div>
            <div className="text-slate-200 font-medium mt-0.5">{t.rule3Desc}</div>
          </div>
        </div>

        {/* Main CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <button
            onClick={() => {
              sounds.playRadioBeep();
              sounds.playClick();
              onStart();
            }}
            className="group px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold font-['Chakra_Petch'] text-lg tracking-wider uppercase transition-all shadow-xl shadow-blue-600/30 hover:shadow-blue-500/50 flex items-center justify-center gap-3 cursor-pointer"
          >
            <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
            <span>{t.ctaEnter}</span>
          </button>
        </div>
      </div>

      {/* Flat Control Hints Line */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-4 pointer-events-auto">
        <div className="flex items-center gap-4">
          <span>{t.hintDrag}</span>
          <span>•</span>
          <span>{t.hintExploded}</span>
          <span>•</span>
          <span>{t.hintFrr}</span>
        </div>
        <div className="mt-2 sm:mt-0 text-slate-500">
          {t.version}
        </div>
      </div>
    </div>
  );
};

