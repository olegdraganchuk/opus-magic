import WeatherClient from "./weather-client";

export default function Page() {
  return (
    <main className="app">
      <h1>Weather</h1>
      <p className="subtitle">Pick a location and a data provider.</p>
      <WeatherClient />
      <footer className="footer">
        <p>
          Data from{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener">
            Open-Meteo
          </a>{" "}
          and{" "}
          <a href="https://wttr.in/" target="_blank" rel="noopener">
            wttr.in
          </a>
          . Both are free and require no API key.
        </p>
      </footer>
    </main>
  );
}
