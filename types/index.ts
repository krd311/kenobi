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
  moonPhase: string;
  aboveHorizonDuringWindow: boolean;
}

export interface WeatherInfo {
  averageCloudCover: number;
  cloudCoverLabel: string;
  seeing: number;
  seeingLabel: string;
  transparency: number;
  transparencyLabel: string;
  precipitationType: "none" | "rain" | "snow";
  precipitationLabel: string;
  relativeHumidity: string;
  windDirection: string;
  windSpeed: number;
  windSpeedLabel: string;
  temperatureC: number;
  lowTemperatureC: number;
  highTemperatureC: number;
  liftedIndex: number;
  source: string;
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
