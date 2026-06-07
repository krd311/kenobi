"use client";

import { type FormEvent, type PointerEvent, useEffect, useState } from "react";
import { type PanelRect } from "@/app/hooks/useDraggablePanels";
import { dragHandleStyle, getBasePanelStyle, resizeHandleStyle } from "@/app/components/panelStyles";
import { EvaluateResponse, Location } from "@/types";

export function SearchPanel({
  rect,
  loading,
  locationInput,
  setLocationInput,
  setSelectedSuggestion,
  setMapLatitude,
  setMapLongitude,
  showSuggestions,
  suggestions,
  loadingSuggestions,
  setShowSuggestions,
  setIsLocationInputFocused,
  onUseCurrentLocation,
  date,
  setDate,
  minDate,
  maxDate,
  error,
  result,
  evaluatedDate,
  onSubmit,
  onStartDrag,
  onDragMove,
  onEndDrag,
  onStartResize,
  onResizeMove,
  onEndResize,
  parseCoordinates,
}: {
  rect: PanelRect;
  loading: boolean;
  locationInput: string;
  setLocationInput: (value: string) => void;
  setSelectedSuggestion: (suggestion: Location | null) => void;
  setMapLatitude: (value: number | null) => void;
  setMapLongitude: (value: number | null) => void;
  showSuggestions: boolean;
  suggestions: Location[];
  loadingSuggestions: boolean;
  setShowSuggestions: (value: boolean) => void;
  setIsLocationInputFocused: (value: boolean) => void;
  onUseCurrentLocation: () => void;
  date: string;
  setDate: (value: string) => void;
  minDate: string;
  maxDate: string;
  error: string | null;
  result: EvaluateResponse | null;
  evaluatedDate: string | null;
  onSubmit: (e: FormEvent) => void;
  onStartDrag: (e: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndDrag: () => void;
  onStartResize: (e: PointerEvent<HTMLDivElement>) => void;
  onResizeMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndResize: () => void;
  parseCoordinates: (value: string) => { latitude: number; longitude: number } | null;
}) {
  const [isEvaluationExpanded, setIsEvaluationExpanded] = useState(false);

  useEffect(() => {
    if (result) {
      setIsEvaluationExpanded(true);
    }
  }, [result]);

  useEffect(() => {
    if (loading) {
      setIsEvaluationExpanded(true);
    }
  }, [loading]);

  return (
    <section
      style={{
        ...getBasePanelStyle(rect),
        height: "auto",
        overflow: "visible",
        padding: "14px",
        transition: "opacity 200ms ease, transform 200ms ease",
      }}
    >
      <div
        onPointerDown={onStartDrag}
        onPointerMove={onDragMove}
        onPointerUp={onEndDrag}
        onPointerCancel={onEndDrag}
        style={{
          fontSize: "0.8rem",
          color: "#9ca3af",
          marginBottom: "0.35rem",
          ...dragHandleStyle,
        }}
      ></div>
      <div
        onPointerDown={onStartResize}
        onPointerMove={onResizeMove}
        onPointerUp={onEndResize}
        onPointerCancel={onEndResize}
        style={resizeHandleStyle}
      />
      <h1 style={{ margin: 0, fontSize: "1.1rem" }}>Stargazing Planner</h1>
      <p style={{ margin: "0.35rem 0 0.8rem", color: "#d1d5db", fontSize: "0.92rem" }}>
        Search by city, address, or coordinates (lat, lon).
      </p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
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
              height: 44,
              padding: "0 0.75rem",
              borderRadius: 9,
              border: "1px solid #2a2f38",
              background: "#111827",
              color: "#fff",
            }}
          />

          <button
            type="button"
            onClick={() => {
              setShowSuggestions(false);
              onUseCurrentLocation();
            }}
            disabled={loading}
            aria-label="Use my current location"
            title="Use my current location"
            style={{
              width: 44,
              height: 44,
              borderRadius: 9,
              border: "1px solid #2a2f38",
              background: "#111827",
              color: "#cbd5e1",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.02em",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
              cursor: loading ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
            }}
          >
            📍
          </button>

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
                <div style={{ padding: "0.6rem 0.75rem", color: "#9ca3af" }}>Searching...</div>
              )}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
            fontSize: "0.92rem",
          }}
        >
          <span>Date</span>
          <input
            type="date"
            aria-label="Date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
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
              colorScheme: "dark",
            }}
          />
          <small style={{ color: "#9ca3af" }}>
            Future dates are available up to 16 days ahead based on forecast data.
          </small>
        </div>

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

      <div
        style={{
          marginTop: "0.9rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid rgba(107, 114, 128, 0.35)",
        }}
      >
        <button
          type="button"
          onClick={() => setIsEvaluationExpanded((current) => !current)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.5rem 0.6rem",
            borderRadius: 8,
            border: "1px solid #2a2f38",
            background: "#111827",
            color: "#f3f4f6",
            cursor: "pointer",
            fontWeight: 600,
            textAlign: "left",
          }}
          aria-expanded={isEvaluationExpanded}
          aria-controls="evaluation-results"
        >
          <span>Evaluation</span>
          <span style={{ color: "#9ca3af", fontSize: "0.85rem" }}>
            {isEvaluationExpanded ? "Hide" : "Show"}
          </span>
        </button>

        <div
          id="evaluation-results"
          style={{
            marginTop: "0.75rem",
            overflow: "hidden",
            maxHeight: isEvaluationExpanded ? 1200 : 0,
            opacity: isEvaluationExpanded ? 1 : 0,
            transform: isEvaluationExpanded ? "translateY(0)" : "translateY(-4px)",
            transition: "max-height 280ms ease, opacity 220ms ease, transform 220ms ease",
            pointerEvents: isEvaluationExpanded ? "auto" : "none",
          }}
          aria-hidden={!isEvaluationExpanded}
        >
          {loading && !result && (
            <p style={{ margin: "0 0 0.55rem", color: "#d1d5db" }}>Evaluating this area…</p>
          )}

          {!result && (
            <p style={{ margin: 0, color: "#d1d5db" }}>
              Choose a location and date, then evaluate to see stargazing details.
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
                      : "-"}
                  </p>
                </div>
                <div>
                  <strong>Score</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>{result.score.value} / 100</p>
                </div>
                <div>
                  <strong>Cloud Cover</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>
                    {result.weather.averageCloudCover.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <strong>Moon Illumination</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>
                    {(result.moon.illumination * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <strong>Moon During Window</strong>
                  <p style={{ margin: "0.25rem 0 0" }}>
                    {result.moon.aboveHorizonDuringWindow ? "Yes" : "No"}
                  </p>
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
        </div>
      </div>
    </section>
  );
}
