"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EvaluateResponse } from "@/types";

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
  type PanelRect = { x: number; y: number; width: number; height: number };
  type PanelId = "search" | "info";

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
  const [searchRect, setSearchRect] = useState<PanelRect>({ x: 16, y: 16, width: 420, height: 250 });
  const [infoRect, setInfoRect] = useState<PanelRect>({ x: 120, y: 520, width: 940, height: 320 });
  const [isInfoPanelReady, setIsInfoPanelReady] = useState(false);
  const BOTTOM_GAP = 24;

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

  const dragRef = useRef<{
  panel: PanelId | null;
  startX: number;
  startY: number;
  startRect: PanelRect | null;
}>({ panel: null, startX: 0, startY: 0, startRect: null });

const resizeRef = useRef<{
  panel: PanelId | null;
  startX: number;
  startY: number;
  startRect: PanelRect | null;
}>({ panel: null, startX: 0, startY: 0, startRect: null });

const getRect = (panel: PanelId) => (panel === "search" ? searchRect : infoRect);
const setRect = (panel: PanelId, next: PanelRect) =>
  panel === "search" ? setSearchRect(next) : setInfoRect(next);

function clampRect(rect: PanelRect): PanelRect {
  if (typeof window === "undefined") return rect;
  const minW = 320;
  const minH = 180;
  const width = Math.max(minW, rect.width);
  const height = Math.max(minH, rect.height);
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(0, window.innerHeight - height);
  return {
    width,
    height,
    x: Math.min(Math.max(0, rect.x), maxX),
    y: Math.min(Math.max(0, rect.y), maxY),
  };
}

function startDrag(e: React.PointerEvent<HTMLDivElement>, panel: PanelId) {
  const current = getRect(panel);
  dragRef.current = { panel, startX: e.clientX, startY: e.clientY, startRect: current };
  e.currentTarget.setPointerCapture(e.pointerId);
  document.body.style.userSelect = "none";
}

function onDragMove(e: React.PointerEvent<HTMLDivElement>) {
  const d = dragRef.current;
  if (!d.panel || !d.startRect) return;
  const dx = e.clientX - d.startX;
  const dy = e.clientY - d.startY;
  const next = clampRect({ ...d.startRect, x: d.startRect.x + dx, y: d.startRect.y + dy });
  setRect(d.panel, next);
}

function endDrag() {
  dragRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
  document.body.style.userSelect = "";
}

function startResize(e: React.PointerEvent<HTMLDivElement>, panel: PanelId) {
  const current = getRect(panel);
  resizeRef.current = { panel, startX: e.clientX, startY: e.clientY, startRect: current };
  e.currentTarget.setPointerCapture(e.pointerId);
  document.body.style.userSelect = "none";
}

function onResizeMove(e: React.PointerEvent<HTMLDivElement>) {
  const r = resizeRef.current;
  if (!r.panel || !r.startRect) return;
  const dx = e.clientX - r.startX;
  const dy = e.clientY - r.startY;
  const next = clampRect({
    ...r.startRect,
    width: r.startRect.width + dx,
    height: r.startRect.height + dy,
  });
  setRect(r.panel, next);
}

function endResize() {
  resizeRef.current = { panel: null, startX: 0, startY: 0, startRect: null };
  document.body.style.userSelect = "";
}

useLayoutEffect(() => {
  if (typeof window === "undefined") {
    return;
  }

  setInfoRect((current) =>
    clampRect({
      ...current,
      x: (window.innerWidth - current.width) / 2,
      y: window.innerHeight - current.height - BOTTOM_GAP,
    })
  );
  setIsInfoPanelReady(true);
}, []);

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

  async function handleSubmit(e: React.FormEvent) {
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

      <section
        style={{
          position: "absolute",
          top: searchRect.y,
          left: searchRect.x,
          zIndex: 1000,
          width: searchRect.width,
          height: searchRect.height,
          overflow: "auto",
          background: "rgba(22, 28, 38, 0.95)",
          border: "1px solid rgba(107, 114, 128, 0.65)",
          borderRadius: 14,
          padding: "14px",
          boxShadow: "0 10px 36px rgba(0, 0, 0, 0.55)",
          transition: "opacity 200ms ease, transform 200ms ease",
        }}
      >
        <div
          onPointerDown={(e) => startDrag(e, "search")}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ 
            cursor: "move", 
            fontSize: "0.8rem", 
            color: "#9ca3af", 
            marginBottom: "0.35rem",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            background: "transparent",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        >
        </div>
        <div
          onPointerDown={(e) => startResize(e, "search")}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 14,
            height: 14,
            cursor: "nwse-resize",
            borderRight: "2px solid #9ca3af",
            borderBottom: "2px solid #9ca3af",
          }}
        />
          <h1 style={{ margin: 0, fontSize: "1.1rem" }}>Stargazing Planner</h1>
          <p style={{ margin: "0.35rem 0 0.8rem", color: "#d1d5db", fontSize: "0.92rem" }}>
            Search by city, address, or coordinates (lat, lon).
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={locationInput}
                onChange={(e) => {
                  setLocationInput(e.target.value);
                  setSelectedSuggestion(null);

                  const parsedCoordinates = parseCoordinates(e.target.value);
                  if (parsedCoordinates) {
                    setMapLatitude(parsedCoordinates.latitude);
                    setMapLongitude(parsedCoordinates.longitude);
                  }
                }}
                placeholder="Enter city, address, or lat, lon"
                disabled={loading}
                onFocus={() => {
                  setIsLocationInputFocused(true);
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setIsLocationInputFocused(false);
                  setTimeout(() => setShowSuggestions(false), 100);
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.65rem 0.75rem",
                  borderRadius: 9,
                  border: "1px solid #2a2f38",
                  background: "#111827",
                  color: "#fff",
                }}
              />

              {showSuggestions && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "#111827",
                    border: "1px solid #2a2f38",
                    borderRadius: 9,
                    maxHeight: 220,
                    overflowY: "auto",
                    zIndex: 1001,
                  }}
                >
                  {suggestions.map((suggestion) => (
                    <button
                      key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}`}
                      type="button"
                      onClick={() => {
                        setLocationInput(suggestion.name);
                        setSelectedSuggestion(suggestion);
                        setMapLatitude(suggestion.latitude);
                        setMapLongitude(suggestion.longitude);
                        setShowSuggestions(false);
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "0.6rem 0.75rem",
                        border: "none",
                        background: "transparent",
                        color: "#fff",
                        cursor: "pointer",
                        transition: "background-color 150ms ease",
                      }}
                    >
                      {suggestion.name}
                    </button>
                  ))}
                  {loadingSuggestions && (
                    <div style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>Searching…</div>
                  )}
                </div>
              )}
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.92rem" }}>
              Date
              <input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
                onFocus={(e) => {
                  e.currentTarget.showPicker?.();
                }}
                onClick={(e) => {
                  e.currentTarget.showPicker?.();
                }}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "0.55rem 0.7rem",
                  borderRadius: 9,
                  border: "1px solid #2a2f38",
                  background: "#111827",
                  color: "#fff",
                }}
              />
              <small style={{ color: "#9ca3af" }}>
                Future dates are available up to 16 days ahead based on forecast data.
              </small>
            </label>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.62rem 0.9rem",
                borderRadius: 9,
                border: "none",
                cursor: loading ? "default" : "pointer",
                background: "#f3f4f6",
                color: "#111827",
                fontWeight: 600,
                transition: "opacity 150ms ease, transform 150ms ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {loading ? "Evaluating…" : "Evaluate Location"}
            </button>

            {error && (
              <p style={{ margin: 0, color: "#fca5a5" }} role="alert" aria-live="polite">
                {error}
              </p>
            )}
          </form>
      </section>

      <section
        style={{
          position: "absolute",
          left: infoRect.x,
          top: infoRect.y,
          width: infoRect.width,
          height: infoRect.height,
          boxSizing: "border-box",
          overflowY: "auto",
          overflowX: "hidden",
          background: "rgba(22, 28, 38, 0.95)",
          border: "1px solid rgba(107, 114, 128, 0.65)",
          borderRadius: 14,
          padding: "14px 16px",
          zIndex: 1000,
          boxShadow: "0 10px 36px rgba(0, 0, 0, 0.55)",
          visibility: isInfoPanelReady ? "visible" : "hidden",
        }}
      >
        <div
          onPointerDown={(e) => startDrag(e, "info")}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            cursor: "move",
            background: "transparent",
            borderTopLeftRadius: 14,
            borderTopRightRadius: 14,
          }}
        />

        <div
          onPointerDown={(e) => startResize(e, "info")}
          onPointerMove={onResizeMove}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          style={{
            position: "absolute",
            right: 8,
            bottom: 8,
            width: 14,
            height: 14,
            cursor: "nwse-resize",
            borderRight: "2px solid #9ca3af",
            borderBottom: "2px solid #9ca3af",
          }}
        />

        {!result && (
          <p style={{ margin: 0, color: "#d1d5db" }}>
            Choose a location and date to see stargazing conditions here.
          </p>
        )}

        {result && (
          <>
            <h2 style={{ margin: 0, fontSize: "1.02rem" }}>{result.location.name}</h2>
            <p style={{ margin: "0.25rem 0 0.75rem", color: "#9ca3af", fontSize: "0.9rem" }}>
              {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div>
                <strong>Date</strong>
                <p style={{ margin: "0.25rem 0 0" }}>
                  {evaluatedDate
                    ? new Date(`${evaluatedDate}T12:00:00`).toLocaleDateString()
                    : "—"}
                </p>
              </div>
              <div>
                <strong>Score</strong>
                <p style={{ margin: "0.25rem 0 0" }}>{result.score.value} / 100</p>
              </div>
              <div>
                <strong>Cloud Cover</strong>
                <p style={{ margin: "0.25rem 0 0" }}>{result.weather.averageCloudCover.toFixed(1)}%</p>
              </div>
              <div>
                <strong>Moon Illumination</strong>
                <p style={{ margin: "0.25rem 0 0" }}>{(result.moon.illumination * 100).toFixed(1)}%</p>
              </div>
              <div>
                <strong>Moon During Window</strong>
                <p style={{ margin: "0.25rem 0 0" }}>{result.moon.aboveHorizonDuringWindow ? "Yes" : "No"}</p>
              </div>
              <div>
                <strong>Sunset</strong>
                <p style={{ margin: "0.25rem 0 0" }}>{new Date(result.sun.sunset).toLocaleTimeString()}</p>
              </div>
              <div>
                <strong>Astronomical Dusk</strong>
                <p style={{ margin: "0.25rem 0 0" }}>
                  {new Date(result.sun.astronomicalDusk).toLocaleTimeString()}
                </p>
              </div>
            </div>

            <div style={{ marginTop: "0.85rem" }}>
              <strong>Reasoning</strong>
              <ul style={{ margin: "0.35rem 0 0", paddingLeft: "1.15rem" }}>
                {result.score.reasons.map((reason, index) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
