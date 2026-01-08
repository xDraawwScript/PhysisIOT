import React, { useEffect, useState } from "react";
import { getWeather } from "../services/api";
import WeatherCard from "../components/WeatherCard";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Home() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    getWeather().then((data) => setWeather(data));
    console.log("Données récupérées :", data);
  }, []);
  if (!weather) return <LoadingSpinner />;
  const meteo = weather.data_1h;
  return (
    <div className="container">
      <h1>Météo – Sophia Antipolis</h1>
      <WeatherCard
        temperature={meteo.temperature[0]}
        humidity={meteo.relativehumidity[0]}
        wind={meteo.windspeed[0]}
        rainProb={meteo.precipitation_probability[0]}
      />
    </div>
  );
}
