import type { AdaptiveKey } from './adaptive';
import type { Language } from '../i18n/I18nContext';

// Alternate wordings used by the simulator, indexed by the canonical glossary term.
export const glossaryAliases: Partial<Record<AdaptiveKey, Record<Language, string[]>>> = {
  'Balance energético': {
    es: ['balance de potencia', 'potencia neta', 'electricidad', 'vatios'],
    en: ['power balance', 'net power', 'electricity', 'watts'],
  },
  'Soporte vital': { es: ['sistema de soporte vital', 'reserva de oxígeno'], en: ['life support system', 'oxygen reserve'] },
  'TPS': { es: ['protección térmica', 'escudo térmico'], en: ['thermal protection', 'heat shield'] },
  'FRR': { es: ['revisión de preparación para el vuelo'], en: ['flight readiness review'] },
  'Órbita': { es: ['órbitas', 'trayectoria orbital'], en: ['orbits', 'orbital trajectory'] },
  'Radiación': { es: ['tormenta solar', 'partículas solares'], en: ['solar storm', 'solar particles'] },
  'Propulsión': { es: ['propulsión iónica'], en: ['ion propulsion'] },
};
