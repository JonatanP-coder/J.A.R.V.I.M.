import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'es' | 'en';

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
}

const STORAGE_KEY = 'nasa_trainer_lang';

const I18nContext = createContext<I18nContextValue>({
  lang: 'es',
  setLang: () => {},
  toggleLang: () => {},
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'es';
    const urlLang = new URLSearchParams(window.location.search).get('lang');
    if (urlLang === 'en' || urlLang === 'es') return urlLang;
    try { const saved = window.localStorage.getItem(STORAGE_KEY); return saved === 'en' || saved === 'es' ? saved : 'es'; } catch { return 'es'; }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage access restrictions
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    if (typeof document !== 'undefined') document.documentElement.lang = next;
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'es' ? 'en' : 'es');
  }, [lang, setLang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useI18n() {
  return useContext(I18nContext);
}
