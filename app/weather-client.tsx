"use client";

import { useState, type FormEvent } from "react";
import type { ProviderKey, WeatherResult } from "@/lib/providers";

const PROVIDER_OPTIONS: Array<{ value: ProviderKey; label: string }> = [
  { value: "open-meteo", label: "Open-Meteo (open-meteo.com)" },
  { value: "wttr", label: "wttr.in" },
];

function formatTemp(c: number | null): string {
  if (c == null || Number.isNaN(c)) return "—";
  const f = (c * 9) / 5 + 32;
  return `${c.toFixed(1)}°C / ${f.toFixed(1)}°F`;
}

export default function WeatherClient() {
  const [location, setLocation] = useState("");
  const [provider, setProvider] = useState<ProviderKey>("open-meteo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherResult | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = location.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const url = `/api/weather?location=${encodeURIComponent(q)}&provider=${provider}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Request failed.");
      setData(json as WeatherResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch weather.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form className="controls" onSubmit={onSubmit}>
        <label className="field">
          <span>Location</span>
          <input
            type="text"
            placeholder="e.g. London, Tokyo, New York"
            autoComplete="off"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Provider</span>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as ProviderKey)}
          >
            {PROVIDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Get weather"}
        </button>
      </form>

      <section className="status" aria-live="polite">
        {error ? <span className="error">{error}</span> : null}
      </section>

      {data ? (
        <section className="result">
          <header className="result-header">
            <h2>{data.location}</h2>
            <span className="badge">{data.provider}</span>
          </header>
          <div className="result-grid">
            <Card label="Temperature" value={formatTemp(data.tempC)} />
            <Card label="Feels like" value={formatTemp(data.feelsLikeC)} />
            <Card label="Conditions" value={data.conditions || "—"} />
            <Card
              label="Humidity"
              value={data.humidity != null ? `${data.humidity}%` : "—"}
            />
            <Card
              label="Wind"
              value={
                data.windKph != null
                  ? `${data.windKph.toFixed(1)} km/h`
                  : "—"
              }
            />
            <Card
              label="Observed"
              value={
                data.observedAt
                  ? new Date(data.observedAt).toLocaleString()
                  : "—"
              }
            />
          </div>
        </section>
      ) : null}
    </>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <span className="label">{label}</span>
      <span className="value">{value}</span>
    </div>
  );
}
