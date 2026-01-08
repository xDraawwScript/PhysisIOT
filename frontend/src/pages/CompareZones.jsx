import React, { useState, useEffect } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";

export default function CompareZones() {
  const [zone1, setZone1] = useState("Valbonne");
  const [zone2, setZone2] = useState("Biot");
  const [loading, setLoading] = useState(false);
  const [weatherData, setWeatherData] = useState({});
  const [error, setError] = useState(null);
  const [useDailyAPI, setUseDailyAPI] = useState(false); // false = hourly, true = daily

  // Liste des zones disponibles avec leurs coordonnées GPS
  const zones = [
    { name: "Valbonne", lat: 43.6397, lon: 7.0106 },
    { name: "Biot", lat: 43.6283, lon: 7.0961 },
    { name: "Sophia Antipolis", lat: 43.6167, lon: 7.0671 }
  ];

  // Fonction pour récupérer les données météo horaires
  const fetchHourlyWeather = async (zoneName, lat, lon) => {
    const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&hourly=precipitation_probability&timezone=Europe/Paris`;
    
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erreur API pour ${zoneName}`);
      }
      const data = await response.json();
      
      return {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        precipitation: data.current.precipitation,
        precipitationProbability: data.hourly?.precipitation_probability?.[0] ?? 0
      };
    } catch (err) {
      console.error(`Erreur pour ${zoneName}:`, err);
      throw err;
    }
  };

  // Fonction pour récupérer les données météo journalières (Open-Meteo daily)
  const fetchDailyWeather = async (zoneName, lat, lon) => {
    const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,wind_speed_10m_max,precipitation_sum,precipitation_probability_max&timezone=Europe/Paris`;
    
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`Erreur API pour ${zoneName}`);
      }
      const data = await response.json();
      
      // Utilise les données du jour actuel (index 0)
      const avgTemp = data.daily?.temperature_2m_max?.[0] 
        ? (data.daily.temperature_2m_max[0] + (data.daily.temperature_2m_min?.[0] ?? data.daily.temperature_2m_max[0])) / 2
        : 0;
      
      return {
        temperature: avgTemp,
        humidity: data.daily?.relative_humidity_2m_mean?.[0] ?? 0,
        windSpeed: data.daily?.wind_speed_10m_max?.[0] ?? 0,
        precipitation: data.daily?.precipitation_sum?.[0] ?? 0,
        precipitationProbability: data.daily?.precipitation_probability_max?.[0] ?? 0
      };
    } catch (err) {
      console.error(`Erreur pour ${zoneName}:`, err);
      throw err;
    }
  };

  // Récupérer les données pour toutes les zones
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const allData = {};
        
        // Récupérer les données pour chaque zone selon le mode
        for (const zone of zones) {
          let weather;
          
          if (useDailyAPI) {
            weather = await fetchDailyWeather(zone.name, zone.lat, zone.lon);
          } else {
            weather = await fetchHourlyWeather(zone.name, zone.lat, zone.lon);
          }
          
          allData[zone.name] = weather;
        }
        
        setWeatherData(allData);
        console.log("Données récupérées:", allData);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [useDailyAPI]);

  // Données des deux zones sélectionnées
  const data1 = weatherData[zone1];
  const data2 = weatherData[zone2];

  // Calculer la différence entre deux valeurs
  const calculateDiff = (val1, val2, unit = "") => {
    if (val1 === undefined || val2 === undefined || val1 === null || val2 === null) {
      return "-";
    }
    const diff = Math.abs(val1 - val2);
    return `${diff.toFixed(1)}${unit}`;
  };

  // Exporter la comparaison en CSV
  const exportToCSV = () => {
    if (!data1 || !data2) {
      alert("Données non disponibles pour l'export");
      return;
    }

    const BOM = "\uFEFF";
    const modeLabel = useDailyAPI ? "API Journalière (Open-Meteo)" : "API Horaire (Open-Meteo)";
    
    const csvData = [
      ["Comparaison de zones météo"],
      ["Date d'export", new Date().toLocaleString('fr-FR')],
      ["Source", modeLabel],
      [],
      ["Métrique", zone1, zone2, "Différence"],
      ["Température", `${data1.temperature}°C`, `${data2.temperature}°C`, calculateDiff(data1.temperature, data2.temperature, "°C")],
      ["Humidité", `${data1.humidity}%`, `${data2.humidity}%`, calculateDiff(data1.humidity, data2.humidity, "%")],
      ["Vitesse du vent", `${data1.windSpeed} km/h`, `${data2.windSpeed} km/h`, calculateDiff(data1.windSpeed, data2.windSpeed, " km/h")],
      ["Précipitation actuelle", `${data1.precipitation} mm`, `${data2.precipitation} mm`, calculateDiff(data1.precipitation, data2.precipitation, " mm")],
      ["Probabilité de pluie", `${data1.precipitationProbability}%`, `${data2.precipitationProbability}%`, calculateDiff(data1.precipitationProbability, data2.precipitationProbability, "%")]
    ];

    const csv = BOM + csvData.map(row => row.join(";")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    a.download = `comparaison-${zone1.replace(/\s+/g, '-')}-${zone2.replace(/\s+/g, '-')}-${timestamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      padding: "32px",
      maxWidth: "1400px",
      margin: "0 auto",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      <h1 style={{
        fontSize: "32px",
        fontWeight: "700",
        marginBottom: "8px",
        color: "#1a1a1a"
      }}>
        Comparaison de zones
      </h1>
      
      <p style={{
        fontSize: "16px",
        color: "#666",
        marginBottom: "24px"
      }}>
        Comparez les données météo en temps réel de deux zones
      </p>

      {/* Sélecteur de mode API - Style Sidebar */}
      <div style={{
        background: "#fff",
        border: "1px solid #e0e0e0",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px"
      }}>
        <h3 style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          color: "#1a1a1a"
        }}>
          Choix de l'API
        </h3>
        
        {["API horaire", "API journalière"].map((label, idx) => {
          const isActive = 
            (label === "API horaire" && !useDailyAPI) ||
            (label === "API journalière" && useDailyAPI);
          
          const onClick = () => {
            setUseDailyAPI(label === "API journalière");
          };
          
          return (
            <div
              key={idx}
              onClick={onClick}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: idx < 1 ? "10px" : "0",
                cursor: "pointer",
                padding: "8px 0"
              }}
            >
              <p style={{ margin: 0, fontSize: "15px", color: "#333" }}>{label}</p>
              <div style={{
                width: "44px",
                height: "22px",
                background: isActive ? "#4CAF50" : "#ccc",
                borderRadius: "34px",
                position: "relative",
                transition: ".3s"
              }}>
                <div style={{
                  width: "18px",
                  height: "18px",
                  background: "#fff",
                  borderRadius: "50%",
                  position: "absolute",
                  bottom: "2px",
                  left: isActive ? "22px" : "2px",
                  transition: ".3s"
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Badge de statut */}
      <div style={{
        padding: "12px 16px",
        marginBottom: "32px",
        borderRadius: "8px",
        background: loading ? "#fff3e0" : error ? "#ffebee" : "#e8f5e9",
        border: `1px solid ${loading ? "#ff9800" : error ? "#f44336" : "#4CAF50"}`,
        color: loading ? "#e65100" : error ? "#c62828" : "#2e7d32",
        fontWeight: "500",
        fontSize: "14px"
      }}>
        {loading && "⏳ Chargement des données..."}
        {error && `❌ ${error}`}
        {!loading && !error && !useDailyAPI && "✓ Mode: API Horaire (Open-Meteo) - Données en temps réel"}
        {!loading && !error && useDailyAPI && "✓ Mode: API Journalière (Open-Meteo) - Données quotidiennes"}
      </div>

      {loading ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px",
          gap: "12px",
          color: "#666"
        }}>
          <Loader2 size={24} className="animate-spin" />
          <span>Récupération des données...</span>
        </div>
      ) : error ? (
        <div style={{
          background: "#fff",
          border: "1px solid #e0e0e0",
          borderRadius: "12px",
          padding: "48px 24px",
          textAlign: "center"
        }}>
          <p style={{ fontSize: "18px", color: "#c62828", marginBottom: "8px" }}>
            {error}
          </p>
          <p style={{ fontSize: "14px", color: "#666" }}>
            Veuillez vérifier votre connexion et réessayer
          </p>
        </div>
      ) : (
        <>
          {/* Sélection des zones */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "24px",
            marginBottom: "32px"
          }}>
            <div style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              padding: "24px"
            }}>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#1a1a1a"
              }}>
                Zone 1
              </h3>
              <div style={{ position: "relative" }}>
                <select
                  value={zone1}
                  onChange={(e) => setZone1(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 16px",
                    fontSize: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#f5f5f5",
                    cursor: "pointer",
                    appearance: "none",
                    outline: "none"
                  }}
                >
                  {zones.map(z => (
                    <option key={z.name} value={z.name}>{z.name}</option>
                  ))}
                </select>
                <ChevronDown 
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "#666"
                  }}
                  size={20}
                />
              </div>
            </div>

            <div style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              padding: "24px"
            }}>
              <h3 style={{
                fontSize: "20px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#1a1a1a"
              }}>
                Zone 2
              </h3>
              <div style={{ position: "relative" }}>
                <select
                  value={zone2}
                  onChange={(e) => setZone2(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 40px 12px 16px",
                    fontSize: "16px",
                    border: "1px solid #ddd",
                    borderRadius: "8px",
                    background: "#f5f5f5",
                    cursor: "pointer",
                    appearance: "none",
                    outline: "none"
                  }}
                >
                  {zones.map(z => (
                    <option key={z.name} value={z.name}>{z.name}</option>
                  ))}
                </select>
                <ChevronDown 
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    color: "#666"
                  }}
                  size={20}
                />
              </div>
            </div>
          </div>

          {/* Tableau de comparaison */}
          {data1 && data2 ? (
            <>
              <div style={{
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: "12px",
                padding: "24px",
                overflowX: "auto"
              }}>
                <table style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "15px"
                }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e0e0e0" }}>
                      <th style={{
                        textAlign: "left",
                        padding: "16px",
                        fontWeight: "600",
                        color: "#1a1a1a"
                      }}>
                        Métrique
                      </th>
                      <th style={{
                        textAlign: "left",
                        padding: "16px",
                        fontWeight: "600",
                        color: "#1a1a1a"
                      }}>
                        {zone1}
                      </th>
                      <th style={{
                        textAlign: "left",
                        padding: "16px",
                        fontWeight: "600",
                        color: "#1a1a1a"
                      }}>
                        {zone2}
                      </th>
                      <th style={{
                        textAlign: "left",
                        padding: "16px",
                        fontWeight: "600",
                        color: "#1a1a1a"
                      }}>
                        Différence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px", color: "#333" }}>Température</td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data1.temperature?.toFixed(1)}°C
                      </td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data2.temperature?.toFixed(1)}°C
                      </td>
                      <td style={{ padding: "16px", color: "#666", fontWeight: "500" }}>
                        {calculateDiff(data1.temperature, data2.temperature, "°C")}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px", color: "#333" }}>Humidité</td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data1.humidity}%
                      </td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data2.humidity}%
                      </td>
                      <td style={{ padding: "16px", color: "#666", fontWeight: "500" }}>
                        {calculateDiff(data1.humidity, data2.humidity, "%")}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px", color: "#333" }}>Vitesse du vent</td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data1.windSpeed?.toFixed(1)} km/h
                      </td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data2.windSpeed?.toFixed(1)} km/h
                      </td>
                      <td style={{ padding: "16px", color: "#666", fontWeight: "500" }}>
                        {calculateDiff(data1.windSpeed, data2.windSpeed, " km/h")}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px", color: "#333" }}>Précipitation actuelle</td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data1.precipitation?.toFixed(1)} mm
                      </td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data2.precipitation?.toFixed(1)} mm
                      </td>
                      <td style={{ padding: "16px", color: "#666", fontWeight: "500" }}>
                        {calculateDiff(data1.precipitation, data2.precipitation, " mm")}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <td style={{ padding: "16px", color: "#333" }}>Probabilité de pluie</td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data1.precipitationProbability}%
                      </td>
                      <td style={{ padding: "16px", color: "#333" }}>
                        {data2.precipitationProbability}%
                      </td>
                      <td style={{ padding: "16px", color: "#666", fontWeight: "500" }}>
                        {calculateDiff(data1.precipitationProbability, data2.precipitationProbability, "%")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bouton d'export */}
              <div style={{
                marginTop: "24px",
                display: "flex",
                justifyContent: "flex-end"
              }}>
                <button
                  onClick={exportToCSV}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    background: "#1a1a1a",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = "#333"}
                  onMouseOut={(e) => e.currentTarget.style.background = "#1a1a1a"}
                >
                  <Download size={20} />
                  Exporter la comparaison (CSV)
                </button>
              </div>
            </>
          ) : (
            <div style={{
              background: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "12px",
              padding: "48px 24px",
              textAlign: "center"
            }}>
              <p style={{ fontSize: "16px", color: "#666" }}>
                Aucune donnée disponible pour les zones sélectionnées
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}