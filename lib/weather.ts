import { WeatherInfo } from "@/types";
import { addUtcDays, formatUtcDateValue } from "@/lib/dates";

interface OpenMeteoHourly {
  time: string[];
  cloud_cover: Array<number | null>;
}

interface OpenMeteoResponse {
  hourly?: OpenMeteoHourly;
}

const MAX_FORECAST_DAYS_AHEAD = 16;
const FORECAST_PAST_DAYS = 92;

function parseOpenMeteoUtc(value: string): number {
  return new Date(`${value}:00Z`).getTime();
}

async function fetchOpenMeteoCloudCover(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string,
  useArchive: boolean
): Promise<OpenMeteoHourly> {
  const baseUrl = useArchive
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const url =
    `${baseUrl}?latitude=${latitude.toFixed(4)}` +
    `&longitude=${longitude.toFixed(4)}` +
    `&start_date=${startDate}&end_date=${endDate}` +
    "&hourly=cloud_cover&timezone=UTC";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Open-Meteo weather API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenMeteoResponse;
  if (!data.hourly || !data.hourly.time || !data.hourly.cloud_cover) {
    throw new Error("Open-Meteo weather data is unavailable for the selected date.");
  }

  return data.hourly;
}

/**
 * Fetch hourly cloud cover from Open-Meteo.
 * Supports historical dates and forecast-range future dates.
 * Averages cloud cover for the observing window (8 PM – 2 AM).
 */
export async function getWeatherInfo(
  latitude: number,
  longitude: number,
  date: Date
): Promise<WeatherInfo> {
  const selectedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0)
  );
  const today = new Date();
  const todayDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0)
  );

  const diffDays = Math.floor(
    (selectedDate.getTime() - todayDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  if (diffDays > MAX_FORECAST_DAYS_AHEAD) {
    throw new Error(
      `Weather forecast is currently available up to ${MAX_FORECAST_DAYS_AHEAD} days in the future.`
    );
  }

  const useArchive = diffDays < -FORECAST_PAST_DAYS;
  const startDate = formatUtcDateValue(selectedDate);
  const endDate = formatUtcDateValue(addUtcDays(selectedDate, 1));

  const hourly = await fetchOpenMeteoCloudCover(
    latitude,
    longitude,
    startDate,
    endDate,
    useArchive
  );

  const offsetMinutes = Math.round((longitude / 15) * 60);
  const windowStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 20, 0, 0) -
      offsetMinutes * 60_000
  );
  const windowEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 2, 0, 0) -
      offsetMinutes * 60_000
  );

  const cloudValues = hourly.time
    .map((time, index) => {
      const timestamp = parseOpenMeteoUtc(time);
      const cloudCover = hourly.cloud_cover[index];
      return { timestamp, cloudCover };
    })
    .filter(
      (entry) =>
        entry.timestamp >= windowStart.getTime() &&
        entry.timestamp <= windowEnd.getTime() &&
        typeof entry.cloudCover === "number" &&
        Number.isFinite(entry.cloudCover)
    )
    .map((entry) => entry.cloudCover as number);

  if (cloudValues.length === 0) {
    throw new Error("No weather data available for the selected date and location.");
  }

  const averageCloudCover =
    cloudValues.length > 0
      ? cloudValues.reduce((a, b) => a + b, 0) / cloudValues.length
      : 50;

  return { averageCloudCover };
}
