import { getLocalizedComponent as localizePart } from '../data/components';
import { Language } from './I18nContext';
import { MissionProfile, SpacecraftComponent } from '../types/mission';

export const MISSION_COPY: Record<
  Language,
  Record<
    string,
    {
      name: string;
      destination: string;
      badge: string;
      description: string;
      objective: string;
    }
  >
> = {
  es: {
    'artemis-lunar': {
      name: 'Misión Artemis IV: Órbita Lunar',
      destination: 'La Luna (Órbita NRHO)',
      badge: '🌙 Artemis',
      description:
        'Vuelo orbital y aproximación a la estación Lunar Gateway para probar sistemas de inserción translunar (TLI).',
      objective:
        'Establecer órbita de halo casi rectilínea y desplegar instrumental de cartografía de hielo de agua en los polos lunares.',
    },
    'mars-explorer-2026': {
      name: 'Misión Mars 2026: Explorador Marciano',
      destination: 'Marte (Planicie de Isidis)',
      badge: '🔴 Marte 2026',
      description:
        'Travesía interplanetaria de larga duración con paso por el cinturón de radiación interplanetaria.',
      objective:
        'Llegada a Marte y despliegue del rover geológico con soporte vital de circuito cerrado para supervivencia prolongada.',
    },
    'lagrange-deep-space': {
      name: 'Misión Observatorio Lagrange L2',
      destination: 'Punto de Lagrange Sol-Tierra L2',
      badge: '✨ Espacio Profundo',
      description:
        'Vuelo al punto de equilibrio gravitatorio donde la nave operará en condiciones térmicas extremas.',
      objective:
        'Calibrar instrumentos infrarrojos de alta resolución en la sombra perpetua de la Tierra.',
    },
  },
  en: {
    'artemis-lunar': {
      name: 'Artemis IV Mission: Lunar Orbit',
      destination: 'The Moon (NRHO Orbit)',
      badge: '🌙 Artemis',
      description:
        'Translunar flight and Lunar Gateway rendezvous to validate translunar injection (TLI) and NRHO station-keeping.',
      objective:
        'Capture into Near-Rectilinear Halo Orbit and deploy polar water-ice mapping instrumentation.',
    },
    'mars-explorer-2026': {
      name: 'Mars 2026 Mission: Martian Explorer',
      destination: 'Mars (Isidis Planitia)',
      badge: '🔴 Mars 2026',
      description:
        'Long-duration interplanetary transit through deep-space solar particle and galactic cosmic radiation belts.',
      objective:
        'Touch down on Mars and deploy the geological rover with closed-loop life support for extended surface ops.',
    },
    'lagrange-deep-space': {
      name: 'Lagrange L2 Observatory Mission',
      destination: 'Sun-Earth L2 Lagrange Point',
      badge: '✨ Deep Space',
      description:
        'Precision transfer to the gravitational equilibrium point where the observatory operates under cryogenic thermal extremes.',
      objective:
        'Phase-align segmented infrared optics and tension the thermal sunshield in deep space.',
    },
  },
};

export const COMPONENT_COPY: Record<
  Language,
  Record<
    string,
    {
      name: string;
      description: string;
    }
  >
> = {
  es: {
    'capsula-orion-jr': {
      name: 'Cápsula Tripulada Orión Jr.',
      description: 'Módulo cónico de titanio y fibra de carbono con capacidad para 2 astronautas.',
    },
    'modulo-apolo-nextgen': {
      name: 'Módulo de Mando Apolo NextGen',
      description: 'Diseño aerodinámico compacto y ligero optimizado para inserción orbital rápida.',
    },
    'cabina-dragon-explorer': {
      name: 'Cabina Espacial Dragón Explorer',
      description: 'Módulo presurizado espacioso con instrumentación de pantalla táctil y soporte vital redundante.',
    },
    'paneles-rosa-desplegables': {
      name: 'Arreglos Solares Enrollables (ROSA)',
      description: 'Mástiles de fibra de carbono que despliegan una manta fotovoltaica ultraligera.',
    },
    'paneles-ultraflex-triple': {
      name: 'Paneles Rígidos UltraFlex de Triple Unión',
      description: 'Alas circulares plegables de arseniuro de galio de altísima eficiencia.',
    },
    'micro-paneles-helio-silicio': {
      name: 'Micro-Paneles Compactos Helio-Silicio',
      description: 'Arreglos fijos para sondas compactas con baja huella de masa.',
    },
    'oxigeno-criogenico-doble': {
      name: 'Tanque Criogénico de Oxígeno Doble Etapa',
      description: 'Almacena oxígeno líquido (LOX) a -183°C con aislamiento al vacío multicapa.',
    },
    'sistema-eclss-regenerativo': {
      name: 'Sistema Regenerativo ECLSS (Reciclador O₂)',
      description: 'Recicla dióxido de carbono exhalado mediante electrólisis de agua y reactor Sabatier.',
    },
    'botellas-oxigeno-emergencia': {
      name: 'Botellas de Oxígeno Gaseoso de Emergencia',
      description: 'Cilindros de matriz de resina epoxi de alta presión para misiones cortas.',
    },
    'escudo-pica-x': {
      name: 'Escudo Ablativo PICA-X Reforzado',
      description: 'Carbono impregnado con resina fenólica resistente a temperaturas de reentrada de 2,700°C.',
    },
    'blindaje-polietileno-boro': {
      name: 'Blindaje Avanzado de Polietileno con Boro',
      description: 'Capas moleculares ricas en hidrógeno para frenar protones solares y rayos cósmicos.',
    },
    'malla-ceramica-ultraligera': {
      name: 'Malla Cerámica Ultra-Ligera TPS',
      description: 'Manta térmica de sílice diseñada para misiones de baja intensidad de flujo.',
    },
    'motor-pesado-raptor': {
      name: 'Motor Criogénico Pesado Raptor-Hydro',
      description: 'Motor de combustión escalonada metano/oxígeno con empuje masivo para cargas >1500 kg.',
    },
    'motor-bipropelente-merlin': {
      name: 'Motor Bipropelente de Empuje Medio Merlin-Deep',
      description: 'Motor versátil de queroseno y oxígeno líquido. Eficiente para naves de hasta 1500 kg.',
    },
    'propulsor-ionico-hall': {
      name: 'Propulsor Iónico de Efecto Hall (Xenón)',
      description: 'Acelera iones de xenón a 30 km/s. Impulso específico inmenso pero empuje instantáneo bajo (máx 1500 kg).',
    },
    'payload-rover-autonomo': {
      name: 'Rover Autónomo de Exploración Geológica',
      description: 'Vehículo robótico de 6 ruedas equipado con taladro percutor y espectrómetro Raman.',
    },
    'payload-radar-atmosferico': {
      name: 'Espectrómetro de Masas y Radar Subsuperficial',
      description: 'Instrumental de sondeo electromagnético para mapear capas de hielo y atmósfera.',
    },
    'payload-mini-telescopio': {
      name: 'Telescopio Espacial Mini-Infrarrojo',
      description: 'Óptica criogénica protegida para astrometría estelar y búsqueda de exoplanetas.',
    },
  },
  en: {
    'capsula-orion-jr': {
      name: 'Orion Jr. Crew Capsule',
      description: 'Conical titanium and carbon-composite crew module rated for 2 astronauts in deep space.',
    },
    'modulo-apolo-nextgen': {
      name: 'Apollo NextGen Command Module',
      description: 'Low-drag, lightweight aerodynamic command cone tuned for rapid orbital insertion.',
    },
    'cabina-dragon-explorer': {
      name: 'Dragon Explorer Crew Cabin',
      description: 'Spacious pressurized cabin with glass-cockpit avionics and dual-redundant life support.',
    },
    'paneles-rosa-desplegables': {
      name: 'Roll-Out Solar Arrays (ROSA)',
      description: 'Carbon-fiber booms deploying an ultralight flexible photovoltaic blanket.',
    },
    'paneles-ultraflex-triple': {
      name: 'UltraFlex Triple-Junction Arrays',
      description: 'High-efficiency deployable circular gallium-arsenide wings for deep-space insolation.',
    },
    'micro-paneles-helio-silicio': {
      name: 'Helio-Silicon Compact Micro-Arrays',
      description: 'Fixed low-mass solar panels engineered for lightweight technology demonstrator probes.',
    },
    'oxigeno-criogenico-doble': {
      name: 'Dual-Stage Cryogenic O₂ Tank',
      description: 'Stores liquid oxygen (LOX) at -183°C inside vacuum-jacketed multi-layer insulation.',
    },
    'sistema-eclss-regenerativo': {
      name: 'Regenerative ECLSS O₂ Loop',
      description: 'Recycles exhaled CO₂ via water electrolysis and a Sabatier chemical reactor.',
    },
    'botellas-oxigeno-emergencia': {
      name: 'High-Pressure Emergency O₂ Bottles',
      description: 'Epoxy-matrix high-pressure gaseous oxygen cylinders for short-duration sorties.',
    },
    'escudo-pica-x': {
      name: 'Reinforced PICA-X Ablative Heat Shield',
      description: 'Phenolic-impregnated carbon ablator rated for 2,700°C atmospheric entry heating.',
    },
    'blindaje-polietileno-boro': {
      name: 'Borated Polyethylene Radiation Shield',
      description: 'Hydrogen-rich molecular barrier engineered to attenuate solar protons and cosmic rays.',
    },
    'malla-ceramica-ultraligera': {
      name: 'Ultra-Light Ceramic TPS Blanket',
      description: 'Flexible silica thermal insulation blanket suited for low-heat-flux trajectories.',
    },
    'motor-pesado-raptor': {
      name: 'Raptor-Hydro Heavy Cryo Engine',
      description: 'Staged-combustion methalox booster delivering massive liftoff thrust for payloads >1500 kg.',
    },
    'motor-bipropelente-merlin': {
      name: 'Merlin-Deep Medium Bipropellant Engine',
      description: 'Reliable kerolox orbital engine optimized for spacecraft stacks up to 1500 kg.',
    },
    'propulsor-ionico-hall': {
      name: 'Xenon Hall-Effect Ion Thruster',
      description: 'Accelerates xenon plasma to 30 km/s. Exceptional specific impulse, low liftoff thrust (≤1500 kg).',
    },
    'payload-rover-autonomo': {
      name: 'Autonomous Geological Exploration Rover',
      description: '6-wheel rocker-bogie robotic rover carrying a rotary core drill and Raman spectrometer.',
    },
    'payload-radar-atmosferico': {
      name: 'Mass Spectrometer & Subsurface Radar',
      description: 'Electromagnetic sounding suite designed to map buried water-ice strata and volatiles.',
    },
    'payload-mini-telescopio': {
      name: 'Cryogenic Mini-Infrared Space Telescope',
      description: 'Actively shielded infrared optics for precision astrometry and exoplanet spectroscopy.',
    },
  },
};

export const PRESET_COPY: Record<Language, { name: string; desc: string }[]> = {
  es: [
    {
      name: '🚀 Configuración Equilibrada (Certificada)',
      desc: 'Diseño balanceado que cumple las 3 reglas de física de la NASA.',
    },
    {
      name: '⚠️ Trampa de Peso (>1500 kg sin Motor Pesado)',
      desc: 'Prueba la Regla 1: Supera 1500 kg con motor medio y provoca fallo de despegue.',
    },
    {
      name: '⚡ Trampa Energética (Déficit Solar)',
      desc: 'Prueba la Regla 2: Paneles insuficientes frente al consumo de los sistemas.',
    },
  ],
  en: [
    {
      name: '🚀 Balanced Baseline (Flight Certified)',
      desc: 'Nominal stack satisfying NASA mass, power, and life-support margins.',
    },
    {
      name: '⚠️ Mass Violation (>1500 kg, Medium Engine)',
      desc: 'Triggers Rule 1: Exceeds 1500 kg TWR limit without a heavy cryo booster.',
    },
    {
      name: '⚡ Power Deficit (Solar Shortfall)',
      desc: 'Triggers Rule 2: Solar generation falls short of active bus power draw.',
    },
  ],
};

export const MARS_SAMPLE_COPY: Record<
  Language,
  Record<string, { name: string; mineral: string; description: string }>
> = {
  es: {
    'sample-hematita': {
      name: 'Nódulo de Hematita ("Martian Blueberries")',
      mineral: 'Óxido de Hierro Fe₂O₃',
      description: 'Concreción esférica formada por precipitación en aguas subterráneas ácidas antiguas.',
    },
    'sample-yeso': {
      name: 'Vena de Yeso Hidratado',
      mineral: 'Sulfato de Calcio CaSO₄·2H₂O',
      description: 'Venas minerales blancas cristalizadas en fisuras por salmueras evaporíticas.',
    },
    'sample-filosilicatos': {
      name: 'Testigo de Esmectita Férmica',
      mineral: 'Arcilla de Silicato Hidratada',
      description: 'Mineral arcilloso formado en ambientes lacustres habitables de pH neutro.',
    },
  },
  en: {
    'sample-hematita': {
      name: 'Hematite Concretion ("Martian Blueberries")',
      mineral: 'Iron Oxide Fe₂O₃',
      description: 'Spherical mineral concretions precipitated in ancient acidic groundwater.',
    },
    'sample-yeso': {
      name: 'Hydrated Gypsum Mineral Vein',
      mineral: 'Calcium Sulfate CaSO₄·2H₂O',
      description: 'Bright white sulfate veins crystallized inside bedrock fractures by brines.',
    },
    'sample-filosilicatos': {
      name: 'Ferric Smectite Clay Core',
      mineral: 'Hydrated Phyllosilicate Clay',
      description: 'Clay mineral formed inside habitable neutral-pH ancient lakebed environments.',
    },
  },
};

export const MARS_OBSTACLE_NAMES: Record<Language, string[]> = {
  es: [
    'Formación Basáltica Alfa',
    'Afloramiento Rocoso Austral',
    'Cresta de Olivino Este',
    'Duna Transversal Consolidada',
    'Bloque de Eyección Primario',
    'Borde de Cráter Menor',
    'Depósito de Clastos Piroclásticos',
    'Monolito Basáltico Central',
    'Duna Longitudinal Isidis',
    'Fisura de Basalto Escoriáceo',
    'Cresta Arcillosa Deltaica',
    'Afloramiento Sedimentario',
    'Rocas de Impacto Metamórficas',
    'Escarpe Rocoso Meseta Norte',
    'Campo de Bloques Boreal',
  ],
  en: [
    'Alpha Basalt Outcrop',
    'Southern Bedrock Ridge',
    'East Olivine Crest',
    'Indurated Transverse Dune',
    'Primary Impact Ejecta Block',
    'Minor Crater Rim',
    'Pyroclastic Clast Deposit',
    'Central Basalt Monolith',
    'Isidis Longitudinal Dune',
    'Scoriaceous Basalt Fissure',
    'Deltaic Clay Ridge',
    'Sedimentary Outcrop',
    'Shocked Metamorphic Boulders',
    'Northern Plateau Escarpment',
    'Boreal Boulder Field',
  ],
};

export function getLocalizedMission(mission: MissionProfile, lang: Language) {
  return MISSION_COPY[lang][mission.id] || {
    name: mission.name,
    destination: mission.destination,
    badge: mission.badge,
    description: mission.description,
    objective: mission.objective,
  };
}

export function getLocalizedComponent(comp: SpacecraftComponent | undefined, lang: Language) {
  if (!comp) return { name: '', description: '', nasaLore: '' };
  const { name, description, nasaLore } = localizePart(comp, lang);
  return { ...(COMPONENT_COPY[lang][comp.id] ?? { name, description }), nasaLore };
}

export function getMarsSampleShortLabel(id: string, lang: Language): string {
  if (lang === 'en') {
    if (id === 'sample-hematita') return 'Hematite';
    if (id === 'sample-yeso') return 'Gypsum';
    return 'Clay';
  }
  if (id === 'sample-hematita') return 'Hematita';
  if (id === 'sample-yeso') return 'Yeso';
  return 'Arcilla';
}
