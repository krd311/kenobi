import { readFile } from "fs/promises";
import path from "path";
import { decode } from "jpeg-js";
import JSZip from "jszip";
import { LightPollutionInfo } from "@/types";

interface KmzOverlay {
  href: string;
  north: number;
  south: number;
  east: number;
  west: number;
}

interface DecodedTile {
  width: number;
  height: number;
  data: Buffer | Uint8Array;
}

interface KmzDataset {
  zip: JSZip;
  overlays: KmzOverlay[];
  decodedTiles: Map<string, Promise<DecodedTile>>;
}

interface PaletteEntry {
  bortleClass: number;
  rgb: [number, number, number];
  artificialBrightnessRatio: number;
  sqm: number;
}

const DATA_DIR = path.join(process.cwd(), "data", "light-pollution");
const KMZ_FILE = path.join(DATA_DIR, "NewWorldAtlas_ArtificialSkyBrightness.kmz");
const KMZ_SOURCE = "Falchi et al. 2016 World Atlas KMZ, GFZ Data Services";

const PALETTE: PaletteEntry[] = [
  { bortleClass: 1, rgb: [0, 0, 0], artificialBrightnessRatio: 0.01, sqm: 21.95 },
  { bortleClass: 2, rgb: [64, 64, 64], artificialBrightnessRatio: 0.06, sqm: 21.75 },
  { bortleClass: 3, rgb: [0, 0, 255], artificialBrightnessRatio: 0.22, sqm: 21.45 },
  { bortleClass: 4, rgb: [0, 128, 0], artificialBrightnessRatio: 0.66, sqm: 20.95 },
  { bortleClass: 5, rgb: [255, 255, 0], artificialBrightnessRatio: 2, sqm: 20.35 },
  { bortleClass: 6, rgb: [255, 128, 0], artificialBrightnessRatio: 6, sqm: 19.55 },
  { bortleClass: 7, rgb: [255, 0, 0], artificialBrightnessRatio: 18, sqm: 18.75 },
  { bortleClass: 8, rgb: [255, 0, 255], artificialBrightnessRatio: 45, sqm: 18 },
  { bortleClass: 9, rgb: [255, 255, 255], artificialBrightnessRatio: 90, sqm: 17.25 },
];

let datasetPromise: Promise<KmzDataset | null> | null = null;

function unavailableLightPollutionInfo(note: string): LightPollutionInfo {
  return {
    available: false,
    bortleClass: null,
    sqm: null,
    artificialBrightnessRatio: null,
    qualityLabel: "Unavailable",
    source: KMZ_SOURCE,
    note,
  };
}

function lightPollutionLabel(bortleClass: number): string {
  if (bortleClass <= 2) return "Excellent dark sky";
  if (bortleClass <= 3) return "Dark rural sky";
  if (bortleClass <= 4) return "Rural/suburban transition";
  if (bortleClass <= 5) return "Suburban sky";
  if (bortleClass <= 6) return "Bright suburban sky";
  if (bortleClass <= 7) return "Urban/suburban sky";
  if (bortleClass <= 8) return "Urban sky";
  return "Inner-city sky";
}

function readTagValue(xml: string, tagName: string): string | null {
  const match = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`).exec(xml);
  return match?.[1].trim() ?? null;
}

function readNumericTagValue(xml: string, tagName: string): number | null {
  const value = readTagValue(xml, tagName);
  if (value === null) return null;

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseKmzOverlays(kml: string): KmzOverlay[] {
  const overlays: KmzOverlay[] = [];

  for (const match of kml.matchAll(/<GroundOverlay>[\s\S]*?<\/GroundOverlay>/g)) {
    const overlayXml = match[0];
    const href = readTagValue(overlayXml, "href");
    const north = readNumericTagValue(overlayXml, "north");
    const south = readNumericTagValue(overlayXml, "south");
    const east = readNumericTagValue(overlayXml, "east");
    const west = readNumericTagValue(overlayXml, "west");

    if (
      href &&
      north !== null &&
      south !== null &&
      east !== null &&
      west !== null &&
      north > south &&
      east > west
    ) {
      overlays.push({ href, north, south, east, west });
    }
  }

  return overlays;
}

async function loadKmzDataset(): Promise<KmzDataset | null> {
  try {
    const kmzBuffer = await readFile(KMZ_FILE);
    const zip = await JSZip.loadAsync(kmzBuffer);
    const kml = await zip.file("doc.kml")?.async("string");

    if (!kml) {
      throw new Error("KMZ is missing doc.kml.");
    }

    const overlays = parseKmzOverlays(kml);
    if (overlays.length === 0) {
      throw new Error("KMZ doc.kml does not contain readable GroundOverlay entries.");
    }

    return {
      zip,
      overlays,
      decodedTiles: new Map(),
    };
  } catch {
    return null;
  }
}

function getDataset(): Promise<KmzDataset | null> {
  datasetPromise ??= loadKmzDataset();
  return datasetPromise;
}

function findOverlayFor(latitude: number, longitude: number, overlays: KmzOverlay[]): KmzOverlay | null {
  return (
    overlays.find(
      (overlay) =>
        latitude <= overlay.north &&
        latitude >= overlay.south &&
        longitude >= overlay.west &&
        longitude <= overlay.east
    ) ?? null
  );
}

function readDecodedTile(dataset: KmzDataset, href: string): Promise<DecodedTile> {
  const cachedTile = dataset.decodedTiles.get(href);
  if (cachedTile) return cachedTile;

  const decodedTile = (async () => {
    const file = dataset.zip.file(href);
    if (!file) {
      throw new Error(`KMZ tile is missing: ${href}`);
    }

    const jpegBuffer = await file.async("nodebuffer");
    return decode(jpegBuffer, {
      maxMemoryUsageInMB: 64,
      tolerantDecoding: true,
    });
  })();

  dataset.decodedTiles.set(href, decodedTile);
  return decodedTile;
}

function colorDistanceSquared(a: [number, number, number], b: [number, number, number]): number {
  const redDiff = a[0] - b[0];
  const greenDiff = a[1] - b[1];
  const blueDiff = a[2] - b[2];

  return redDiff * redDiff + greenDiff * greenDiff + blueDiff * blueDiff;
}

function classifyPixel(red: number, green: number, blue: number): PaletteEntry {
  const color: [number, number, number] = [red, green, blue];

  return PALETTE.reduce((closest, entry) =>
    colorDistanceSquared(color, entry.rgb) < colorDistanceSquared(color, closest.rgb)
      ? entry
      : closest
  );
}

function sampleTilePixel(
  tile: DecodedTile,
  overlay: KmzOverlay,
  latitude: number,
  longitude: number
): PaletteEntry {
  const xRatio = (longitude - overlay.west) / (overlay.east - overlay.west);
  const yRatio = (overlay.north - latitude) / (overlay.north - overlay.south);
  const x = Math.min(tile.width - 1, Math.max(0, Math.floor(xRatio * tile.width)));
  const y = Math.min(tile.height - 1, Math.max(0, Math.floor(yRatio * tile.height)));
  const offset = (y * tile.width + x) * 4;

  return classifyPixel(tile.data[offset], tile.data[offset + 1], tile.data[offset + 2]);
}

export async function getLightPollutionInfo(
  latitude: number,
  longitude: number
): Promise<LightPollutionInfo> {
  const dataset = await getDataset();
  if (!dataset) {
    return unavailableLightPollutionInfo(
      `Add NewWorldAtlas_ArtificialSkyBrightness.kmz to ${path.relative(process.cwd(), DATA_DIR)} to include light pollution in the score.`
    );
  }

  const overlay = findOverlayFor(latitude, longitude, dataset.overlays);
  if (!overlay) {
    return unavailableLightPollutionInfo("Selected coordinates are outside the KMZ overlay bounds.");
  }

  try {
    const tile = await readDecodedTile(dataset, overlay.href);
    const classification = sampleTilePixel(tile, overlay, latitude, longitude);

    return {
      available: true,
      bortleClass: classification.bortleClass,
      sqm: classification.sqm,
      artificialBrightnessRatio: classification.artificialBrightnessRatio,
      qualityLabel: lightPollutionLabel(classification.bortleClass),
      source: KMZ_SOURCE,
      note: "Estimated from KMZ overlay color; use the raw GeoTIFF for higher-precision numeric values.",
    };
  } catch {
    return unavailableLightPollutionInfo("Unable to decode the KMZ tile for this coordinate.");
  }
}
