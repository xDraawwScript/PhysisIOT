import React, { useEffect, useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function HistoryChart({ zoneId, useDailyAPI }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!zoneId) return;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        // MODE CAPTEURS
        if (useDailyAPI === null) {
          const res = await fetch(`${API_URL}/api/sensor-history/${encodeURIComponent(zoneId)}`);
          if (!res.ok) throw new Error('Erreur fetch historique capteurs');
          const json = await res.json();

          // Normalisation des données capteurs
          const normalized = json.map(d => ({
            date: d.date,
            temperature: d.temperature != null ? Number(d.temperature) : null,
            humidity: d.humidite != null ? Number(d.humidite) : null,
            gaz: d.gaz != null ? Number(d.gaz) : null
          }));
          setData(normalized);
        }
        // MODE API
        else {
          const res = await fetch(`${API_URL}/api/history/${encodeURIComponent(zoneId)}?days=7`);
          if (!res.ok) throw new Error('Erreur fetch historique');
          const json = await res.json();
          // ensure numbers are numbers
          const normalized = json.map(d => ({
            date: d.date,
            temperature: d.temperature != null ? Number(d.temperature) : null,
            humidity: d.humidity != null ? Number(d.humidity) : null,
            windSpeed: d.windSpeed != null ? Number(d.windSpeed) : null
          }));
          setData(normalized);
        }
      } catch (e) {
        console.error(e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [zoneId, useDailyAPI]);

  /**
   * Calcul des moyennes sur 7 jours
   */
  const averages = useMemo(() => {
    if (!data.length) return null;

    const avg = (key) => {
      const values = data
        .map(d => d[key])
        .filter(v => v !== null && !isNaN(v));

      if (!values.length) return null;
      return Math.round(
      (values.reduce((sum, v) => sum + v, 0) / values.length) * 100
      ) / 100;
    };

    const result = {
      temperature: avg("temperature"),
      humidity: avg("humidity")
    };

    // Ajouter windSpeed pour les API, gaz pour les capteurs
    if (useDailyAPI === null) {
      result.gaz = avg("gaz");
    } else {
      result.windSpeed = avg("windSpeed");
    }

    return result;
  }, [data, useDailyAPI]);

  if (loading) return <p>Chargement de l'historique...</p>;
  if (error) return <p>Erreur: {error}</p>;
  if (!data || data.length === 0) {
    return <p>
      {useDailyAPI === null
          ? "Aucune donnée capteur disponible pour cette zone."
          : "Aucun historique disponible (exécute /api/fetch-now ou attends la collecte quotidienne)."}
    </p>;
  }

  return (
    <div className="history-card" style={{
      background: "white",
      padding: "12px",
      borderRadius: "12px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
      marginTop: "10px"
    }}>
      <h3 style={{ marginBottom: "12px" }}>
        {useDailyAPI === null ? "Évolution des capteurs" : "Évolution sur 7 jours"}
      </h3>

      <div style={{ display: 'grid', gap: 18 }}>
        {/* Température */}
        <div>
          <p className="text-sm mb-1">
            <strong>Température (°C)</strong>
            <br />
            Moyenne : {averages?.temperature ?? "—"} °C
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="temperature" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Humidité */}
        <div>
          <p className="text-sm mb-1">
            <strong>Humidité (%)</strong>
            <br/>
            Moyenne : {averages?.humidity ?? "—"} %
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Vent (API) ou Gaz (Capteurs) */}
        {useDailyAPI === null ? (
          <div>
            <p className="text-sm mb-1">
              <strong>Gaz / Fumée (ppm)</strong>
              <br/>
              Moyenne : {averages?.gaz ?? "—"} ppm
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="gaz" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div>
            <p className="text-sm mb-1">
              <strong>Vent (km/h)</strong>
              <br/>
              Moyenne : {averages?.windSpeed ?? "—"} km/h
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="windSpeed" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
