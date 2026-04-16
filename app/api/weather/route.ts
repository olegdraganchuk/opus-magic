import { NextResponse } from "next/server";
import { fetchWeather, PROVIDERS, type ProviderKey } from "@/lib/providers";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim();
  const providerParam = searchParams.get("provider") ?? "open-meteo";

  if (!location) {
    return NextResponse.json({ error: "Missing location." }, { status: 400 });
  }
  if (!(providerParam in PROVIDERS)) {
    return NextResponse.json(
      { error: `Unknown provider: ${providerParam}` },
      { status: 400 },
    );
  }

  try {
    const data = await fetchWeather(providerParam as ProviderKey, location);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
