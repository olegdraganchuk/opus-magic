const form = document.getElementById("weather-form");
const locationInput = document.getElementById("location");
const providerSelect = document.getElementById("provider");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const resultLocation = document.getElementById("result-location");
const resultProvider = document.getElementById("result-provider");
const resultTemp = document.getElementById("result-temp");
const resultFeels = document.getElementById("result-feels");
const resultConditions = document.getElementById("result-conditions");
const resultHumidity = document.getElementById("result-humidity");
const resultWind = document.getElementById("result-wind");
const resultTime = document.getElementById("result-time");

const PROVIDERS = {
  "open-meteo": { label: "Open-Meteo", fetch: fetchOpenMeteo },
  "wttr": { label: "wttr.in", fetch: fetchWttr },
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const location = locationInput.value.trim();
  const providerKey = providerSelect.value;
  if (!location) return;

  const provider = PROVIDERS[providerKey];
  if (!provider) {
    showError(`Unknown provider: ${providerKey}`);
    return;
  }

  setLoading(true, `Fetching weather from ${provider.label}…`);
  try {
    const data = await provider.fetch(location);
    renderResult(data, provider.label);
    setStatus("");
  } catch (err) {
    showError(err.message || "Failed to fetch weather.");
    resultEl.hidden = true;
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading, message = "") {
  submitBtn.disabled = isLoading;
  submitBtn.textContent = isLoading ? "Loading…" : "Get weather";
  if (message) setStatus(message);
}

function setStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.remove("error");
}

function showError(message) {
  statusEl.textContent = message;
  statusEl.classList.add("error");
}

function renderResult(data, providerLabel) {
  resultLocation.textContent = data.location;
  resultProvider.textContent = providerLabel;
  resultTemp.textContent = formatTemp(data.tempC);
  resultFeels.textContent = formatTemp(data.feelsLikeC);
  resultConditions.textContent = data.conditions || "—";
  resultHumidity.textContent =
    data.humidity != null ? `${data.humidity}%` : "—";
  resultWind.textContent =
    data.windKph != null ? `${data.windKph.toFixed(1)} km/h` : "—";
  resultTime.textContent = data.observedAt
    ? new Date(data.observedAt).toLocaleString()
    : "—";
  resultEl.hidden = false;
}

function formatTemp(c) {
  if (c == null || Number.isNaN(c)) return "—";
  const f = c * 9 / 5 + 32;
  return `${c.toFixed(1)}°C / ${f.toFixed(1)}°F`;
}

// --- Provider: Open-Meteo ---------------------------------------------------
// Geocoding: https://geocoding-api.open-meteo.com/v1/search?name=...
// Forecast:  https://api.open-meteo.com/v1/forecast?...&current=...

async function fetchOpenMeteo(query) {
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", query);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");

  const geoRes = await fetch(geoUrl);
  if (!geoRes.ok) throw new Error("Open-Meteo geocoding failed.");
  const geo = await geoRes.json();
  const place = geo.results && geo.results[0];
  if (!place) throw new Error(`No location found for "${query}".`);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", place.latitude);
  url.searchParams.set("longitude", place.longitude);
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "weather_code",
      "wind_speed_10m",
    ].join(","),
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo forecast request failed.");
  const json = await res.json();
  const current = json.current || {};

  const locationLabel = [place.name, place.admin1, place.country]
    .filter(Boolean)
    .join(", ");

  return {
    location: locationLabel,
    tempC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windKph: current.wind_speed_10m,
    conditions: describeWeatherCode(current.weather_code),
    observedAt: current.time,
  };
}

// WMO weather interpretation codes used by Open-Meteo.
function describeWeatherCode(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return map[code] || "Unknown";
}

// --- Provider: wttr.in ------------------------------------------------------
// https://wttr.in/<location>?format=j1

async function fetchWttr(query) {
  const url = `https://wttr.in/${encodeURIComponent(query)}?format=j1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`wttr.in request failed (${res.status}).`);
  const json = await res.json();

  const current = (json.current_condition && json.current_condition[0]) || {};
  const area = (json.nearest_area && json.nearest_area[0]) || {};

  const name = pickValue(area.areaName);
  const region = pickValue(area.region);
  const country = pickValue(area.country);
  const locationLabel =
    [name, region, country].filter(Boolean).join(", ") || query;

  const description = pickValue(current.weatherDesc);
  const observedAt =
    current.localObsDateTime || `${current.observation_time || ""}`;

  return {
    location: locationLabel,
    tempC: toNumber(current.temp_C),
    feelsLikeC: toNumber(current.FeelsLikeC),
    humidity: toNumber(current.humidity),
    windKph: toNumber(current.windspeedKmph),
    conditions: description,
    observedAt,
  };
}

function pickValue(field) {
  if (Array.isArray(field) && field.length) return field[0].value;
  return field || "";
}

function toNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
