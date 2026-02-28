import { WeatherInfo } from "@/types";

interface NWSPointResponse {
  properties: {
    forecastHourly: string;
  };
}

interface NWSHourlyPeriod {
  startTime: string;
  cloudCover?: number;
  shortForecast?: string;
}

interface NWSHourlyResponse {
  properties: {
    periods: NWSHourlyPeriod[];
  };
}

/**
 * Estimate cloud cover percentage from a short forecast string.
 * NWS hourly forecast sometimes lacks a numeric cloudCover field,
 * so we fall back to keyword matching.
 */
function cloudCoverFromForecast(forecast: string): number {
  const f = forecast.toLowerCase();
  if (f.includes("clear") || f.includes("sunny")) return 0;
  if (f.includes("mostly clear") || f.includes("mostly sunny")) return 15;
  if (f.includes("partly cloudy") || f.includes("partly sunny")) return 40;
  if (f.includes("mostly cloudy")) return 75;
  if (f.includes("cloudy") || f.includes("overcast")) return 90;
  if (f.includes("rain") || f.includes("snow") || f.includes("storm")) return 95;
  return 50; // unknown
}

/**
 * Fetch hourly cloud cover from the NOAA NWS API for a given lat/lon.
 * Averages cloud cover for the observing window (8 PM – 2 AM).
 */
export async function getWeatherInfo(
  latitude: number,
  longitude: number,
  date: Date
): Promise<WeatherInfo> {
  // Step 1: Get the forecast office grid point
  const pointUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const pointRes = await fetch(pointUrl, {
    headers: { "User-Agent": "StargazingConditionEvaluator/1.0 (contact@example.com)" },
  });

  if (!pointRes.ok) {
    throw new Error(`NWS points API error: ${pointRes.status} ${pointRes.statusText}`);
  }

  const pointData = (await pointRes.json()) as NWSPointResponse;
  const forecastHourlyUrl = pointData.properties.forecastHourly;

  // Step 2: Fetch hourly forecast
  const hourlyRes = await fetch(forecastHourlyUrl, {
    headers: { "User-Agent": "StargazingConditionEvaluator/1.0 (contact@example.com)" },
  });

  if (!hourlyRes.ok) {
    throw new Error(`NWS hourly forecast error: ${hourlyRes.status} ${hourlyRes.statusText}`);
  }

  const hourlyData = (await hourlyRes.json()) as NWSHourlyResponse;
  const periods = hourlyData.properties.periods;

  // Step 3: Filter periods that fall within the observing window (8 PM – 2 AM)
  // Use the provided date to build the window date range
  const offsetMinutes = Math.round((longitude / 15) * 60);
  const windowStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 20, 0, 0) -
      offsetMinutes * 60_000
  );
  const windowEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 2, 0, 0) -
      offsetMinutes * 60_000
  );

  const windowPeriods = periods.filter((p) => {
    const t = new Date(p.startTime).getTime();
    return t >= windowStart.getTime() && t <= windowEnd.getTime();
  });

  const relevantPeriods = windowPeriods.length > 0 ? windowPeriods : periods.slice(0, 7);

  const cloudValues = relevantPeriods.map((p) => {
    if (typeof p.cloudCover === "number") return p.cloudCover;
    return cloudCoverFromForecast(p.shortForecast ?? "");
  });

  const averageCloudCover =
    cloudValues.length > 0
      ? cloudValues.reduce((a, b) => a + b, 0) / cloudValues.length
      : 50;

  return { averageCloudCover };
}
