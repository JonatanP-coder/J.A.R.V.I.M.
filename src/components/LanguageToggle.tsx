import React from 'react';
import { Globe } from 'lucide-react';
import { useI18n, Language } from '../i18n/I18nContext';
import { sounds } from '../utils/audio';

interface LanguageToggleProps {
  compact?: boolean;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ compact = false }) => {
  const { lang, setLang } = useI18n();

  const handleSelect = (next: Language) => {
    if (next === lang) return;
    sounds.playClick();
    setLang(next);
  };

  return (
    <div
      role="group"
      aria-label={lang === 'es' ? 'Selector de idioma' : 'Language selector'}
      className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-sm"
    >
      {!compact && <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5 hidden sm:block" />}
      <button
        type="button"
        onClick={() => handleSelect('es')}
        aria-pressed={lang === 'es'}
        className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer ${
          lang === 'es'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Cambiar a Español"
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => handleSelect('en')}
        aria-pressed={lang === 'en'}
        className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition-colors cursor-pointer ${
          lang === 'en'
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
            : 'text-slate-400 hover:text-white'
        }`}
        title="Switch to English"
      >
        EN
      </button>
    </div>
  );
};
