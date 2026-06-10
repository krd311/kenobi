import { WeatherInfo } from "@/types";

interface SevenTimerWind {
  direction: string;
  speed: number;
}

interface SevenTimerAstroPoint {
  timepoint: number;
  cloudcover: number;
  seeing: number;
  transparency: number;
  lifted_index: number;
  rh2m: number;
  wind10m: SevenTimerWind;
  temp2m: number;
  prec_type: "none" | "rain" | "snow";
}

interface SevenTimerAstroResponse {
  product?: string;
  init?: string;
  dataseries?: SevenTimerAstroPoint[];
}

const MAX_FORECAST_DAYS_AHEAD = 2;
const HOURS_PER_DAY = 24;
const OBSERVING_WINDOW_START_HOUR = 20;
const OBSERVING_WINDOW_END_HOUR = 2;

const CLOUD_COVER_PERCENT_BY_BUCKET: Record<number, number> = {
  1: 3,
  2: 12.5,
  3: 25,
  4: 37.5,
  5: 50,
  6: 62.5,
  7: 75,
  8: 87.5,
  9: 97,
};

const RELATIVE_HUMIDITY_LABEL_BY_BUCKET: Record<number, string> = {
  [-4]: "0-5%",
  [-3]: "5-10%",
  [-2]: "10-15%",
  [-1]: "15-20%",
  0: "20-25%",
  1: "25-30%",
  2: "30-35%",
  3: "35-40%",
  4: "40-45%",
  5: "45-50%",
  6: "50-55%",
  7: "55-60%",
  8: "60-65%",
  9: "65-70%",
  10: "70-75%",
  11: "75-80%",
  12: "80-85%",
  13: "85-90%",
  14: "90-95%",
  15: "95-99%",
  16: "100%",
};

function parseSevenTimerInit(value: string): Date | null {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(value);
  if (!match) return null;

  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]))
  );
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function mostCommonValue<T>(values: T[]): T {
  const counts = new Map<T, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function cloudCoverLabel(cloudCover: number): string {
  if (cloudCover <= 10) return "Clear";
  if (cloudCover <= 25) return "Mostly Clear";
  if (cloudCover <= 50) return "Partly Cloudy";
  if (cloudCover <= 75) return "Mostly Cloudy";
  return "Overcast";
}

function seeingLabel(seeing: number): string {
  if (seeing <= 2) return "Excellent";
  if (seeing <= 4) return "Good";
  if (seeing <= 6) return "Fair";
  return "Poor";
}

function transparencyLabel(transparency: number): string {
  if (transparency <= 2) return "Excellent";
  if (transparency <= 4) return "Good";
  if (transparency <= 6) return "Fair";
  return "Poor";
}

function windSpeedLabel(speed: number): string {
  if (speed <= 1) return "Calm";
  if (speed <= 2) return "Light";
  if (speed <= 3) return "Moderate";
  if (speed <= 4) return "Fresh";
  if (speed <= 5) return "Strong";
  if (speed <= 6) return "Gale";
  if (speed <= 7) return "Storm";
  return "Hurricane";
}

function precipitationLabel(precipitationType: WeatherInfo["precipitationType"]): string {
  if (precipitationType === "rain") return "Rain";
  if (precipitationType === "snow") return "Snow";
  return "None";
}

function observingWindow(date: Date, longitude: number): { start: Date; end: Date } {
  const offsetMinutes = Math.round((longitude / 15) * 60);

  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      OBSERVING_WINDOW_START_HOUR,
      0,
      0
    ) -
      offsetMinutes * 60_000
  );

  const end = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + 1,
      OBSERVING_WINDOW_END_HOUR,
      0,
      0
    ) -
      offsetMinutes * 60_000
  );

  return { start, end };
}

function utcDateKey(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0);
}

function localSolarTodayKey(longitude: number): number {
  const offsetMinutes = Math.round((longitude / 15) * 60);
  const localSolarNow = new Date(Date.now() + offsetMinutes * 60_000);

  return Date.UTC(
    localSolarNow.getUTCFullYear(),
    localSolarNow.getUTCMonth(),
    localSolarNow.getUTCDate(),
    12,
    0,
    0
  );
}

async function fetchSevenTimerAstro(
  latitude: number,
  longitude: number
): Promise<SevenTimerAstroResponse> {
  const url =
    "https://www.7timer.info/bin/api.pl" +
    `?lon=${longitude.toFixed(3)}` +
    `&lat=${latitude.toFixed(3)}` +
    "&product=astro&output=json";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`7Timer ASTRO API error: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as SevenTimerAstroResponse;
}

/**
 * Fetch 7Timer ASTRO forecast data and aggregate the observing window
 * from 8 PM to 2 AM local solar time.
 */
export async function getWeatherInfo(
  latitude: number,
  longitude: number,
  date: Date
): Promise<WeatherInfo> {
  const selectedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  );

  const diffDays = Math.floor(
    (utcDateKey(selectedDate) - localSolarTodayKey(longitude)) /
      (HOURS_PER_DAY * 60 * 60 * 1000)
  );

  if (diffDays < 0 || diffDays > MAX_FORECAST_DAYS_AHEAD) {
    throw new Error(
      `7Timer ASTRO forecast is currently available from today through ${MAX_FORECAST_DAYS_AHEAD} days ahead.`
    );
  }

  const data = await fetchSevenTimerAstro(latitude, longitude);
  if (!data.init || !data.dataseries || data.dataseries.length === 0) {
    throw new Error("7Timer ASTRO forecast data is unavailable for this location.");
  }

  const initDate = parseSevenTimerInit(data.init);
  if (!initDate) {
    throw new Error("7Timer ASTRO forecast initialization time is invalid.");
  }

  const { start, end } = observingWindow(date, longitude);
  const windowPoints = data.dataseries.filter((point) => {
    const validTime = initDate.getTime() + point.timepoint * 60 * 60 * 1000;
    return validTime >= start.getTime() && validTime <= end.getTime();
  });

  if (windowPoints.length === 0) {
    throw new Error("No 7Timer ASTRO forecast data is available for the observing window.");
  }

  const averageCloudCover = average(
    windowPoints.map((point) => CLOUD_COVER_PERCENT_BY_BUCKET[point.cloudcover] ?? 50)
  );
  const averageSeeing = average(windowPoints.map((point) => point.seeing));
  const averageTransparency = average(windowPoints.map((point) => point.transparency));
  const temperaturesC = windowPoints.map((point) => point.temp2m);
  const averageTemperatureC = average(temperaturesC);
  const lowTemperatureC = Math.min(...temperaturesC);
  const highTemperatureC = Math.max(...temperaturesC);
  const humidityBucket = Math.round(average(windowPoints.map((point) => point.rh2m)));
  const windSpeedBucket = Math.round(average(windowPoints.map((point) => point.wind10m.speed)));
  const windDirection = mostCommonValue(windowPoints.map((point) => point.wind10m.direction));
  const liftedIndex = Math.round(average(windowPoints.map((point) => point.lifted_index)));
  const precipitationType = mostCommonValue(windowPoints.map((point) => point.prec_type));

  return {
    averageCloudCover,
    cloudCoverLabel: cloudCoverLabel(averageCloudCover),
    seeing: averageSeeing,
    seeingLabel: seeingLabel(averageSeeing),
    transparency: averageTransparency,
    transparencyLabel: transparencyLabel(averageTransparency),
    precipitationType,
    precipitationLabel: precipitationLabel(precipitationType),
    relativeHumidity: RELATIVE_HUMIDITY_LABEL_BY_BUCKET[humidityBucket] ?? "Unavailable",
    windDirection,
    windSpeed: windSpeedBucket,
    windSpeedLabel: windSpeedLabel(windSpeedBucket),
    temperatureC: averageTemperatureC,
    lowTemperatureC,
    highTemperatureC,
    liftedIndex,
    source: "7Timer ASTRO",
  };
}
