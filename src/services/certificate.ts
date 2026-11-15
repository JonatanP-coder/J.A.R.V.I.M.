import type { SecureCadetProfile } from './cadetProfile';
import { AUDIENCES, LEVELS, levelFor, totalXP, trainingDate } from '../academy/model';
import type { Language } from '../i18n/I18nContext';
import { translate } from '../i18n/integratedCopy';

export function buildCertificate(cadet: SecureCadetProfile, language: Language, date = trainingDate()): string {
  const t = (text: string) => translate(text, language);
  const escape = (text: string) => text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
  const xp = totalXP(cadet.progress), level = levelFor(xp);
  return `<!doctype html><html lang="${language}"><meta charset="utf-8"><title>${t('Constancia educativa')}</title><style>body{font:20px system-ui;background:#07101f;color:#eef6ff;padding:60px;text-align:center}article{border:3px solid #5db9ff;padding:60px}h1{font-size:40px;color:#77c9ff}small{display:block;margin-top:40px}button{padding:15px}@media print{body{background:white;color:black}button{display:none}}</style><article><p>JUNIOR ASTRONAUT MISSION TRAINER</p><h1>${t('Constancia de formación virtual')}</h1><h2>${escape(cadet.codename)}</h2><p>${t('Nivel')} ${level} · ${t(LEVELS[level - 1])} · ${xp} XP</p><p>${t('Siete áreas de formación completadas.')}</p><p>${date} · ${cadet.learner ? t(AUDIENCES[cadet.learner.audience].title) : ''}</p><small>${t('Emitida por este proyecto educativo independiente. No es una certificación, acreditación ni insignia oficial de NASA.')} ${t('Nombre en clave:')} ${escape(cadet.codename)}.</small></article><p><button onclick="window.print()">${t('Imprimir o guardar como PDF')}</button></p></html>`;
}

export function localizedRecordExport(cadet: SecureCadetProfile, language: Language) {
  return { ...cadet, exportLanguage: language,
    achievements: { ...cadet.achievements, rank: translate(cadet.achievements.rank, language), badges: cadet.achievements.badges.map(badge => translate(badge, language)) },
    progress: { ...cadet.progress, entries: cadet.progress.entries.map(entry => ({ ...entry, title: translate(entry.title, language) })) } };
}
