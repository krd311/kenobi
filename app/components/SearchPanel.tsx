"use client";

import { type FormEvent, type PointerEvent } from "react";
import { type PanelRect } from "@/app/hooks/useDraggablePanels";
import { dragHandleStyle, getBasePanelStyle, resizeHandleStyle } from "@/app/components/panelStyles";

interface PlaceSuggestion {
  name: string;
  latitude: number;
  longitude: number;
}

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
  date,
  setDate,
  minDate,
  maxDate,
  error,
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
  setSelectedSuggestion: (suggestion: PlaceSuggestion | null) => void;
  setMapLatitude: (value: number | null) => void;
  setMapLongitude: (value: number | null) => void;
  showSuggestions: boolean;
  suggestions: PlaceSuggestion[];
  loadingSuggestions: boolean;
  setShowSuggestions: (value: boolean) => void;
  setIsLocationInputFocused: (value: boolean) => void;
  date: string;
  setDate: (value: string) => void;
  minDate: string;
  maxDate: string;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onStartDrag: (e: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndDrag: () => void;
  onStartResize: (e: PointerEvent<HTMLDivElement>) => void;
  onResizeMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndResize: () => void;
  parseCoordinates: (value: string) => { latitude: number; longitude: number } | null;
}) {
  return (
    <section
      style={{
        ...getBasePanelStyle(rect),
        overflow: "auto",
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

        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.92rem" }}>
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
    </section>
  );
}
