import { Location } from "@/types";

interface OpenCageResult {
  geometry: { lat: number; lng: number };
  formatted: string;
}

interface OpenCageResponse {
  results: OpenCageResult[];
}

/**
 * Geocode a city name to latitude/longitude using the OpenCage API.
 * Requires the OPENCAGE_API_KEY environment variable.
 */
export async function geocodeCity(city: string): Promise<Location> {
  const apiKey = process.env.OPENCAGE_API_KEY;
  if (!apiKey) {
    throw new Error("OPENCAGE_API_KEY environment variable is not set.");
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(city)}&key=${apiKey}&limit=1&no_annotations=1`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`OpenCage API error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OpenCageResponse;

  if (!data.results || data.results.length === 0) {
    throw new Error(`No results found for city: "${city}"`);
  }

  const result = data.results[0];
  return {
    name: result.formatted,
    latitude: result.geometry.lat,
    longitude: result.geometry.lng,
  };
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
