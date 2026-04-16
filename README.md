# Weather App

A tiny static weather app: pick a location and a data provider.

## Providers

Both are free and require **no API key**:

1. **[Open-Meteo](https://open-meteo.com/)** — uses the geocoding API to resolve
   the city name, then the forecast API for current conditions.
2. **[wttr.in](https://wttr.in/)** — queried directly with the location string
   via `https://wttr.in/<location>?format=j1`.

## Run

It's a static page — open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Files

- `index.html` — markup and form controls
- `styles.css` — styling
- `app.js` — provider logic and rendering
