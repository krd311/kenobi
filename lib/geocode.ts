import { Location } from "@/types";

interface OpenCageResult {
  geometry: { lat: number; lng: number };
  formatted: string;
  components?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

interface OpenCageResponse {
  results: OpenCageResult[];
}

function getOpenCageApiKey(): string {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCAGE_API_KEY environment variable is not set.");
  }

  return apiKey;
}

function toLocation(result: OpenCageResult): Location {
  const place =
    result.components?.city ??
    result.components?.town ??
    result.components?.village ??
    result.components?.hamlet ??
    result.components?.county;

  const region = result.components?.state;
  const country = result.components?.country;

  const cityStyleName = [place, region, country].filter(Boolean).join(", ");

  return {
    name: cityStyleName || result.formatted,
    latitude: result.geometry.lat,
    longitude: result.geometry.lng,
  };
}

/**
 * Geocode a city name to latitude/longitude using the OpenCage API.
 * Requires the OPENCAGE_API_KEY environment variable.
 */
export async function geocodeCity(city: string): Promise<Location> {
  const apiKey = getOpenCageApiKey();

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${apiKey}&limit=1&no_annotations=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenCage API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenCageResponse;

  if (!data.results || data.results.length === 0) {
    throw new Error(`No results found for city: "${city}"`);
  }

  return toLocation(data.results[0]);
}

/**
 * Suggest matching places for city/address autocomplete.
 */
export async function suggestPlaces(query: string, limit = 5): Promise<Location[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiKey = getOpenCageApiKey();
  const safeLimit = Math.max(1, Math.min(10, limit));

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(trimmed)}&key=${apiKey}&limit=${safeLimit}&no_annotations=1`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`OpenCage API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenCageResponse;
  if (!data.results || data.results.length === 0) {
    return [];
  }

  return data.results.map(toLocation);
}

/**
 * Reverse geocode coordinates to a place label.
 */
export async function reverseGeocodeCoords(
  latitude: number,
  longitude: number
): Promise<Location> {
  const apiKey = getOpenCageApiKey();

  const url =
    "https://api.opencagedata.com/geocode/v1/json" +
    `?q=${encodeURIComponent(`${latitude},${longitude}`)}` +
    `&key=${apiKey}&limit=1&no_annotations=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenCage API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenCageResponse;
  if (!data.results || data.results.length === 0) {
    throw new Error("No reverse geocoding results found.");
  }

  return toLocation(data.results[0]);
}

/**
 * Return a Location from raw latitude/longitude coordinates.
 * No external API call required.
 */
export function locationFromCoords(latitude: number, longitude: number): Location {
  return {
    name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
    latitude,
    longitude,
  };
}
