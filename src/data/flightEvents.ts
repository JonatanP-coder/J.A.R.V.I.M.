import { nasa } from './nasaSources';
import type { MissionEvent } from '../types/mission';

const eventSources = {
  'solar-storm': [nasa.artemis, nasa.radiation, nasa.dose],
  'micrometeoroids': [nasa.whipple],
  'oxygen-regulator': [nasa.apollo, nasa.apolloReview],
  'signal-loss': [nasa.dsn, nasa.comms, nasa.delay],
  'gravity-assist': [nasa.gravityAssist],
} as const;

export const NASA_FLIGHT_EVENTS_ES = [
  {
    id: 'solar-storm',
    sources: eventSources['solar-storm'],
    titulo_evento: "Tormenta de Radiación Solar (CME)",
    descripcion: "El Observatorio de Dinámica Solar (SDO) detecta una eyección de masa coronal dirigida hacia nuestra trayectoria. El flujo de protones amenaza los sistemas de a bordo.",
    opciones: [
      {
        texto: "Opción A: Orientar escudo térmico y blindaje hacia el Sol",
        impacto_energia: -10,
        impacto_oxigeno: 0,
        impacto_escudo: +10,
        mensaje_resultado: "El blindaje absorbió la ráfaga de partículas energéticas protegiendo a la tripulación con una mínima desviación de energía."
      },
      {
        texto: "Opción B: Desactivar instrumental científico y replegar paneles",
        impacto_energia: +15,
        impacto_oxigeno: -5,
        impacto_escudo: -5,
        mensaje_resultado: "Se conservó reserva en los acumuladores de energía, pero el flujo residual desgastó ligeramente la superficie externa."
      }
    ],
    dato_curioso_nasa: "En Orión, la tripulación puede colocar bolsas de suministros entre su refugio y la fuente de radiación durante una tormenta solar."
  },
  {
    id: 'micrometeoroids',
    sources: eventSources['micrometeoroids'],
    titulo_evento: "Nube de Micrometeoroides de Alta Velocidad",
    descripcion: "El radar de seguimiento advierte fragmentos de polvo cometario cruzando el vector de avance a más de 30 km/s. Se activa la alarma de impacto inminente.",
    opciones: [
      {
        texto: "Opción A: Encendido RCS de evasión rápida",
        impacto_energia: -15,
        impacto_oxigeno: 0,
        impacto_escudo: +15,
        mensaje_resultado: "Maniobra limpia: los propulsores desviaron la nave fuera del cono denso del enjambre evitando daños por colisión."
      },
      {
        texto: "Opción B: Mantener rumbo y activar campos de protección Whipple",
        impacto_energia: -5,
        impacto_oxigeno: 0,
        impacto_escudo: -10,
        mensaje_resultado: "Las múltiples láminas del escudo Whipple fragmentaron las micropartículas, con un desgaste moderado del recubrimiento exterior."
      }
    ],
    dato_curioso_nasa: "El escudo Whipple tiene una barrera exterior que fragmenta el objeto. La nube de fragmentos distribuye el impacto sobre una zona mayor de la pared interior."
  },
  {
    id: 'oxygen-regulator',
    sources: eventSources['oxygen-regulator'],
    titulo_evento: "Anomalía en Regulador del Módulo Criogénico de O₂",
    descripcion: "La telemetría indica un aumento leve de presión en la válvula de desgasificación del tanque de oxígeno primario. El soporte vital requiere ajuste manual.",
    opciones: [
      {
        texto: "Opción A: Purgar circuito secundario y presurizar con nitrógeno",
        impacto_energia: -10,
        impacto_oxigeno: +10,
        impacto_escudo: 0,
        mensaje_resultado: "Presión estabilizada a 1 atmósfera estándar con mezcla respirable perfecta para la cabina."
      },
      {
        texto: "Opción B: Reciclar vapor a través del sistema ECLSS de circuito cerrado",
        impacto_energia: -20,
        impacto_oxigeno: +15,
        impacto_escudo: 0,
        mensaje_resultado: "Máxima recuperación de gas con alto consumo eléctrico en los compresores moleculares."
      }
    ],
    dato_curioso_nasa: "Tras el fallo de un tanque de oxígeno en Apolo 13, la tripulación utilizó el módulo lunar como refugio para regresar a la Tierra."
  },
  {
    id: 'signal-loss',
    sources: eventSources['signal-loss'],
    titulo_evento: "Pérdida Transitoria de Bloqueo de Antena de Espacio Profundo (DSN)",
    descripcion: "Al cruzar la sombra electromagnética, se pierde la señal de telemetría de la Red del Espacio Profundo de Goldstone. Debemos decidir la estrategia de orientación.",
    opciones: [
      {
        texto: "Opción A: Algoritmo de re-búsqueda estelar con sensores de alta potencia",
        impacto_energia: -15,
        impacto_oxigeno: 0,
        impacto_escudo: +5,
        mensaje_resultado: "Bloqueo de señal restaurado en 90 segundos con enlace gigabit hacia el Centro de Control de Houston."
      },
      {
        texto: "Opción B: Entrar en modo inercial pasivo y esperar señal de Madrid DSN",
        impacto_energia: +10,
        impacto_oxigeno: -5,
        impacto_escudo: 0,
        mensaje_resultado: "Ahorro de energía en propulsión mientras se restableció la señal con una pequeña demora operativa."
      }
    ],
    dato_curioso_nasa: "La Red del Espacio Profundo tiene estaciones en California, España y Australia. Su distribución permite seguir las naves mientras gira la Tierra."
  },
  {
    id: 'gravity-assist',
    sources: eventSources['gravity-assist'],
    titulo_evento: "Oportunidad Científica: Maniobra de Asistencia Gravitatoria",
    descripcion: "El equipo de dinámica orbital detecta una ventana precisa para efectuar un sobrevuelo rasante (slingshot) que acelerará la nave y permitirá cartografiar un cráter inexplorado.",
    opciones: [
      {
        texto: "Opción A: Ejecutar maniobra de asistencia gravitatoria completa",
        impacto_energia: -10,
        impacto_oxigeno: 0,
        impacto_escudo: +10,
        mensaje_resultado: "Incremento delta-V gratuito aprovechando la gravedad planetaria, enviando valiosos datos científicos a la Tierra."
      },
      {
        texto: "Opción B: Mantener trayectoria conservadora directa sin sobrevolar",
        impacto_energia: +5,
        impacto_oxigeno: 0,
        impacto_escudo: -5,
        mensaje_resultado: "Rumbo seguro mantenido con cero riesgo de fricción gravitatoria ni turbulencia magnetosférica."
      }
    ],
    dato_curioso_nasa: "Voyager 2 aprovechó la gravedad de Júpiter para dirigir su trayectoria hacia Saturno."
  }
] satisfies (MissionEvent & { id: keyof typeof eventSources })[];

export const NASA_FLIGHT_EVENTS_EN = [
  {
    id: 'solar-storm',
    sources: eventSources['solar-storm'],
    titulo_evento: "Solar Radiation Storm (CME Alert)",
    descripcion: "NASA's Solar Dynamics Observatory (SDO) detected a coronal mass ejection intersecting our transit corridor. High-energy proton flux threatens onboard avionics.",
    opciones: [
      {
        texto: "Option A: Attitude-slew heat shield and radiation barrier sunward",
        impacto_energia: -10,
        impacto_oxigeno: 0,
        impacto_escudo: +10,
        mensaje_resultado: "Primary shielding absorbed the solar particle burst, keeping the crew compartment safe with minimal bus power draw."
      },
      {
        texto: "Option B: Power down science suite and feather solar arrays",
        impacto_energia: +15,
        impacto_oxigeno: -5,
        impacto_escudo: -5,
        mensaje_resultado: "Battery reserve margins increased, though residual particle flux slightly abraded exterior thermal coatings."
      }
    ],
    dato_curioso_nasa: "During a solar particle event, Orion crew members can place stowage bags between their shelter and the radiation source."
  },
  {
    id: 'micrometeoroids',
    sources: eventSources['micrometeoroids'],
    titulo_evento: "High-Velocity Micrometeoroid Stream",
    descripcion: "Tracking radar detects cometary dust debris crossing our flight vector above 30 km/s. Collision warning alarms are active.",
    opciones: [
      {
        texto: "Option A: Execute rapid RCS translational evasion burn",
        impacto_energia: -15,
        impacto_oxigeno: 0,
        impacto_escudo: +15,
        mensaje_resultado: "Clean thruster maneuver steered the spacecraft outside the dense debris stream with zero hull strikes."
      },
      {
        texto: "Option B: Hold inertial attitude and rely on Whipple bumper shields",
        impacto_energia: -5,
        impacto_oxigeno: 0,
        impacto_escudo: -10,
        mensaje_resultado: "Multi-layer Whipple bumpers vaporized incoming grains with moderate outer-blanket wear."
      }
    ],
    dato_curioso_nasa: "A Whipple shield has an outer bumper that breaks up an incoming object. The fragment cloud spreads the impact over a larger area of the inner wall."
  },
  {
    id: 'oxygen-regulator',
    sources: eventSources['oxygen-regulator'],
    titulo_evento: "Cryogenic O₂ Tank Regulator Pressure Drift",
    descripcion: "Telemetry flags a slight pressure rise in the primary liquid-oxygen boil-off relief valve. Environmental life support requires manual balancing.",
    opciones: [
      {
        texto: "Option A: Purge secondary manifold and balance with N₂ buffer",
        impacto_energia: -10,
        impacto_oxigeno: +10,
        impacto_escudo: 0,
        mensaje_resultado: "Cabin pressure stabilized at 101.3 kPa with nominal oxygen partial pressure."
      },
      {
        texto: "Option B: Route excess boil-off through closed-loop ECLSS scrubbers",
        impacto_energia: -20,
        impacto_oxigeno: +15,
        impacto_escudo: 0,
        mensaje_resultado: "Maximum oxygen recovery achieved at the cost of higher molecular-compressor power draw."
      }
    ],
    dato_curioso_nasa: "After an oxygen tank failed on Apollo 13, the crew used the lunar module as a lifeboat on the way back to Earth."
  },
  {
    id: 'signal-loss',
    sources: eventSources['signal-loss'],
    titulo_evento: "Transient Deep Space Network (DSN) Carrier Loss",
    descripcion: "Passing through electromagnetic interference temporarily dropped Goldstone telemetry lock. Select an antenna re-acquisition mode.",
    opciones: [
      {
        texto: "Option A: Run high-gain star-tracker acquisition sweep",
        impacto_energia: -15,
        impacto_oxigeno: 0,
        impacto_escudo: +5,
        mensaje_resultado: "Carrier lock restored within 90 seconds with full Ka-band telemetry down to Houston Mission Control."
      },
      {
        texto: "Option B: Enter passive spin-stabilized coast for Madrid DSN handover",
        impacto_energia: +10,
        impacto_oxigeno: -5,
        impacto_escudo: 0,
        mensaje_resultado: "Conserved attitude-control energy while awaiting scheduled Madrid 70-meter dish handover."
      }
    ],
    dato_curioso_nasa: "The Deep Space Network has complexes in California, Spain and Australia. Their spacing allows spacecraft tracking as Earth rotates."
  },
  {
    id: 'gravity-assist',
    sources: eventSources['gravity-assist'],
    titulo_evento: "Science Window: Gravity-Assist Slingshot Opportunity",
    descripcion: "Flight dynamics identified a precision flyby corridor offering free delta-V acceleration and high-resolution crater mapping.",
    opciones: [
      {
        texto: "Option A: Execute full gravity-assist flyby trim maneuver",
        impacto_energia: -10,
        impacto_oxigeno: 0,
        impacto_escudo: +10,
        mensaje_resultado: "Captured free orbital delta-V via planetary gravity while downlinking high-value science spectra."
      },
      {
        texto: "Option B: Maintain conservative direct cruise trajectory",
        impacto_energia: +5,
        impacto_oxigeno: 0,
        impacto_escudo: -5,
        mensaje_resultado: "Nominal cruise heading held with zero magnetospheric drag or thermal exposure."
      }
    ],
    dato_curioso_nasa: "Voyager 2 used Jupiter’s gravity to redirect its path toward Saturn."
  }
] satisfies (MissionEvent & { id: keyof typeof eventSources })[];

