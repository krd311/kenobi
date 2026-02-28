"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795];
const SELECTED_ZOOM = 13;
const DEFAULT_ZOOM = 4;

const markerIcon = L.icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function LocationPickerMap({
  latitude,
  longitude,
  onSelect,
  height = 260,
  borderRadius = 8,
  darkMode = false,
}: {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
  height?: number | string;
  borderRadius?: number;
  darkMode?: boolean;
}) {
  const hasCoordinates = latitude !== null && longitude !== null;
  const centerLat = hasCoordinates ? latitude : DEFAULT_CENTER[0];
  const centerLng = hasCoordinates ? longitude : DEFAULT_CENTER[1];

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onSelectRef = useRef(onSelect);

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
    const tileUrl = darkMode
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      onSelectRef.current(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [darkMode]);

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
    <div ref={containerRef} style={{ height, width: "100%", borderRadius }} />
  );
}
