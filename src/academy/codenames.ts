/** Public names come exclusively from this finite, reviewed vocabulary. */
export const SPACE_ADJECTIVES = [
  'Cósmico', 'Estelar', 'Galáctico', 'Lunar', 'Valiente', 'Solar', 'Orbital', 'Astral',
  'Radiante', 'Veloz', 'Audaz', 'Sereno', 'Brillante', 'Curioso', 'Polar', 'Celeste',
  'Dorado', 'Plateado', 'Infinito', 'Nebular', 'Fugaz', 'Magnético', 'Luminoso', 'Pionero',
] as const;
export const ASTRONOMICAL_NOUNS = [
  'Cometa', 'Astronauta', 'Púlsar', 'Asteroide', 'Cadete', 'Meteorito', 'Satélite', 'Planeta',
  'Quásar', 'Explorador', 'Cohete', 'Rover', 'Cráter', 'Cosmonauta', 'Telescopio', 'Lucero',
  'Cúmulo', 'Fotón', 'Neutrino', 'Observatorio', 'Navegante', 'Horizonte', 'Eclipse', 'Sol',
] as const;
export const THREE_DIGIT_NUMBERS = Array.from({ length: 900 }, (_, index) => String(index + 100));
export const CODENAME_CAPACITY = SPACE_ADJECTIVES.length * ASTRONOMICAL_NOUNS.length * THREE_DIGIT_NUMBERS.length;
export type Codename = string & { readonly __codename: unique symbol };
const prefixes = new Set(SPACE_ADJECTIVES.flatMap(a => ASTRONOMICAL_NOUNS.map(n => a + n)));

export function isCodename(value: unknown): value is Codename {
  if (typeof value !== 'string') return false;
  const match = /^([^_]+)_([1-9][0-9]{2})$/u.exec(value);
  return !!match && prefixes.has(match[1]);
}

/** Rejection sampling avoids modulo bias. No Math.random or identity-derived seeds. */
function secureInteger(limit: number): number {
  const ceiling = Math.floor(0x100000000 / limit) * limit;
  const bytes = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(bytes); } while (bytes[0] >= ceiling);
  return bytes[0] % limit;
}

export function generateCodename(taken: Iterable<string> = []): Codename {
  const reserved = new Set([...taken].filter(isCodename));
  if (reserved.size >= CODENAME_CAPACITY) throw new Error('No quedan nombres en clave disponibles.');
  for (let attempt = 0; attempt < 128; attempt++) {
    const name = `${SPACE_ADJECTIVES[secureInteger(SPACE_ADJECTIVES.length)]}${ASTRONOMICAL_NOUNS[secureInteger(ASTRONOMICAL_NOUNS.length)]}_${THREE_DIGIT_NUMBERS[secureInteger(THREE_DIGIT_NUMBERS.length)]}` as Codename;
    if (!reserved.has(name)) return name;
  }
  // Bounded fallback also works when many names have already been allocated.
  for (const adjective of SPACE_ADJECTIVES) for (const noun of ASTRONOMICAL_NOUNS) for (const number of THREE_DIGIT_NUMBERS) {
    const name = `${adjective}${noun}_${number}` as Codename;
    if (!reserved.has(name)) return name;
  }
  throw new Error('No quedan nombres en clave disponibles.');
}

export function createAnonymousId(): string {
  if (typeof globalThis.crypto.randomUUID === 'function') return globalThis.crypto.randomUUID();
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function isAnonymousId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
