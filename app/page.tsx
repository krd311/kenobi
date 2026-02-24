"use client";

import { useState } from "react";
import { EvaluateResponse } from "@/types";

export default function Home() {
  const [city, setCity] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [result, setResult] = useState<EvaluateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const body =
        city.trim()
          ? { city: city.trim() }
          : { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };

      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Unknown error");
      } else {
        setResult(data as EvaluateResponse);
      }
    } catch {
      setError("Failed to reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>🔭 Stargazing Condition Evaluator</h1>
      <p>Enter a city name <strong>or</strong> latitude/longitude to get tonight's stargazing score.</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: 400 }}>
        <label>
          City name
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Austin, TX"
            style={{ display: "block", width: "100%", padding: "0.4rem", marginTop: "0.25rem" }}
          />
        </label>

        <p style={{ margin: 0, textAlign: "center" }}>— or —</p>

        <label>
          Latitude
          <input
            type="number"
            step="any"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            placeholder="e.g. 30.2672"
            style={{ display: "block", width: "100%", padding: "0.4rem", marginTop: "0.25rem" }}
          />
        </label>

        <label>
          Longitude
          <input
            type="number"
            step="any"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            placeholder="e.g. -97.7431"
            style={{ display: "block", width: "100%", padding: "0.4rem", marginTop: "0.25rem" }}
          />
        </label>

        <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
          {loading ? "Evaluating…" : "Evaluate"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: "1rem" }}>
          ❌ {error}
        </p>
      )}

      {result && (
        <section style={{ marginTop: "2rem" }}>
          <h2>Results for {result.location.name}</h2>
          <p>
            <strong>Coordinates:</strong> {result.location.latitude.toFixed(4)},{" "}
            {result.location.longitude.toFixed(4)}
          </p>

          <h3>☀️ Sun</h3>
          <ul>
            <li>Sunset: {new Date(result.sun.sunset).toLocaleTimeString()}</li>
            <li>Astronomical dusk: {new Date(result.sun.astronomicalDusk).toLocaleTimeString()}</li>
          </ul>

          <h3>🌕 Moon</h3>
          <ul>
            <li>Illumination: {(result.moon.illumination * 100).toFixed(1)}%</li>
            <li>Moonrise: {result.moon.moonrise ? new Date(result.moon.moonrise).toLocaleTimeString() : "None"}</li>
            <li>Moonset: {result.moon.moonset ? new Date(result.moon.moonset).toLocaleTimeString() : "None"}</li>
            <li>Above horizon during observing window: {result.moon.aboveHorizonDuringWindow ? "Yes" : "No"}</li>
          </ul>

          <h3>☁️ Weather</h3>
          <ul>
            <li>Average cloud cover: {result.weather.averageCloudCover.toFixed(1)}%</li>
          </ul>

          <h3>⭐ Score: {result.score.value} / 100</h3>
          <ul>
            {result.score.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
