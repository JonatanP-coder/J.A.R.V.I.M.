import EN from './integrated-en.json';
import type { Language } from './I18nContext';

export const EN_TRANSLATIONS: Record<string, string> = EN;
const spanishByEnglish = new Map(Object.entries(EN).map(([es, en]) => [en, es]));
export type BilingualText = { es: string; en: string };
export function activeLanguage(): Language { return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'es'; }
export function translate(text: string, language: Language): string {
  const source = EN_TRANSLATIONS[text] !== undefined ? text : spanishByEnglish.get(text) || text;
  if (language === 'en' && EN_TRANSLATIONS[source] !== undefined) return EN_TRANSLATIONS[source];
  if (language === 'es' && spanishByEnglish.has(text)) return spanishByEnglish.get(text)!;
  for (const prefix of ['Diseño aprobado · ', 'Tránsito completado · ']) {
    const english = EN_TRANSLATIONS[prefix];
    const matched = text.startsWith(prefix) ? prefix : text.startsWith(english) ? english : null;
    if (matched) return (language === 'en' ? english : prefix) + text.slice(matched.length);
  }
  return source;
}
export function translateCurrent(text: string): string { return translate(text, activeLanguage()); }
export function bilingual(text: string | BilingualText): BilingualText {
  return typeof text === 'string' ? { es: translate(text, 'es'), en: translate(text, 'en') } : text;
}
export function locale(language: Language) { return language === 'es' ? 'es-CO' : 'en-US'; }
