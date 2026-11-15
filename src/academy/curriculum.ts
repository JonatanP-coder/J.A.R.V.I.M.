import { glossaryAliases } from './glossaryAliases';
import type { EducationalContent } from '../types/sources';
import { nasa } from '../data/nasaSources';
import { adaptiveText, lessonConcept, type TeachingProfile } from './adaptive';
import type { LearnerProfile } from './model';
import type { Language } from '../i18n/I18nContext';
import { translate } from '../i18n/integratedCopy';
export const AREAS = [
  { id: 'science', sources: [nasa.pica, nasa.radiation, nasa.dose], name: 'Ciencia espacial', icon: '✧', question: '¿Por qué una nave necesita un escudo?', options: ['Para protegerla del calor y la radiación', 'Para generar oxígeno', 'Para aumentar su masa'], correct: 0,
    simple: 'El escudo es como un abrigo protector: ayuda a cuidar a la tripulación del calor y de partículas del espacio.',
    science: 'La radiación y el calentamiento aerodinámico son riesgos distintos. El diseño combina materiales, geometría y protección térmica.',
    technical: 'El TPS controla el flujo térmico; el blindaje limita dosis ionizantes. Son requisitos diferentes: no intercambiables en una nave real.', formula: 'Flujo térmico ≠ dosis de radiación' },
  { id: 'technology', sources: [nasa.power], name: 'Tecnología', icon: '☀', question: 'Tu nave consume 400 W y genera 500 W. ¿Cuál es el balance?', options: ['−100 W', '+100 W', '+900 W'], correct: 1,
    simple: 'Los paneles son como hojas que atrapan luz. Si producen más electricidad de la que usas, queda energía disponible.',
    science: 'Las celdas fotovoltaicas convierten luz en electricidad. Resta el consumo a la generación para conocer el balance.',
    technical: 'Evalúa el bus de potencia a partir de generación y cargas. Un margen positivo no sustituye el almacenamiento durante eclipses.', formula: 'P_neta = P_generada − P_consumida' },
  { id: 'engineering', sources: [nasa.twr, nasa.forces], name: 'Ingeniería', icon: '⚙', question: 'En este simulador, una nave de 1600 kg necesita…', options: ['Menos oxígeno', 'Solo un panel solar', 'Un motor pesado'], correct: 2,
    simple: 'Como una bicicleta con una mochila muy pesada, tu nave necesita suficiente fuerza para moverse.',
    science: 'La masa se mide en kg y el empuje en N. En este modelo educativo, más de 1500 kg exige un motor pesado.',
    technical: 'Analiza la relación empuje/peso y la aceleración neta. El umbral de 1500 kg es una regla didáctica, no una norma NASA.', formula: 'TWR = T / (m · g); a = (T − D) / m − g' },
  { id: 'wellbeing', sources: [nasa.eclss, nasa.humanFactors], name: 'Bienestar físico', icon: '♡', question: 'En una sesión larga, ¿qué decisión cuida a la tripulación?', options: ['Planificar descansos y revisar el soporte vital', 'Ignorar el cansancio', 'Reducir el oxígeno para ahorrar'], correct: 0,
    simple: 'Explorar también es cuidarte. Puedes descansar o hacer una pausa tranquila; no necesitas hacer movimientos físicos para completar el reto.',
    science: 'El descanso, el ambiente habitable y el soporte vital forman parte de la preparación. La actividad se adapta a cada persona.',
    technical: 'La carga de trabajo y los recursos de soporte vital se planifican junto con los factores humanos. Pausar no resta puntos.', formula: 'Recursos + descanso + entorno habitable' },
  { id: 'communication', sources: [nasa.comms, nasa.delay, nasa.motion], name: 'Comunicación', icon: '⌁', question: 'Si un mensaje tarda en llegar a Marte, ¿qué conviene enviar?', options: ['Solo una alarma sin contexto', 'Un reporte claro con estado, riesgo y acción', 'Ninguna información'], correct: 1,
    simple: 'Un buen mensaje cuenta qué pasa, qué necesitas y qué vas a hacer. Todos deben poder leerlo o escucharlo.',
    science: 'La luz y las señales de radio viajan a velocidad finita. La distancia provoca retrasos de comunicación.',
    technical: 'La latencia de ida es distancia entre velocidad de propagación. Los procedimientos deben contemplar autonomía operativa.', formula: 't = d / c; c ≈ 299 792 km/s' },
  { id: 'teamwork', sources: [nasa.humanFactors, nasa.frr], name: 'Trabajo en equipo', icon: '◇', question: 'Dos miembros del equipo discrepan sobre una alarma. ¿Qué hacen?', options: ['Elegir al más rápido', 'Ocultar el problema', 'Comparar telemetría y confirmar la decisión juntos'], correct: 2,
    simple: 'Una buena tripulación escucha a todas las personas. Explica tu idea y revisa los datos antes de decidir.',
    science: 'La verificación compartida ayuda a detectar errores. Describe los datos, la hipótesis y el resultado esperado.',
    technical: 'Usa una confirmación de circuito cerrado: emitir, repetir y verificar una instrucción crítica antes de ejecutarla.', formula: 'Observar → comunicar → verificar → actuar' },
  { id: 'operations', sources: [nasa.artemis, nasa.radiation, nasa.dose], name: 'Operaciones espaciales', icon: '↗', question: 'Ante una tormenta solar, la prioridad es…', options: ['Proteger a la tripulación y revisar el blindaje', 'Apagar todo el soporte vital', 'Aumentar el riesgo para ganar puntos'], correct: 0,
    simple: 'Si llega una tormenta del Sol, busca protección. En el simulador puedes detenerte y pensar antes de elegir.',
    science: 'Las partículas energéticas solares pueden afectar personas y equipos. Cada acción cambia recursos y protección.',
    technical: 'Prioriza la exposición de la tripulación, la orientación y la disponibilidad energética. Compara restricciones antes de maniobrar.', formula: 'Decisión = seguridad + recursos + objetivo' },
] as const satisfies readonly (EducationalContent & Record<string, unknown>)[];
export function lessonText(area: { id: keyof typeof lessonConcept; simple: string; science: string; technical: string }, profile: LearnerProfile, lang: Language = 'es') {
  const layer = { beginner: area.simple, intermediate: area.science, expert: area.technical };
  return layer[profile.knowledge] + ' ' + adaptiveText(lessonConcept[area.id], profile, lang);
}
export const GLOSSARY = [
  { id: 'mass', sources: [nasa.forces], term: 'Masa', definition: 'Cantidad de materia de un objeto. Se mide en kilogramos; no es lo mismo que el peso, que depende de la gravedad.' },
  { id: 'power-balance', sources: [nasa.power], term: 'Balance energético', definition: 'Potencia generada menos potencia consumida. Un resultado negativo indica que necesitas reducir consumo o generar más.' },
  { id: 'life-support', sources: [nasa.eclss], term: 'Soporte vital', definition: 'Sistemas que mantienen un ambiente habitable: aire, agua, presión y control de temperatura.' },
  { id: 'telemetry', sources: [nasa.comms, nasa.motion], term: 'Telemetría', definition: 'Mediciones enviadas a distancia para conocer el estado de una nave o un instrumento.' },
  { id: 'propulsion', sources: [nasa.thrust, nasa.twr, nasa.forces], term: 'Propulsión', definition: 'Sistema que produce empuje para cambiar el movimiento de una nave.' },
  { id: 'radiation', sources: [nasa.radiation, nasa.dose], term: 'Radiación', definition: 'Energía que se propaga como ondas o partículas. Parte de ella puede dañar tejidos y equipos.' },
  { id: 'orbit', sources: [nasa.orbitalMechanics], term: 'Órbita', definition: 'Trayectoria alrededor de otro cuerpo debida a la gravedad y al movimiento.' },
  { id: 'thermal-protection', sources: [nasa.pica, nasa.heat], term: 'TPS', definition: 'Sistema de protección térmica: materiales que protegen frente al calentamiento.' },
  { id: 'readiness', sources: [nasa.frr], term: 'FRR', definition: 'Flight Readiness Review: revisión de preparación para el vuelo. Aquí es una evaluación educativa, no una certificación de vuelo real.' },
  { id: 'lunar-halo', sources: [nasa.capstone], term: 'NRHO', definition: 'Órbita de halo casi rectilínea. Es una trayectoria especial alrededor de la Luna.' },
  { id: 'rover', sources: [nasa.perseverance, nasa.motion], term: 'Rover', definition: 'Robot que recorre la superficie de otro mundo para investigar y recoger mediciones.' },
  { id: 'thrust', sources: [nasa.thrust, nasa.twr], term: 'Empuje', definition: 'Fuerza producida por un motor. Se mide en newtons.' },
] as const satisfies readonly (EducationalContent & Record<string, unknown>)[];
export function getTrainingAreas(language: Language) {
  return AREAS.map(area => ({ ...area, name: translate(area.name, language), question: translate(area.question, language),
    options: area.options.map(option => translate(option, language)), simple: translate(area.simple, language),
    science: translate(area.science, language), technical: translate(area.technical, language), formula: translate(area.formula, language) }));
}
export function getGlossary(language: Language, profile?: TeachingProfile | null) {
  return GLOSSARY.map(entry => {
    const base = translate(entry.definition, language);
    const guidance = profile ? adaptiveText(entry.term, profile, language) : '';
    const term = translate(entry.term, language);
    const aliases = glossaryAliases[entry.term]?.[language] ?? [];
    return { id: entry.id, sources: entry.sources, canonicalTerm: entry.term, term, aliases,
      definition: profile?.knowledge === 'beginner' ? guidance : [base, guidance].filter(Boolean).join(' ') };
  });
}
