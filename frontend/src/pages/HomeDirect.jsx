import React, { useEffect, useState } from "react";
import { getWeather } from "../services/api";
import LoadingSpinner from "../components/LoadingSpinner";

export default function HomeDirect() {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    getWeather().then((data) => setWeather(data));
  }, []);
  if (!weather) return <LoadingSpinner />;
  const { temperature_2m, relative_humidity_2m, wind_speed_10m } = weather.current;
  const rainProb = weather.hourly?.precipitation_probability?.[0] ?? 0;
  return (
    <div style={{
      padding: 16,
      maxWidth: 300,
      background: "#fff",
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
    }}>
      <h2 style={{ marginBottom: 12 }}>Météo – Sophia Antipolis</h2>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span>Température</span>
        <span>{temperature_2m}°C</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span>Humidité</span>
        <span>{relative_humidity_2m}%</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span>Vitesse du vent</span>
        <span>{wind_speed_10m} km/h</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span>Pluie</span>
        <span>{rainProb}%</span>
      </div>
    </div>
  );
}
