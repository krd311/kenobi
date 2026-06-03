"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const SELECTED_ZOOM = 13;
const DEFAULT_ZOOM = 4;

type MapLayerKey = "dark" | "osm" | "topo" | "satellite";

interface MapLayerConfig {
  label: string;
  tileUrl: string;
  attribution: string;
  subdomains?: string | string[];
}

const MAP_LAYERS: Record<
  MapLayerKey,
  MapLayerConfig
> = {
  dark: {
    label: "Dark",
    tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; CARTO',
  },
  osm: {
    label: "Street",
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  topo: {
    label: "Topo",
    tileUrl: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
  },
  satellite: {
    label: "Satellite",
    tileUrl: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

const markerIcon = L.icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function createTileLayer(config: MapLayerConfig) {
  const options: L.TileLayerOptions = {
    attribution: config.attribution,
  };

  if (config.subdomains !== undefined) {
    options.subdomains = config.subdomains;
  }

  return L.tileLayer(config.tileUrl, options);
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onSelect,
  height = 260,
  borderRadius = 8,
}: {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
  height?: number | string;
  borderRadius?: number;
  darkMode?: boolean;
}) {
  const initialLayer: MapLayerKey = "osm";
  const [mapLayer, setMapLayer] = useState<MapLayerKey>(initialLayer);

  const hasCoordinates = latitude !== null && longitude !== null;
  const centerLat = hasCoordinates ? latitude : DEFAULT_CENTER[0];
  const centerLng = hasCoordinates ? longitude : DEFAULT_CENTER[1];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onSelectRef = useRef(onSelect);

  const layerOptions = useMemo(
    () =>
      Object.entries(MAP_LAYERS).map(([value, layer]) => ({
        value: value as MapLayerKey,
        label: layer.label,
      })),
    []
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, { zoomControl: false }).setView(
      [centerLat, centerLng],
      hasCoordinates ? SELECTED_ZOOM : DEFAULT_ZOOM
    );
    L.control.zoom({ position: "topright" }).addTo(map);

    const defaultLayer = MAP_LAYERS[initialLayer];
    tileLayerRef.current = createTileLayer(defaultLayer).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onSelectRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      tileLayerRef.current?.remove();
      tileLayerRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [centerLat, centerLng, hasCoordinates, initialLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const nextLayer = MAP_LAYERS[mapLayer];
    tileLayerRef.current?.remove();
    tileLayerRef.current = createTileLayer(nextLayer).addTo(map);
  }, [mapLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (hasCoordinates) {
      map.flyTo([centerLat, centerLng], SELECTED_ZOOM, {
        animate: true,
        duration: 1.6,
        easeLinearity: 0.2,
      });
    } else {
      map.setView([centerLat, centerLng], DEFAULT_ZOOM, { animate: true });
    }

    if (hasCoordinates) {
      const center: [number, number] = [centerLat, centerLng];
      if (!markerRef.current) {
        markerRef.current = L.marker(center, { icon: markerIcon }).addTo(map);
      } else {
        markerRef.current.setLatLng(center);
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [centerLat, centerLng, hasCoordinates]);

  return (
    <div style={{ position: "relative", height, width: "100%", borderRadius, overflow: "hidden" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
      <div
        style={{
          position: "absolute",
          bottom: 12,
          right: 12,
          zIndex: 1001,
          pointerEvents: "none",
          background: "rgba(22, 28, 38, 0.95)",
          border: "1px solid rgba(107, 114, 128, 0.65)",
          borderRadius: 10,
          boxShadow: "0 10px 36px rgba(0, 0, 0, 0.55)",
          padding: "0.55rem 0.6rem",
        }}
      >
        <label
          htmlFor="map-layer-select"
          style={{
            display: "block",
            fontSize: "0.72rem",
            marginBottom: 4,
            color: "#9ca3af",
            letterSpacing: "0.01em",
          }}
        >
          Map Layer
        </label>
        <select
          id="map-layer-select"
          value={mapLayer}
          onChange={(event) => setMapLayer(event.target.value as MapLayerKey)}
          style={{
            pointerEvents: "auto",
            minWidth: 132,
            borderRadius: 8,
            border: "1px solid #2a2f38",
            padding: "0.4rem 0.55rem",
            background: "#111827",
            color: "#fff",
            outline: "none",
          }}
          aria-label="Select map layer"
        >
          {layerOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
