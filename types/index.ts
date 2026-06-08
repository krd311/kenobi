export interface Location {
  name: string;
  latitude: number;
  longitude: number;
}

export interface SunInfo {
  sunset: string;
  astronomicalDusk: string;
}

export interface MoonInfo {
  illumination: number;
  moonrise: string | null;
  moonset: string | null;
  aboveHorizonDuringWindow: boolean;
}

export interface WeatherInfo {
  averageCloudCover: number;
}

export interface LightPollutionInfo {
  available: boolean;
  bortleClass: number | null;
  sqm: number | null;
  artificialBrightnessRatio: number | null;
  qualityLabel: string;
  source: string;
  note?: string;
}

export interface ScoreInfo {
  value: number;
  reasons: string[];
}

export interface EvaluateResponse {
  location: Location;
  sun: SunInfo;
  moon: MoonInfo;
  weather: WeatherInfo;
  lightPollution: LightPollutionInfo;
  score: ScoreInfo;
}

export interface EvaluateRequest {
  city?: string;
  latitude?: number;
  longitude?: number;
  date?: string;
}
