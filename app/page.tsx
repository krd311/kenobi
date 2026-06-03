"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useState } from "react";
import { EvaluateResponse } from "@/types";
import { SearchPanel } from "@/app/components/SearchPanel";
import { useDraggablePanels } from "@/app/hooks/useDraggablePanels";

const LocationPickerMap = dynamic(() => import("@/app/components/LocationPickerMap"), {
  ssr: false,
});

function defaultDateValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function maxForecastDateValue(): string {
  const now = new Date();
  now.setDate(now.getDate() + 16);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface PlaceSuggestion {
  name: string;
  latitude: number;
  longitude: number;
}



function parseCoordinates(value: string): { latitude: number; longitude: number } | null {
  const text = value.trim();
  const match = /^(-?\d+(?:\.\d+)?)\s*[,\s]\s*(-?\d+(?:\.\d+)?)$/.exec(text);
  if (!match) return null;

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

export default function Home() {
  const [locationInput, setLocationInput] = useState("");
  const [mapLatitude, setMapLatitude] = useState<number | null>(null);
  const [mapLongitude, setMapLongitude] = useState<number | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<PlaceSuggestion | null>(null);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocationInputFocused, setIsLocationInputFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [date, setDate] = useState(defaultDateValue);
  const [evaluatedDate, setEvaluatedDate] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const minDate = "1940-01-01";
  const maxDate = maxForecastDateValue();

  const {
    searchRect,
    startDrag,
    onDragMove,
    endDrag,
    startResize,
    onResizeMove,
    endResize,
  } = useDraggablePanels({
    initialSearchRect: { x: 16, y: 16, width: 420, height: 250 },
  });

  async function reverseGeocodeLabel(
    latitude: number,
    longitude: number,
    fallbackLabel: string
  ): Promise<string> {
    try {
      const res = await fetch(
        `/api/geocode/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
      );

      if (!res.ok) {
        return fallbackLabel;
      }

      const data = (await res.json()) as {
        location?: { name?: string; latitude?: number; longitude?: number };
      };

      return data.location?.name || fallbackLabel;
    } catch {
      return fallbackLabel;
    }
  }

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    const applyPosition = async (position: GeolocationPosition) => {
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      setMapLatitude(latitude);
      setMapLongitude(longitude);

      const fallbackLabel = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      const label = await reverseGeocodeLabel(latitude, longitude, fallbackLabel);

      setLocationInput((current) => (current.trim() ? current : label));
      setSelectedSuggestion({ name: label, latitude, longitude });
      setShowSuggestions(false);

      setError(null);
      setLoading(true);

      try {
        const res = await fetch("/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ latitude, longitude, date }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Unknown error");
          return;
        }

        const nextResult = data as EvaluateResponse;
        setResult(nextResult);
        setEvaluatedDate(date);
        setMapLatitude(nextResult.location.latitude);
        setMapLongitude(nextResult.location.longitude);
        setLocationInput(nextResult.location.name);
        setSelectedSuggestion({
          name: nextResult.location.name,
          latitude: nextResult.location.latitude,
          longitude: nextResult.location.longitude,
        });
      } catch {
        setError("Failed to auto-evaluate your location. You can still evaluate manually.");
      } finally {
        setLoading(false);
      }
    };

    const getLocation = () => {
      navigator.geolocation.getCurrentPosition((position) => {
        void applyPosition(position);
      }, () => undefined);
    };

    if (!navigator.permissions?.query) {
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted") {
          getLocation();
        }
      })
      .catch(() => undefined);

    return;
  }, []);

  useEffect(() => {
    const parsedCoordinates = parseCoordinates(locationInput);
    const trimmedInput = locationInput.trim();

    if (!trimmedInput || parsedCoordinates || !isLocationInputFocused) {
      setLoadingSuggestions(false);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingSuggestions(true);
        const res = await fetch(`/api/geocode/suggest?q=${encodeURIComponent(trimmedInput)}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const data = (await res.json()) as { suggestions?: PlaceSuggestion[] };
        const nextSuggestions = data.suggestions ?? [];
        setSuggestions(nextSuggestions);
        setShowSuggestions(nextSuggestions.length > 0);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSuggestions(false);
        }
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [locationInput, isLocationInputFocused]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const trimmedInput = locationInput.trim();
      if (!trimmedInput) {
        setError("Enter a location as a city, address, or coordinates.");
        return;
      }

      const parsedCoordinates = parseCoordinates(trimmedInput);

      const body = parsedCoordinates
        ? {
            latitude: parsedCoordinates.latitude,
            longitude: parsedCoordinates.longitude,
            date,
          }
        : selectedSuggestion && selectedSuggestion.name === trimmedInput
          ? {
              latitude: selectedSuggestion.latitude,
              longitude: selectedSuggestion.longitude,
              date,
            }
          : { city: trimmedInput, date };

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unknown error");
      } else {
        const nextResult = data as EvaluateResponse;
        setResult(nextResult);
        setEvaluatedDate(date);
        setMapLatitude(nextResult.location.latitude);
        setMapLongitude(nextResult.location.longitude);
        setLocationInput(nextResult.location.name);
        setSelectedSuggestion({
          name: nextResult.location.name,
          latitude: nextResult.location.latitude,
          longitude: nextResult.location.longitude,
        });
        setShowSuggestions(false);
      }
    } catch {
      setError("Failed to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  

  return (
    <main style={{ height: "100vh", width: "100vw", position: "relative", overflow: "hidden", color: "#fff" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <LocationPickerMap
          latitude={mapLatitude}
          longitude={mapLongitude}
          darkMode
          borderRadius={0}
          height="100%"
          onSelect={(latitude, longitude) => {
            setMapLatitude(latitude);
            setMapLongitude(longitude);

            const fallbackLabel = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setLocationInput(fallbackLabel);
            setSelectedSuggestion({ name: fallbackLabel, latitude, longitude });
            setShowSuggestions(false);

            void (async () => {
              const label = await reverseGeocodeLabel(latitude, longitude, fallbackLabel);
              setLocationInput(label);
              setSelectedSuggestion({ name: label, latitude, longitude });
            })();
          }}
        />
      </div>

      <SearchPanel
        rect={searchRect}
        loading={loading}
        locationInput={locationInput}
        setLocationInput={setLocationInput}
        setSelectedSuggestion={setSelectedSuggestion}
        setMapLatitude={setMapLatitude}
        setMapLongitude={setMapLongitude}
        showSuggestions={showSuggestions}
        suggestions={suggestions}
        loadingSuggestions={loadingSuggestions}
        setShowSuggestions={setShowSuggestions}
        setIsLocationInputFocused={setIsLocationInputFocused}
        date={date}
        setDate={setDate}
        minDate={minDate}
        maxDate={maxDate}
        error={error}
        result={result}
        evaluatedDate={evaluatedDate}
        onSubmit={handleSubmit}
        onStartDrag={(e) => startDrag(e, "search")}
        onDragMove={onDragMove}
        onEndDrag={endDrag}
        onStartResize={(e) => startResize(e, "search")}
        onResizeMove={onResizeMove}
        onEndResize={endResize}
        parseCoordinates={parseCoordinates}
      />
    </main>
  );
}
