import SunCalc from "suncalc";
import { MoonInfo, SunInfo } from "@/types";

/**
 * Observing window: 8:00 PM – 2:00 AM local time (next calendar day).
 * We approximate "local" using UTC offset derived from longitude (15°/hr).
 */
function observingWindow(date: Date, latitude: number, longitude: number): { start: Date; end: Date } {
  // Rough UTC offset in minutes from longitude
  const offsetMinutes = Math.round((longitude / 15) * 60);

  // Start: 20:00 local → UTC
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 20, 0, 0) -
      offsetMinutes * 60_000
  );

  // End: 02:00 local next day → UTC
  const end = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 2, 0, 0) -
      offsetMinutes * 60_000
  );

  return { start, end };
}

/**
 * Compute sunset and astronomical dusk for the given date/location using SunCalc.
 */
export function getSunInfo(date: Date, latitude: number, longitude: number): SunInfo {
  const times = SunCalc.getTimes(date, latitude, longitude);

  return {
    sunset: times.sunset.toISOString(),
    // times.night = start of astronomical night (end of astronomical twilight / dusk)
    astronomicalDusk: times.night.toISOString(),
  };
}

/**
 * Compute moon phase illumination and rise/set times,
 * and determine whether the moon is above the horizon during the observing window.
 */
export function getMoonInfo(date: Date, latitude: number, longitude: number): MoonInfo {
  const illumination = SunCalc.getMoonIllumination(date).fraction;

  const moonTimes = SunCalc.getMoonTimes(date, latitude, longitude);
  const moonrise = moonTimes.rise ? moonTimes.rise.toISOString() : null;
  const moonset = moonTimes.set ? moonTimes.set.toISOString() : null;

  const { start, end } = observingWindow(date, latitude, longitude);

  // Check if moon is above the horizon at any point during the window.
  // We sample every 30 minutes.
  let aboveHorizonDuringWindow = false;
  const step = 30 * 60_000; // 30 min in ms
  for (let t = start.getTime(); t <= end.getTime(); t += step) {
    const pos = SunCalc.getMoonPosition(new Date(t), latitude, longitude);
    if (pos.altitude > 0) {
      aboveHorizonDuringWindow = true;
      break;
    }
  }

  return {
    illumination,
    moonrise,
    moonset,
    aboveHorizonDuringWindow,
  };
}
