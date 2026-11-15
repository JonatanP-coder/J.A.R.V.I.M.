import { nasa } from './nasaSources';
import { MissionProfile, SpacecraftComponent } from '../types/mission';

export const MISSIONS: MissionProfile[] = [
  {
    id: 'artemis-lunar',
    name: 'Misión Artemis IV: Órbita Lunar',
    destination: 'La Luna (Órbita NRHO)',
    badge: '🌙 Artemis',
    distanceKm: '384,400 km',
    durationDays: 6,
    minOxygen: 50,
    minShield: 45,
    maxBudget: 125000,
    description: 'Vuelo orbital y aproximación a la estación Lunar Gateway para probar sistemas de inserción translunar (TLI).',
    objective: 'Establecer órbita de halo casi rectilínea y desplegar instrumental de cartografía de hielo de agua en los polos lunares.',
    planetColor: '#c8cbd0',
    textureType: 'moon',
  },
  {
    id: 'mars-explorer-2026',
    name: 'Misión Mars 2026: Explorador Marciano',
    destination: 'Marte (Planicie de Isidis)',
    badge: '🔴 Marte 2026',
    distanceKm: '225,000,000 km',
    durationDays: 210,
    minOxygen: 75,
    minShield: 70,
    maxBudget: 160000,
    description: 'Travesía interplanetaria de larga duración con paso por el cinturón de radiación interplanetaria.',
    objective: 'Llegada a Marte y despliegue del rover geológico con soporte vital de circuito cerrado para supervivencia prolongada.',
    planetColor: '#d6683c',
    textureType: 'mars',
  },
  {
    id: 'lagrange-deep-space',
    name: 'Misión Observatorio Lagrange L2',
    destination: 'Punto de Lagrange Sol-Tierra L2',
    badge: '✨ Espacio Profundo',
    distanceKm: '1,500,000 km',
    durationDays: 30,
    minOxygen: 45,
    minShield: 55,
    maxBudget: 135000,
    description: 'Vuelo al punto de equilibrio gravitatorio donde la nave operará en condiciones térmicas extremas.',
    objective: 'Calibrar instrumentos infrarrojos de alta resolución en la sombra perpetua de la Tierra.',
    planetColor: '#5c769e',
    textureType: 'deep_space',
  },
];

export const COMPONENTS: SpacecraftComponent[] = [
  // 1. Módulos de Mando / Cabinas
  {
    id: 'capsula-orion-jr',
    name: 'Cápsula Tripulada Orión Jr.',
    category: 'capsule',
    description: 'Módulo cónico de titanio y fibra de carbono con capacidad para 2 astronautas.',
    weightKg: 420,
    powerW: 180,
    costUSD: 24000,
    oxygenBonus: 30,
    shieldBonus: 25,
    sources: [nasa.artemis],
    nasaLore: "En Artemis II, la cápsula Orión aloja a la tripulación durante el viaje alrededor de la Luna.",
  },
  {
    id: 'modulo-apolo-nextgen',
    name: 'Módulo de Mando Apolo NextGen',
    category: 'capsule',
    description: 'Diseño aerodinámico compacto y ligero optimizado para inserción orbital rápida.',
    weightKg: 310,
    powerW: 140,
    costUSD: 18000,
    oxygenBonus: 20,
    shieldBonus: 20,
    sources: [nasa.apollo],
    nasaLore: "El módulo de mando de Apolo alojaba a la tripulación y regresaba a la Tierra.",
  },
  {
    id: 'cabina-dragon-explorer',
    name: 'Cabina Espacial Dragón Explorer',
    category: 'capsule',
    description: 'Módulo presurizado espacioso con instrumentación de pantalla táctil y soporte vital redundante.',
    weightKg: 540,
    powerW: 240,
    costUSD: 31000,
    oxygenBonus: 45,
    shieldBonus: 35,
    sources: [nasa.dragon],
    nasaLore: "La nave comercial Dragon transporta astronautas a la Estación Espacial Internacional.",
  },

  // 2. Paneles Solares (Generación de Energía)
  {
    id: 'paneles-rosa-desplegables',
    name: 'Arreglos Solares Enrollables (ROSA)',
    category: 'solar',
    description: 'Mástiles de fibra de carbono que despliegan una manta fotovoltaica ultraligera.',
    weightKg: 110,
    powerW: -480, // Genera 480W
    costUSD: 15000,
    sources: [nasa.rosa],
    nasaLore: "Los paneles solares enrollables ROSA se demostraron en la estación espacial y volaron en la misión DART.",
  },
  {
    id: 'paneles-ultraflex-triple',
    name: 'Paneles Rígidos UltraFlex de Triple Unión',
    category: 'solar',
    description: 'Alas circulares plegables de arseniuro de galio de altísima eficiencia.',
    weightKg: 190,
    powerW: -750, // Genera 750W
    costUSD: 26000,
    sources: [nasa.lucy],
    nasaLore: "La nave Lucy usa dos grandes paneles solares circulares para alimentar sus instrumentos lejos del Sol.",
  },
  {
    id: 'micro-paneles-helio-silicio',
    name: 'Micro-Paneles Compactos Helio-Silicio',
    category: 'solar',
    description: 'Arreglos fijos para sondas compactas con baja huella de masa.',
    weightKg: 55,
    powerW: -240, // Genera 240W
    costUSD: 9000,
    sources: [nasa.power],
    nasaLore: "Las naves pequeñas pueden llevar celdas solares en su estructura o en paneles desplegables.",
  },

  // 3. Tanques de O2 y Soporte Vital
  {
    id: 'oxigeno-criogenico-doble',
    name: 'Tanque Criogénico de Oxígeno Doble Etapa',
    category: 'oxygen',
    description: 'Almacena oxígeno líquido (LOX) a -183°C con aislamiento al vacío multicapa.',
    weightKg: 220,
    powerW: 60,
    costUSD: 14000,
    oxygenBonus: 45,
    sources: [nasa.apolloReview],
    nasaLore: "El módulo de servicio de Apolo 13 almacenaba oxígeno en tanques criogénicos.",
  },
  {
    id: 'sistema-eclss-regenerativo',
    name: 'Sistema Regenerativo ECLSS (Reciclador O₂)',
    category: 'oxygen',
    description: 'Recicla dióxido de carbono exhalado mediante electrólisis de agua y reactor Sabatier.',
    weightKg: 340,
    powerW: 130,
    costUSD: 27000,
    oxygenBonus: 65,
    sources: [nasa.water, nasa.eclss],
    nasaLore: "La estación espacial demostró que su sistema podía recuperar el 98 % del agua. Otro subsistema produce oxígeno mediante electrólisis.",
  },
  {
    id: 'botellas-oxigeno-emergencia',
    name: 'Botellas de Oxígeno Gaseoso de Emergencia',
    category: 'oxygen',
    description: 'Cilindros de matriz de resina epoxi de alta presión para misiones cortas.',
    weightKg: 90,
    powerW: 20,
    costUSD: 7500,
    oxygenBonus: 25,
    sources: [nasa.emu],
    nasaLore: "El traje EMU del transbordador llevaba una reserva secundaria de oxígeno para emergencias.",
  },

  // 4. Escudo Térmico y Blindaje contra Radiación
  {
    id: 'escudo-pica-x',
    name: 'Escudo Ablativo PICA-X Reforzado',
    category: 'shield',
    description: 'Carbono impregnado con resina fenólica resistente a temperaturas de reentrada de 2,700°C.',
    weightKg: 190,
    powerW: 10,
    costUSD: 13000,
    shieldBonus: 35,
    sources: [nasa.pica],
    nasaLore: "La NASA desarrolló el material ablativo PICA para proteger a Stardust durante su regreso a la Tierra.",
  },
  {
    id: 'blindaje-polietileno-boro',
    name: 'Blindaje Avanzado de Polietileno con Boro',
    category: 'shield',
    description: 'Capas moleculares ricas en hidrógeno para frenar protones solares y rayos cósmicos.',
    weightKg: 360,
    powerW: 25,
    costUSD: 24000,
    shieldBonus: 55,
    sources: [nasa.radiation],
    nasaLore: "La NASA estudia materiales ricos en hidrógeno, como el polietileno, para reducir la exposición a la radiación espacial.",
  },
  {
    id: 'malla-ceramica-ultraligera',
    name: 'Malla Cerámica Ultra-Ligera TPS',
    category: 'shield',
    description: 'Manta térmica de sílice diseñada para misiones de baja intensidad de flujo.',
    weightKg: 80,
    powerW: 5,
    costUSD: 6500,
    shieldBonus: 20,
    sources: [nasa.tiles],
    nasaLore: "Las losetas de sílice formaban parte de la protección térmica del transbordador espacial.",
  },

  // 5. Motores y Propulsión
  {
    id: 'motor-pesado-raptor',
    name: 'Motor Criogénico Pesado Raptor-Hydro',
    category: 'engine',
    description: 'Motor de combustión escalonada metano/oxígeno con empuje masivo para cargas >1500 kg.',
    weightKg: 460,
    powerW: 110,
    costUSD: 34000,
    isHeavyEngine: true,
    sources: [nasa.twr],
    nasaLore: "Para iniciar un ascenso vertical, el empuje de un cohete debe superar su peso. El peso depende de la gravedad local.",
  },
  {
    id: 'motor-bipropelente-merlin',
    name: 'Motor Bipropelente de Empuje Medio Merlin-Deep',
    category: 'engine',
    description: 'Motor versátil de queroseno y oxígeno líquido. Eficiente para naves de hasta 1500 kg.',
    weightKg: 250,
    powerW: 80,
    costUSD: 19000,
    isHeavyEngine: false,
    sources: [nasa.thrust],
    nasaLore: "La tobera acelera los gases de escape. El caudal de gas, su velocidad de salida y la presión influyen en el empuje.",
  },
  {
    id: 'propulsor-ionico-hall',
    name: 'Propulsor Iónico de Efecto Hall (Xenón)',
    category: 'engine',
    description: 'Acelera iones de xenón a 30 km/s. Impulso específico inmenso pero empuje instantáneo bajo (máx 1500 kg).',
    weightKg: 130,
    powerW: 260,
    costUSD: 22000,
    isHeavyEngine: false,
    sources: [nasa.dawn],
    nasaLore: "Dawn usó propulsión iónica para orbitar Vesta y después Ceres.",
  },

  // 6. Carga Útil Científica (Payload)
  {
    id: 'payload-rover-autonomo',
    name: 'Rover Autónomo de Exploración Geológica',
    category: 'payload',
    description: 'Vehículo robótico de 6 ruedas equipado con taladro percutor y espectrómetro Raman.',
    weightKg: 210,
    powerW: 90,
    costUSD: 18000,
    scienceBonus: 40,
    sources: [nasa.perseverance],
    nasaLore: "Perseverance investiga indicios de vida microbiana antigua en Marte y recoge muestras de roca.",
  },
  {
    id: 'payload-radar-atmosferico',
    name: 'Espectrómetro de Masas y Radar Subsuperficial',
    category: 'payload',
    description: 'Instrumental de sondeo electromagnético para mapear capas de hielo y atmósfera.',
    weightKg: 120,
    powerW: 60,
    costUSD: 12000,
    scienceBonus: 25,
    sources: [nasa.sharad],
    nasaLore: "El radar SHARAD de la Mars Reconnaissance Orbiter sondea el subsuelo marciano en busca de capas de hielo y roca.",
  },
  {
    id: 'payload-mini-telescopio',
    name: 'Telescopio Espacial Mini-Infrarrojo',
    category: 'payload',
    description: 'Óptica criogénica protegida para astrometría estelar y búsqueda de exoplanetas.',
    weightKg: 160,
    powerW: 80,
    costUSD: 16000,
    scienceBonus: 35,
    sources: [nasa.webb],
    nasaLore: "Los espejos de berilio del telescopio Webb llevan una fina capa de oro que refleja la luz infrarroja.",
  },
];

export const PRESET_CONFIGS = [
  {
    name: '🚀 Configuración Equilibrada (Certificada)',
    desc: 'Diseño balanceado que cumple las 3 reglas de física de la NASA.',
    components: {
      capsule: 'capsula-orion-jr',
      solar: 'paneles-rosa-desplegables',
      oxygen: 'oxigeno-criogenico-doble',
      shield: 'escudo-pica-x',
      engine: 'motor-pesado-raptor',
      payload: 'payload-radar-atmosferico',
    },
  },
  {
    name: '⚠️ Trampa de Peso (>1500 kg sin Motor Pesado)',
    desc: 'Prueba la Regla 1: Supera 1500 kg con motor medio y provoca fallo de despegue.',
    components: {
      capsule: 'cabina-dragon-explorer', // 540kg
      solar: 'paneles-ultraflex-triple', // 190kg
      oxygen: 'sistema-eclss-regenerativo', // 340kg
      shield: 'blindaje-polietileno-boro', // 360kg
      engine: 'motor-bipropelente-merlin', // 250kg (NO pesado, total > 1680 kg!)
      payload: 'payload-rover-autonomo', // 210kg
    },
  },
  {
    name: '⚡ Trampa Energética (Déficit Solar)',
    desc: 'Prueba la Regla 2: Paneles insuficientes frente al consumo de los sistemas.',
    components: {
      capsule: 'cabina-dragon-explorer', // 240W
      solar: 'micro-paneles-helio-silicio', // solo genera 240W
      oxygen: 'sistema-eclss-regenerativo', // 130W
      shield: 'blindaje-polietileno-boro', // 25W
      engine: 'propulsor-ionico-hall', // 260W
      payload: 'payload-mini-telescopio', // 80W (Consumo total > 735W vs 240W generados)
    },
  },
];

const MISSION_EN: Record<
  string,
  Pick<MissionProfile, 'name' | 'destination' | 'badge' | 'description' | 'objective'>
> = {
  'artemis-lunar': {
    name: 'Artemis IV Mission: Lunar Orbit',
    destination: 'The Moon (NRHO Orbit)',
    badge: '🌙 Artemis',
    description:
      'Translunar injection (TLI) and orbital rendezvous toward the Lunar Gateway station.',
    objective:
      'Establish a Near-Rectilinear Halo Orbit (NRHO) and deploy South Pole water-ice mapping sensors.',
  },
  'mars-explorer-2026': {
    name: 'Mars 2026 Mission: Mars Explorer',
    destination: 'Mars (Isidis Planitia)',
    badge: '🔴 Mars 2026',
    description:
      'Long-duration interplanetary transit across the deep-space radiation belt.',
    objective:
      'Land on Mars and deploy the geological rover with closed-loop life support for extended surface ops.',
  },
  'lagrange-deep-space': {
    name: 'Lagrange L2 Observatory Mission',
    destination: 'Sun-Earth Lagrange Point L2',
    badge: '✨ Deep Space',
    description:
      'Flight to the gravitational equilibrium point under extreme thermal gradients.',
    objective:
      'Co-phase cryogenic infrared optics inside Earth-Sun thermal shadow.',
  },
};

const COMPONENT_EN: Record<
  string,
  Pick<SpacecraftComponent, 'name' | 'description' | 'nasaLore'>
> = {
  'capsula-orion-jr': {
    name: 'Orion Jr. Crew Capsule',
    description: 'Conical titanium and carbon-fiber crew module rated for 2 astronauts.',
    nasaLore: "On Artemis II, the Orion crew module houses the crew on the journey around the Moon.",
  },
  'modulo-apolo-nextgen': {
    name: 'Apollo NextGen Command Module',
    description: 'Compact, lightweight aerodynamic pressure vessel tuned for rapid orbital insertion.',
    nasaLore: "The Apollo command module housed the crew and returned to Earth.",
  },
  'cabina-dragon-explorer': {
    name: 'Dragon Explorer Crew Cabin',
    description: 'Spacious pressurized habitat featuring touchscreen flight deck and redundant ECLSS.',
    nasaLore: "The commercial Dragon spacecraft carries astronauts to the International Space Station.",
  },
  'paneles-rosa-desplegables': {
    name: 'Roll-Out Solar Arrays (ROSA)',
    description: 'Carbon-fiber booms deploying an ultralight flexible photovoltaic blanket.',
    nasaLore: "Roll-out solar arrays were demonstrated on the space station and flew on the DART mission.",
  },
  'paneles-ultraflex-triple': {
    name: 'UltraFlex Triple-Junction Arrays',
    description: 'Circular folding gallium-arsenide wings delivering high solar conversion efficiency.',
    nasaLore: "Lucy uses two large circular solar arrays to power its instruments far from the Sun.",
  },
  'micro-paneles-helio-silicio': {
    name: 'Compact Helio-Silicon Micro-Arrays',
    description: 'Fixed compact solar panels with minimal mass footprint for small probes.',
    nasaLore: "Small spacecraft can carry solar cells on their body or on deployable arrays.",
  },
  'oxigeno-criogenico-doble': {
    name: 'Dual-Stage Cryogenic LOX Tank',
    description: 'Stores liquid oxygen at -183 °C with multi-layer vacuum insulation (MLI).',
    nasaLore: "The Apollo 13 service module stored oxygen in cryogenic tanks.",
  },
  'sistema-eclss-regenerativo': {
    name: 'Regenerative ECLSS (O₂ Scrubber)',
    description: 'Recovers oxygen from exhaled CO₂ via water electrolysis and a Sabatier reactor.',
    nasaLore: "The space station demonstrated 98% water recovery. A separate subsystem produces oxygen by electrolysis.",
  },
  'botellas-oxigeno-emergencia': {
    name: 'High-Pressure Gaseous O₂ Bottles',
    description: 'Epoxy-matrix composite cylinders sized for short-duration orbital flights.',
    nasaLore: "The shuttle EMU spacesuit carried a secondary oxygen supply for emergencies.",
  },
  'escudo-pica-x': {
    name: 'Reinforced PICA-X Ablative Shield',
    description: 'Phenolic-impregnated carbon ablator rated for 2,700 °C atmospheric entry heating.',
    nasaLore: "NASA developed the PICA ablator to protect Stardust during its return to Earth.",
  },
  'blindaje-polietileno-boro': {
    name: 'Borated Polyethylene Radiation Shield',
    description: 'Hydrogen-rich molecular layering that attenuates solar protons and cosmic rays.',
    nasaLore: "NASA studies hydrogen-rich materials such as polyethylene to reduce exposure to space radiation.",
  },
  'malla-ceramica-ultraligera': {
    name: 'Ultralight Ceramic TPS Blanket',
    description: 'Silica thermal protection tiles engineered for low-heat-flux trajectories.',
    nasaLore: "Silica tiles formed part of the Space Shuttle thermal protection system.",
  },
  'motor-pesado-raptor': {
    name: 'Raptor-Hydro Heavy Cryogenic Engine',
    description: 'Staged-combustion methalox engine delivering heavy-lift thrust for stacks >1500 kg.',
    nasaLore: "To begin a vertical ascent, a rocket must produce more thrust than its weight. Weight depends on local gravity.",
  },
  'motor-bipropelente-merlin': {
    name: 'Merlin-Deep Mid-Thrust Bipropellant',
    description: 'Reliable kerolox engine sized for spacecraft stacks up to 1500 kg.',
    nasaLore: "The nozzle accelerates exhaust gas. Mass flow, exit speed and pressure contribute to thrust.",
  },
  'propulsor-ionico-hall': {
    name: 'Hall-Effect Xenon Ion Thruster',
    description: 'Accelerates xenon ions to 30 km/s; extreme Isp efficiency but low thrust (max 1500 kg).',
    nasaLore: "Dawn used ion propulsion to orbit Vesta and then Ceres.",
  },
  'payload-rover-autonomo': {
    name: 'Autonomous Geological Exploration Rover',
    description: '6-wheel mobility platform carrying a rotary core drill and Raman spectrometer.',
    nasaLore: "Perseverance investigates signs of ancient microbial life on Mars and collects rock samples.",
  },
  'payload-radar-atmosferico': {
    name: 'Mass Spectrometer & Subsurface Radar',
    description: 'Electromagnetic sounding suite for mapping buried ice strata and trace gases.',
    nasaLore: "The SHARAD radar on Mars Reconnaissance Orbiter probes below the Martian surface for layers of ice and rock.",
  },
  'payload-mini-telescopio': {
    name: 'Cryogenic Mini-IR Space Telescope',
    description: 'Shielded infrared optics built for stellar astrometry and exoplanet spectroscopy.',
    nasaLore: "Webb’s beryllium mirrors have a thin gold coating that reflects infrared light.",
  },
};

const PRESET_EN = [
  {
    name: '🚀 Balanced Baseline (Flight-Certified)',
    desc: 'Well-balanced stack complying with all 3 NASA engineering rules.',
  },
  {
    name: '⚠️ Mass Trap (>1500 kg without Heavy Engine)',
    desc: 'Tests Rule 1: Exceeds 1500 kg with a mid-thrust engine, triggering FRR scrub.',
  },
  {
    name: '⚡ Power Deficit Trap (Solar Shortfall)',
    desc: 'Tests Rule 2: Solar output falls below total avionics and thruster draw.',
  },
];

export function getLocalizedMission(mission: MissionProfile, lang: 'es' | 'en'): MissionProfile {
  if (lang === 'es') return mission;
  const tr = MISSION_EN[mission.id];
  return tr ? { ...mission, ...tr } : mission;
}

export function getLocalizedMissions(lang: 'es' | 'en'): MissionProfile[] {
  return MISSIONS.map((m) => getLocalizedMission(m, lang));
}

export function getLocalizedComponent(comp: SpacecraftComponent, lang: 'es' | 'en'): SpacecraftComponent {
  if (lang === 'es') return comp;
  const tr = COMPONENT_EN[comp.id];
  return tr ? { ...comp, ...tr } : comp;
}

export function getLocalizedComponents(lang: 'es' | 'en'): SpacecraftComponent[] {
  return COMPONENTS.map((c) => getLocalizedComponent(c, lang));
}

export function getLocalizedPresets(lang: 'es' | 'en') {
  if (lang === 'es') return PRESET_CONFIGS;
  return PRESET_CONFIGS.map((p, idx) => ({
    ...p,
    name: PRESET_EN[idx]?.name ?? p.name,
    desc: PRESET_EN[idx]?.desc ?? p.desc,
  }));
}

