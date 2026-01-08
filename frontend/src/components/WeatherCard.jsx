import React from "react";
import logoMeteoblue from "../assets/logo-meteoblue.png";

export default function WeatherCard({ temperature, humidity, wind, rainProb}) {

  return (
    <div className="weather-card">
      <h2>Météo actuelle</h2>

      <img
        src={logoMeteoblue}
        alt="icone météo"
        className="weather-icon"
      />

      <p>Température : {temperature} °C</p>
      <p>Humidité : {humidity} %</p>
      <p>Vent : {wind} km/h</p>
      <p>Probabilité pluie : {rainProb} %</p>
    </div>
  );
}
