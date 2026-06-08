import { NextRequest, NextResponse } from "next/server";
import { geocodeCity, locationFromCoords, reverseGeocodeCoords } from "@/lib/geocode";
import { getSunInfo, getMoonInfo } from "@/lib/astronomy";
import { getWeatherInfo } from "@/lib/weather";
import { computeScore } from "@/lib/scoring";
import { formatUtcDateValue } from "@/lib/dates";
import { getLightPollutionInfo } from "@/lib/lightPollution";
import { EvaluateRequest, EvaluateResponse } from "@/types";

const CACHE_TTL_MS = 10 * 60 * 1000;
const evaluationCache = new Map<string, { expiresAt: number; response: EvaluateResponse }>();

function parseRequestDate(value?: string): Date | null {
  if (!value) return new Date();

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return parsed;
}

function cacheKeyFor(latitude: number, longitude: number, date: Date): string {
  return `${latitude.toFixed(4)}|${longitude.toFixed(4)}|${formatUtcDateValue(date)}`;
}

function clearExpiredCacheEntries(now: number): void {
  for (const [key, value] of evaluationCache.entries()) {
    if (value.expiresAt <= now) {
      evaluationCache.delete(key);
    }
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as EvaluateRequest;
    const targetDate = parseRequestDate(body.date);

    if (!targetDate) {
      return NextResponse.json(
        { error: "Invalid date format. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    // Resolve location
    let location;
    if (body.city) {
      location = await geocodeCity(body.city);
    } else if (body.latitude !== undefined && body.longitude !== undefined) {
      try {
        location = await reverseGeocodeCoords(body.latitude, body.longitude);
      } catch {
        location = locationFromCoords(body.latitude, body.longitude);
      }
    } else {
      return NextResponse.json(
        { error: "Provide either 'city' or 'latitude' and 'longitude'." },
        { status: 400 }
      );
    }

    const now = Date.now();
    clearExpiredCacheEntries(now);

    const cacheKey = cacheKeyFor(location.latitude, location.longitude, targetDate);
    const cached = evaluationCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return NextResponse.json(cached.response, {
        headers: { "x-cache": "HIT" },
      });
    }

    const [sun, moon, weather, lightPollution] = await Promise.all([
      Promise.resolve(getSunInfo(targetDate, location.latitude, location.longitude)),
      Promise.resolve(getMoonInfo(targetDate, location.latitude, location.longitude)),
      getWeatherInfo(location.latitude, location.longitude, targetDate),
      getLightPollutionInfo(location.latitude, location.longitude),
    ]);

    const score = computeScore(
      weather.averageCloudCover,
      moon.illumination,
      moon.aboveHorizonDuringWindow,
      lightPollution
    );

    const response: EvaluateResponse = {
      location,
      sun,
      moon,
      weather,
      lightPollution,
      score,
    };

    evaluationCache.set(cacheKey, {
      expiresAt: now + CACHE_TTL_MS,
      response,
    });

    return NextResponse.json(response, {
      headers: { "x-cache": "MISS" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
