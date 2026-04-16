# Weather App (Next.js)

Single-page weather app built with **Next.js 15 (App Router)**. Pick a location
and a free, no-API-key data provider.

## Providers

1. **[Open-Meteo](https://open-meteo.com/)** — geocodes the city, then fetches
   current conditions from the forecast API.
2. **[wttr.in](https://wttr.in/)** — queried directly via
   `https://wttr.in/<location>?format=j1`.

The provider calls live in `lib/providers.ts` and are invoked from an Edge API
route at `app/api/weather/route.ts`. The client UI is in
`app/weather-client.tsx`.

## Local development

```sh
npm install
npm run dev
# http://localhost:3000
```

## Deploy to Vercel

The repo is already wired for Vercel — pick whichever path you prefer:

**Option 1 — One click from GitHub:**
go to <https://vercel.com/new>, import this repo, and click **Deploy**. No env
vars are required.

**Option 2 — From your machine:**

```sh
npm i -g vercel
vercel login
vercel --prod
```
