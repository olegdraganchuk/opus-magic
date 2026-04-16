export type ProviderKey = "open-meteo" | "wttr";

export type WeatherResult = {
  location: string;
  tempC: number | null;
  feelsLikeC: number | null;
  humidity: number | null;
  windKph: number | null;
  conditions: string;
  observedAt: string | null;
  provider: string;
};

export const PROVIDERS: Record<ProviderKey, { label: string }> = {
  "open-meteo": { label: "Open-Meteo" },
  wttr: { label: "wttr.in" },
};

export async function fetchWeather(
  provider: ProviderKey,
  query: string,
): Promise<WeatherResult> {
  if (provider === "open-meteo") return fetchOpenMeteo(query);
  if (provider === "wttr") return fetchWttr(query);
  throw new Error(`Unknown provider: ${provider}`);
}

async function fetchOpenMeteo(query: string): Promise<WeatherResult> {
  const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
  geoUrl.searchParams.set("name", query);
  geoUrl.searchParams.set("count", "1");
  geoUrl.searchParams.set("language", "en");
  geoUrl.searchParams.set("format", "json");

  const geoRes = await fetch(geoUrl, { cache: "no-store" });
  if (!geoRes.ok) throw new Error("Open-Meteo geocoding failed.");
  const geo = (await geoRes.json()) as {
    results?: Array<{
      name: string;
      latitude: number;
      longitude: number;
      country?: string;
      admin1?: string;
    }>;
  };
  const place = geo.results?.[0];
  if (!place) throw new Error(`No location found for "${query}".`);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(place.latitude));
  url.searchParams.set("longitude", String(place.longitude));
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

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Open-Meteo forecast request failed.");
  const json = (await res.json()) as {
    current?: {
      time?: string;
      temperature_2m?: number;
      apparent_temperature?: number;
      relative_humidity_2m?: number;
      weather_code?: number;
      wind_speed_10m?: number;
    };
  };
  const c = json.current ?? {};

  return {
    location: [place.name, place.admin1, place.country].filter(Boolean).join(", "),
    tempC: c.temperature_2m ?? null,
    feelsLikeC: c.apparent_temperature ?? null,
    humidity: c.relative_humidity_2m ?? null,
    windKph: c.wind_speed_10m ?? null,
    conditions: describeWeatherCode(c.weather_code),
    observedAt: c.time ?? null,
    provider: "Open-Meteo",
  };
}

async function fetchWttr(query: string): Promise<WeatherResult> {
  const url = `https://wttr.in/${encodeURIComponent(query)}?format=j1`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`wttr.in request failed (${res.status}).`);
  const json = (await res.json()) as {
    current_condition?: Array<{
      temp_C?: string;
      FeelsLikeC?: string;
      humidity?: string;
      windspeedKmph?: string;
      weatherDesc?: Array<{ value: string }>;
      localObsDateTime?: string;
      observation_time?: string;
    }>;
    nearest_area?: Array<{
      areaName?: Array<{ value: string }>;
      region?: Array<{ value: string }>;
      country?: Array<{ value: string }>;
    }>;
  };

  const current = json.current_condition?.[0] ?? {};
  const area = json.nearest_area?.[0] ?? {};

  const name = area.areaName?.[0]?.value ?? "";
  const region = area.region?.[0]?.value ?? "";
  const country = area.country?.[0]?.value ?? "";
  const location = [name, region, country].filter(Boolean).join(", ") || query;

  return {
    location,
    tempC: toNumber(current.temp_C),
    feelsLikeC: toNumber(current.FeelsLikeC),
    humidity: toNumber(current.humidity),
    windKph: toNumber(current.windspeedKmph),
    conditions: current.weatherDesc?.[0]?.value ?? "",
    observedAt: current.localObsDateTime ?? current.observation_time ?? null,
    provider: "wttr.in",
  };
}

function toNumber(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function describeWeatherCode(code: number | undefined): string {
  if (code == null) return "Unknown";
  const map: Record<number, string> = {
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
  return map[code] ?? "Unknown";
}
