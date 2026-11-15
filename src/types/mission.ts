import type { EducationalContent } from './sources';

export interface SpacecraftComponent extends EducationalContent {
  name: string;
  category: 'capsule' | 'solar' | 'oxygen' | 'shield' | 'engine' | 'payload';
  description: string;
  weightKg: number;
  powerW: number; // positive = consumes power, negative = generates power
  costUSD: number;
  oxygenBonus?: number; // % added
  shieldBonus?: number; // % added
  isHeavyEngine?: boolean;
  scienceBonus?: number;
  nasaLore: string;
}

export interface MissionStats {
  weightKg: number;
  powerConsumedW: number;
  powerGeneratedW: number;
  netPowerW: number;
  budgetUSD: number;
  oxygenPercent: number;
  shieldHealthPercent: number;
  sciencePoints: number;
}

export interface MissionProfile {
  id: string;
  name: string;
  destination: string;
  badge: string;
  distanceKm: string;
  durationDays: number;
  minOxygen: number;
  minShield: number;
  maxBudget: number;
  description: string;
  objective: string;
  planetColor: string;
  textureType: 'moon' | 'mars' | 'deep_space';
}

export interface FlightReadinessReviewResult {
  aprobado: boolean;
  puntuacion_diseno: number;
  dictamen_tecnico: string;
  consejo_nasa: string;
}

export interface MissionEventOption {
  texto: string;
  impacto_energia: number;
  impacto_oxigeno: number;
  impacto_escudo: number;
  mensaje_resultado: string;
}

export interface MissionEvent extends EducationalContent {
  titulo_evento: string;
  descripcion: string;
  opciones: MissionEventOption[];
  dato_curioso_nasa: string;
}

export type GameState = 'TITLE' | 'HANGAR' | 'REVIEW' | 'LAUNCH' | 'FLIGHT' | 'EVENT' | 'DEBRIEF' | 'DESTINATION';

export interface ScientificInstrumentReading {
  id: string;
  name: string;
  category: string;
  value: string;
  unit: string;
  status: 'nominal' | 'optimal' | 'warning';
  nasaReference: string;
  description: string;
}

export interface SpectralDataPoint {
  wavelength: number | string;
  intensity: number;
  label?: string;
  compound?: string;
}

export interface DestinationChallengeResult {
  achieved: boolean;
  score: number; // 0 - 100
  title: string;
  notes: string;
  telemetrySummary: string;
}

export interface ScienceReportData {
  missionId: string;
  missionName: string;
  destination: string;
  payloadUsed: string;
  primaryDiscovery: string;
  summary: string;
  commsLatencySec: number;
  commsLatencyFormatted: string;
  environmentConditions: {
    temperature: string;
    pressure: string;
    radiation: string;
    solarFlux: string;
  };
  instrumentReadings: ScientificInstrumentReading[];
  spectralData: {
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    points: SpectralDataPoint[];
    keyFindings: string[];
  };
  nasaResearchSource: {
    repository: 'NASA OSDR' | 'NASA PDS' | 'NASA MAST / STScI' | 'NASA LRO / Diviner';
    recordId: string;
    title: string;
    url: string;
    realWorldFact: string;
  };
  physicalConstraints: {
    title: string;
    impact: string;
    engineeringMitigation: string;
  }[];
  challengeResult?: DestinationChallengeResult;
}

