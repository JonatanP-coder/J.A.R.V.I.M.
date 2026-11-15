import { adaptiveText, componentConcept, eventTeachingKey } from './adaptive';
import { NASA_FLIGHT_EVENTS_ES, NASA_FLIGHT_EVENTS_EN } from '../data/flightEvents';
import type { LearnerProfile } from './model';
import type { MissionEvent, SpacecraftComponent } from '../types/mission';
import { translate } from '../i18n/integratedCopy';
export function getFlightEvent(index: number, lang: 'es' | 'en' = 'es', profile?: LearnerProfile): MissionEvent {
  const catalog = lang === 'en' ? NASA_FLIGHT_EVENTS_EN : NASA_FLIGHT_EVENTS_ES;
  const base = catalog[index % catalog.length];
  if (!profile) return { ...base, opciones: base.opciones.map(o => ({ ...o })) };
  const teaching = adaptiveText(eventTeachingKey[base.id], profile, lang);
  if (profile.knowledge !== 'beginner') return { ...base, descripcion: teaching, opciones: base.opciones.map(o => ({ ...o })) };
  const simple = [
    { title: 'Una tormenta del Sol', options: ['1 · Girar la nave para protegernos con el escudo', '2 · Apagar algunos instrumentos y guardar los paneles'] },
    { title: 'Polvo espacial en el camino', options: ['1 · Usar los pequeños motores para apartarnos', '2 · Proteger la nave con el escudo'] },
    { title: 'Revisemos el aire de la nave', options: ['1 · Ajustar el circuito de reserva', '2 · Recuperar más aire con el sistema de reciclaje'] },
    { title: 'El mensaje no está llegando', options: ['1 · Usar los sensores para buscar la señal', '2 · Ahorrar energía mientras esperamos otra antena'] },
    { title: 'Una oportunidad para descubrir', options: ['1 · Cambiar de ruta para investigar', '2 · Seguir por el camino previsto'] },
  ][index % catalog.length];
  return { ...base, titulo_evento: translate(simple.title, lang), descripcion: teaching, opciones: base.opciones.map((o, i) => ({ ...o, texto: translate(simple.options[i], lang), mensaje_resultado: lang === 'en'
    ? `Decision applied. Power ${o.impacto_energia > 0 ? '+' : ''}${o.impacto_energia} watts; oxygen ${o.impacto_oxigeno}%; shielding ${o.impacto_escudo > 0 ? '+' : ''}${o.impacto_escudo}%.`
    : `Decisión aplicada. Energía ${o.impacto_energia > 0 ? '+' : ''}${o.impacto_energia} vatios; oxígeno ${o.impacto_oxigeno}%; escudo ${o.impacto_escudo > 0 ? '+' : ''}${o.impacto_escudo}%.` })) };
}
const componentPurpose = {
  es: { capsule: 'La cabina aloja a la tripulación.', solar: 'Los paneles solares alimentan los equipos.', oxygen: 'El sistema de soporte vital mantiene el aire de la cabina.', shield: 'El escudo protege la nave durante el viaje.', engine: 'El motor cambia el movimiento de la nave.', payload: 'La carga útil lleva los instrumentos científicos.' },
  en: { capsule: 'The cabin houses the crew.', solar: 'Solar panels power the equipment.', oxygen: 'Life support maintains the cabin air.', shield: 'The shield protects the spacecraft during the journey.', engine: 'The engine changes the motion of the ship.', payload: 'The payload carries the science instruments.' },
};
export function componentExplanation(component: SpacecraftComponent, profile: LearnerProfile | null, lang: 'es' | 'en' = 'es') {
  const purpose = componentPurpose[lang][component.category];
  return purpose + ' ' + adaptiveText(componentConcept[component.category], profile, lang);
}
