"use client";

import { EvaluateResponse } from "@/types";
import { type PointerEvent } from "react";
import { type PanelRect } from "@/app/hooks/useDraggablePanels";
import { dragHandleStyle, getBasePanelStyle, resizeHandleStyle } from "@/app/components/panelStyles";

export function InfoPanel({
  rect,
  isReady,
  result,
  evaluatedDate,
  onStartDrag,
  onDragMove,
  onEndDrag,
  onStartResize,
  onResizeMove,
  onEndResize,
}: {
  rect: PanelRect;
  isReady: boolean;
  result: EvaluateResponse | null;
  evaluatedDate: string | null;
  onStartDrag: (e: PointerEvent<HTMLDivElement>) => void;
  onDragMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndDrag: () => void;
  onStartResize: (e: PointerEvent<HTMLDivElement>) => void;
  onResizeMove: (e: PointerEvent<HTMLDivElement>) => void;
  onEndResize: () => void;
}) {
  return (
    <section
      style={{
        ...getBasePanelStyle(rect),
        boxSizing: "border-box",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "14px 16px",
        visibility: isReady ? "visible" : "hidden",
      }}
    >
      <div
        onPointerDown={onStartDrag}
        onPointerMove={onDragMove}
        onPointerUp={onEndDrag}
        onPointerCancel={onEndDrag}
        style={dragHandleStyle}
      />

      <div
        onPointerDown={onStartResize}
        onPointerMove={onResizeMove}
        onPointerUp={onEndResize}
        onPointerCancel={onEndResize}
        style={resizeHandleStyle}
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
                {evaluatedDate ? new Date(`${evaluatedDate}T12:00:00`).toLocaleDateString() : "—"}
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
  );
}
