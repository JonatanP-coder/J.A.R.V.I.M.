import { COMPONENTS } from '../data/components';
import { NASA_FLIGHT_EVENTS_EN, NASA_FLIGHT_EVENTS_ES } from '../data/flightEvents';
import { getLocalizedComponent } from './translations';
import { EN_TRANSLATIONS, translate, type BilingualText } from './integratedCopy';
import type { Language } from './I18nContext';

/** Known legacy narration can be rendered in either language without changing stored identities. */
export function localizeMissionMessage(message: { text: string; translations?: BilingualText }, language: Language) {
  if (message.translations) return message.translations[language];
  let text = translate(message.text, language);
  const from = language === 'en' ? 'es' : 'en';
  const replacements: [string, string][] = [];
  for (const component of COMPONENTS) {
    const source = getLocalizedComponent(component, from), target = getLocalizedComponent(component, language);
    for (const field of ['name', 'description', 'nasaLore'] as const) if (source[field] !== target[field]) replacements.push([source[field], target[field]]);
  }
  const catalogs = { es: NASA_FLIGHT_EVENTS_ES, en: NASA_FLIGHT_EVENTS_EN };
  catalogs[from].forEach((event, i) => {
    const target = catalogs[language][i];
    replacements.push([event.titulo_evento, target.titulo_evento], [event.descripcion, target.descripcion], [event.dato_curioso_nasa, target.dato_curioso_nasa]);
    event.opciones.forEach((option, j) => replacements.push([option.texto, target.opciones[j].texto], [option.mensaje_resultado, target.opciones[j].mensaje_resultado]));
  });
  for (const [es, en] of Object.entries(EN_TRANSLATIONS)) if (es.length >= 10 && es !== en) replacements.push(language === 'en' ? [es, en] : [en, es]);
  const fragments = [
    ['Pieza instalada: ', 'Part installed: '], ['. Masa ', '. Mass '], [' kilogramos', ' kilograms'], [' vatios', ' watts'],
    ['Consume ', 'Consumes '], ['Genera ', 'Generates '], ['Generación: ', 'Generation: '], ['Consumo: ', 'Consumption: '],
    ['Estado de la nave.', 'Ship status.'], ['Regla 1, masa:', 'Rule 1, mass:'], ['Regla 2, balance energético:', 'Rule 2, power balance:'],
    ['Regla 3, soporte vital y protección:', 'Rule 3, life support and protection:'], ['Correcta.', 'Correct.'], ['Correctos.', 'Correct.'],
    ['Necesitas motor pesado.', 'A heavy engine is required.'], ['Generación suficiente.', 'Sufficient generation.'],
    ['Instala más generación o reduce consumo.', 'Install more generation or reduce consumption.'],
    ['Revisa los sistemas de soporte y protección.', 'Check life support and protection systems.'],
    ['Dentro del límite.', 'Within the limit.'], ['Excede el límite.', 'Over the limit.'],
    ['Presupuesto ', 'Budget '], [' por ciento', ' percent'], [' dólares', ' dollars'], [' mínimo ', ' minimum '], ['oxígeno ', 'oxygen '], ['Escudo ', 'Shielding '], [' netos.', ' net.'],
  ];
  for (const pair of fragments) replacements.push(language === 'en' ? pair as [string, string] : [pair[1], pair[0]]);
  for (const [source, target] of replacements.sort((a, b) => b[0].length - a[0].length)) text = text.split(source).join(target);
  return text;
}
