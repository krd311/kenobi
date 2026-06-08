"use client";

import { type FormEvent, type PointerEvent, useEffect, useState } from "react";
import { type PanelRect } from "@/app/hooks/useDraggablePanels";
import { dragHandleStyle, getBasePanelStyle, resizeHandleStyle } from "@/app/components/panelStyles";
import { EvaluateResponse, Location } from "@/types";
import styles from "./SearchPanel.module.css";

function formatTimeWithoutSeconds(value: string): string {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatOptionalNumber(value: number | null, digits: number): string {
  return value === null ? "Unavailable" : value.toFixed(digits);
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
      className={styles.panel}
      style={{
        ...getBasePanelStyle(rect),
        height: "auto",
      }}
    >
      <div
        className={styles.dragHandle}
        onPointerDown={onStartDrag}
        onPointerMove={onDragMove}
        onPointerUp={onEndDrag}
        onPointerCancel={onEndDrag}
        style={dragHandleStyle}
      ></div>
      <div
        onPointerDown={onStartResize}
        onPointerMove={onResizeMove}
        onPointerUp={onEndResize}
        onPointerCancel={onEndResize}
        style={resizeHandleStyle}
      />
      <h1 className={styles.title}>Stargazing Planner</h1>
      <p className={styles.description}>
        Search by city, address, or coordinates (lat, lon).
      </p>

      <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.locationRow}>
          <input
            className={`${styles.input} ${styles.locationInput}`}
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
          />

          <button
            className={styles.currentLocationButton}
            type="button"
            onClick={() => {
              setShowSuggestions(false);
              onUseCurrentLocation();
            }}
            disabled={loading}
            aria-label="Use my current location"
            title="Use my current location"
          >
            📍
          </button>

          {showSuggestions && (
            <div className={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <button
                  className={styles.suggestionButton}
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
                >
                  {suggestion.name}
                </button>
              ))}
              {loadingSuggestions && (
                <div className={styles.suggestionStatus}>Searching...</div>
              )}
            </div>
          )}
        </div>

        <div className={styles.fieldGroup}>
          <span>Date</span>
          <input
            className={`${styles.input} ${styles.dateInput}`}
            type="date"
            aria-label="Date"
            value={date}
            min={minDate}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            onClick={(e) => {
              e.currentTarget.showPicker?.();
            }}
          />
          <small className={styles.fieldHint}>
            Future dates are available up to 16 days ahead based on forecast data.
          </small>
        </div>

        <button
          className={styles.submitButton}
          type="submit"
          disabled={loading}
        >
          {loading ? "Evaluating…" : "Evaluate Location"}
        </button>

        {error && (
          <p className={styles.error} role="alert" aria-live="polite">
            {error}
          </p>
        )}
      </form>

      <div className={styles.evaluationSection}>
        <button
          className={styles.evaluationToggle}
          type="button"
          onClick={() => setIsEvaluationExpanded((current) => !current)}
          aria-expanded={isEvaluationExpanded}
          aria-controls="evaluation-results"
        >
          <span>Evaluation</span>
          <span className={styles.toggleLabel}>
            {isEvaluationExpanded ? "Hide" : "Show"}
          </span>
        </button>

        <div
          className={styles.evaluationResults}
          id="evaluation-results"
          style={{
            maxHeight: isEvaluationExpanded ? 1500 : 0,
            opacity: isEvaluationExpanded ? 1 : 0,
            transform: isEvaluationExpanded ? "translateY(0)" : "translateY(-4px)",
            pointerEvents: isEvaluationExpanded ? "auto" : "none",
          }}
          aria-hidden={!isEvaluationExpanded}
        >
          {loading && !result && (
            <p className={styles.loadingState}>Evaluating this area…</p>
          )}

          {!result && (
            <p className={styles.emptyState}>
              Choose a location and date, then evaluate to see stargazing details.
            </p>
          )}

          {result && (
            <>
              <h2 className={styles.resultTitle}>{result.location.name}</h2>
              <p className={styles.coordinates}>
                {result.location.latitude.toFixed(4)}, {result.location.longitude.toFixed(4)}
              </p>

              <div className={styles.metricGrid}>
                <div>
                  <strong>Date</strong>
                  <p className={styles.metricValue}>
                    {evaluatedDate
                      ? new Date(`${evaluatedDate}T12:00:00`).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div>
                  <strong>Score</strong>
                  <p className={styles.metricValue}>{result.score.value} / 100</p>
                </div>
                <div>
                  <strong>Cloud Cover</strong>
                  <p className={styles.metricValue}>
                    {result.weather.averageCloudCover.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <strong>Bortle Class</strong>
                  <p className={styles.metricValue}>
                    {result.lightPollution.bortleClass
                      ? `Class ${result.lightPollution.bortleClass}`
                      : "Unavailable"}
                  </p>
                </div>
                <div>
                  <strong>Sky Quality</strong>
                  <p className={styles.metricValue}>
                    {result.lightPollution.sqm === null
                      ? "Unavailable"
                      : `${formatOptionalNumber(result.lightPollution.sqm, 2)} mag/arcsec^2`}
                  </p>
                </div>
                <div>
                  <strong>Light Pollution</strong>
                  <p className={styles.metricValue}>{result.lightPollution.qualityLabel}</p>
                </div>
                <div>
                  <strong>Artificial Brightness</strong>
                  <p className={styles.metricValue}>
                    {result.lightPollution.artificialBrightnessRatio === null
                      ? "Unavailable"
                      : `${formatOptionalNumber(result.lightPollution.artificialBrightnessRatio, 2)}x natural`}
                  </p>
                </div>
                <div>
                  <strong>Moon Illumination</strong>
                  <p className={styles.metricValue}>
                    {(result.moon.illumination * 100).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <strong>Moon During Window</strong>
                  <p className={styles.metricValue}>
                    {result.moon.aboveHorizonDuringWindow ? "Yes" : "No"}
                  </p>
                </div>
                <div>
                  <strong>Sunset</strong>
                  <p className={styles.metricValue}>
                    {formatTimeWithoutSeconds(result.sun.sunset)}
                  </p>
                </div>
                <div>
                  <strong>Astronomical Dusk</strong>
                  <p className={styles.metricValue}>
                    {formatTimeWithoutSeconds(result.sun.astronomicalDusk)}
                  </p>
                </div>
              </div>

              <p className={styles.sourceNote}>
                Light pollution source: {result.lightPollution.source}
                {result.lightPollution.note ? ` (${result.lightPollution.note})` : ""}
              </p>

              <div className={styles.reasoning}>
                <strong>Reasoning</strong>
                <ul className={styles.reasonList}>
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
