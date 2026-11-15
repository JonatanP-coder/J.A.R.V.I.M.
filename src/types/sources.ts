export interface NasaSource {
  id: string;
  title: string;
  organization: string;
  url: string;
  category: 'mision' | 'ingenieria' | 'ciencia' | 'telemetria';
  verifiedYear: number;
}

export interface EducationalContent {
  id: string;
  sources: readonly [NasaSource, ...NasaSource[]];
}
