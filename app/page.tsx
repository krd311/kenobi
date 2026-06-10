"use client";

import dynamic from "next/dynamic";
import { type FormEvent, useEffect, useState } from "react";
import { EvaluateRequest, EvaluateResponse, Location } from "@/types";
import { SearchPanel } from "@/app/components/SearchPanel";
import { useDraggablePanels } from "@/app/hooks/useDraggablePanels";
import { addLocalDays, formatDateInputValue } from "@/lib/dates";

const LocationPickerMap = dynamic(() => import("@/app/components/LocationPickerMap"), {
  ssr: false,
});

function defaultDateValue(): string {
  return formatDateInputValue(new Date());
}

function maxForecastDateValue(): string {
  return formatDateInputValue(addLocalDays(new Date(), 2));
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

function coordinatesLabel(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

class EvaluateApiError extends Error {}

export default function Home() {
  const [locationInput, setLocationInput] = useState("");
  const [mapLatitude, setMapLatitude] = useState<number | null>(null);
  const [mapLongitude, setMapLongitude] = useState<number | null>(null);
  const [startupCenterLatitude, setStartupCenterLatitude] = useState<number | null>(null);
  const [startupCenterLongitude, setStartupCenterLongitude] = useState<number | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<Location | null>(null);
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocationInputFocused, setIsLocationInputFocused] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [date, setDate] = useState(defaultDateValue);
  const [evaluatedDate, setEvaluatedDate] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const minDate = defaultDateValue();
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

  function syncEvaluatedResult(nextResult: EvaluateResponse, nextEvaluatedDate: string) {
    setResult(nextResult);
    setEvaluatedDate(nextEvaluatedDate);
    setMapLatitude(nextResult.location.latitude);
    setMapLongitude(nextResult.location.longitude);
    setLocationInput(nextResult.location.name);
    setSelectedSuggestion(nextResult.location);
    setShowSuggestions(false);
  }

  async function evaluateLocation(body: EvaluateRequest): Promise<EvaluateResponse> {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new EvaluateApiError(data.error ?? "Unknown error");
    }

    return data as EvaluateResponse;
  }

  function buildEvaluateRequest(trimmedInput: string): EvaluateRequest {
    const parsedCoordinates = parseCoordinates(trimmedInput);

    if (parsedCoordinates) {
      return { ...parsedCoordinates, date };
    }

    if (selectedSuggestion && selectedSuggestion.name === trimmedInput) {
      return {
        latitude: selectedSuggestion.latitude,
        longitude: selectedSuggestion.longitude,
        date,
      };
    }

    return { city: trimmedInput, date };
  }

  async function applyPosition(position: GeolocationPosition) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    setMapLatitude(latitude);
    setMapLongitude(longitude);
    setStartupCenterLatitude((current) => (current === null ? latitude : current));
    setStartupCenterLongitude((current) => (current === null ? longitude : current));

    const fallbackLabel = coordinatesLabel(latitude, longitude);
    const label = await reverseGeocodeLabel(latitude, longitude, fallbackLabel);

    setLocationInput((current) => (current.trim() ? current : label));
    setSelectedSuggestion({ name: label, latitude, longitude });
    setShowSuggestions(false);

    setError(null);
    setLoading(true);

    try {
      const nextResult = await evaluateLocation({ latitude, longitude, date });
      syncEvaluatedResult(nextResult, date);
    } catch {
      setError("Failed to auto-evaluate your location. You can still evaluate manually.");
    } finally {
      setLoading(false);
    }
  }

  function requestCurrentLocation() {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyPosition(position);
      },
      () => {
        setError("Unable to access your location. Please allow location permission and try again.");
      }
    );
  }

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    if (!navigator.permissions?.query) {
      requestCurrentLocation();
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state === "granted" || status.state === "prompt") {
          requestCurrentLocation();
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

        const data = (await res.json()) as { suggestions?: Location[] };
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

      const nextResult = await evaluateLocation(buildEvaluateRequest(trimmedInput));
      syncEvaluatedResult(nextResult, date);
    } catch (err) {
      setError(
        err instanceof EvaluateApiError
          ? err.message
          : "Failed to reach the server. Please try again."
      );
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
          startupCenterLatitude={startupCenterLatitude}
          startupCenterLongitude={startupCenterLongitude}
          darkMode
          borderRadius={0}
          height="100%"
          onSelect={(latitude, longitude) => {
            setMapLatitude(latitude);
            setMapLongitude(longitude);

            const fallbackLabel = coordinatesLabel(latitude, longitude);
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
        onUseCurrentLocation={requestCurrentLocation}
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
