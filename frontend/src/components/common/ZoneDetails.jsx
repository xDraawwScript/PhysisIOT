import React, { useState, useEffect } from "react";
import "../../styles/zonedetails.css";
import HistoryChart from "../HistoryChart";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function ZoneDetails({ zone, onToggleSubscription, isSensorMode, useDailyAPI }) {
    const [activeTab, setActiveTab] = useState("current");
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (zone) setOpen(true);
        const handleResize = () => setIsMobile(window.innerWidth <= 900);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [zone]);

    const getRiskColor = (level) => {
        switch (level) {
            case "Faible": return "#4CAF50";
            case "Moyen": return "#FF9800";
            case "Élevé": return "#F44336";
            default: return "#999";
        }
    };

    const getRiskLabel = (key) => {
        const labels = {
            fire: "Incendie",
            flood: "Inondation",
            ice: "Verglas",
            storm: "Tempête"
        };
        return labels[key] || key;
    };

    const exportToCSV = async () => {
        if (!zone) {
            alert("Aucune zone sélectionnée");
            return;
        }

        // Ajouter le BOM UTF-8 pour Excel
        const BOM = "\uFEFF";
        
        // En-tête du fichier
        const csvData = [
            ["DONNÉES DE LA ZONE:", zone.name],
            ["Date d'export:", new Date().toLocaleString('fr-FR')],
            ["Source de données:", isSensorMode ? "Capteurs" : "API"],
            [],
            ["MÉTÉO EN TEMPS RÉEL"],
            []
        ];

        // Ajouter les données météo si disponibles
        if (zone.weather) {
            csvData.push(
                ["Métrique", "Valeur"],
                ["Température", `${zone.weather.temperature[0]}°C`],
                ["Humidité", `${zone.weather.relativehumidity[0]}%`]
            );
            
            if (isSensorMode && zone.weather.gaz !== undefined) {
                csvData.push(["Gaz / Fumée", `${zone.weather.gaz[0]} ppm`]);
            } else {
                csvData.push(
                    ["Vitesse du vent", `${zone.weather.windspeed[0]} km/h`],
                    ["Probabilité de pluie", `${zone.weather.precipitation_probability[0]}%`]
                );
            }
            
            csvData.push([]);
        }

        // Ajouter les risques
        csvData.push(
            ["ANALYSE DES RISQUES"],
            [],
            ["Type de risque", "Niveau"]
        );

        if (zone.risks) {
            Object.entries(zone.risks).forEach(([key, level]) => {
                csvData.push([getRiskLabel(key), level]);
            });
        }

        // Ajouter les prévisions
        if (zone.forecast) {
            csvData.push(
                [],
                ["PRÉVISIONS À COURT TERME"],
                [],
                [zone.forecast]
            );
        }

        // Récupérer et ajouter l'historique
        try {
            const res = await fetch(`${API_URL}/api/history/${encodeURIComponent(zone.name)}?days=7`);
            if (res.ok) {
                const historyData = await res.json();
                
                if (historyData && historyData.length > 0) {
                    csvData.push(
                        [],
                        ["HISTORIQUE SUR 7 JOURS"],
                        [],
                        ["Date", "Température (°C)", "Humidité (%)", "Vent (km/h)"]
                    );
                    
                    historyData.forEach(day => {
                        csvData.push([
                            day.date || "--",
                            day.temperature != null ? day.temperature : "--",
                            day.humidity != null ? day.humidity : "--",
                            day.windSpeed != null ? day.windSpeed : "--"
                        ]);
                    });
                }
            }
        } catch (error) {
            console.error("Erreur lors de la récupération de l'historique:", error);
            // On continue l'export même si l'historique n'est pas disponible
        }

        // Convertir en CSV avec point-virgule
        const csv = BOM + csvData.map(row => row.join(";")).join("\n");

        // Créer et télécharger le fichier
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const timestamp = new Date().toISOString().slice(0, 10);
        a.download = `donnees-${zone.name.replace(/\s+/g, '-')}-${timestamp}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const content = zone ? (
        <>
            <div className="zone-tabs">
                <button
                    className={`tab-btn ${activeTab === "current" ? "active" : ""}`}
                    onClick={() => setActiveTab("current")}
                >
                    Données actuelles
                </button>
                <button
                    className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
                    onClick={() => setActiveTab("history")}
                >
                    Historique
                </button>
            </div>

            {activeTab === "current" ? (
                <>
                    {/* SECTION DONNÉES TEMPS RÉEL */}
                    <div className="zone-section">
                        <h3>
                            {isSensorMode ? "Données Capteurs (Direct)" : "Données Météo (API)"}
                        </h3>

                        {zone.weather ? (
                            <>
                                {/* 1. TEMPÉRATURE (Toujours visible) */}
                                <div className="sensor-item">
                                    <span>Température</span>
                                    <span>{zone.weather.temperature[0]}°C</span>
                                </div>

                                {/* 2. HUMIDITÉ (Toujours visible) */}
                                <div className="sensor-item">
                                    <span>Humidité</span>
                                    <span>{zone.weather.relativehumidity[0]}%</span>
                                </div>

                                {/* 3. BRANCHEMENT CONDITIONNEL */}
                                {isSensorMode ? (
                                    // >>> CAS CAPTEUR : On affiche GAZ (et on cache vent/pluie)
                                    <div className="sensor-item" style={{ borderLeft: "3px solid #FF9800" }}>
                                        <span>Gaz / Fumée</span>
                                        {/* On affiche la valeur du gaz ou '--' si absent */}
                                        <span>
                                            {zone.weather.gaz !== undefined 
                                                ? `${zone.weather.gaz[0]} ppm` 
                                                : "-- ppm"}
                                        </span>
                                    </div>
                                ) : (
                                    // >>> CAS API : On affiche VENT et PLUIE
                                    <>
                                        <div className="sensor-item">
                                            <span>Vitesse du vent</span>
                                            <span>{zone.weather.windspeed[0]} km/h</span>
                                        </div>
                                        <div className="sensor-item">
                                            <span>Probabilité de pluie</span>
                                            <span>{zone.weather.precipitation_probability[0]}%</span>
                                        </div>
                                    </>
                                )}
                            </>
                        ) : (
                            <p>Données non disponibles pour le moment.</p>
                        )}
                    </div>

                    {/* SECTION RISQUES */}
                    <div className="zone-section">
                        <h3>Tous les risques pour cette zone</h3>
                        {zone.risks ? (
                            Object.entries(zone.risks).map(([key, level]) => (
                                <div key={key} className="risk-item" style={{ borderColor: getRiskColor(level) }}>

                                    <span>
                                        {key === "incendie" || key === "fire" ? "Incendie"
                                            : key === "flood" || key === "inondation" ? "Inondation"
                                            : key === "ice" || key === "verglas" ? "Verglas"
                                            : key === "storm" || key === "tempête" ? "Tempête"
                                            : key}
                                    </span>
                                    <span>{getRiskLabel(key)}</span>
                                    <span style={{ color: getRiskColor(level), fontWeight: "bold" }}>
                                        {level}
                                    </span>
                                </div>
                            ))
                        ) : <p>Aucun risque enregistré</p>}
                    </div>

                    <div className="zone-section">
                        <h3>Prévisions à court terme</h3>
                        <p>{zone.forecast || "Cliquer sur une zone pour voir les prévisions"}</p>
                    </div>
                </>
            ) : (
                <div className="zone-section">
                    <h3>Historique sur 7 jours</h3>
                    <HistoryChart zoneId={zone.name} useDailyAPI={useDailyAPI} />
                </div>
            )}
        </>
    ) : (
        <p style={{ padding: "20px" }}>Aucune zone sélectionnée</p>
    );

    return (
        <>
            <button
                className={`zone-details-toggle-btn ${open ? "btn-red" : ""}`}
                onClick={() => setOpen(!open)}
            >
                {open ? "Fermer" : "Zones"}
            </button>
            {open && (
                <div className={`zone-details-container ${isMobile ? "mobile" : ""}`}>
                    {zone && (
                        <div className="zone-details-header">
                            <h2>{zone.name}</h2>
                            {isMobile && (
                                <button className="close-btn" onClick={() => setOpen(false)}>✕</button>
                            )}
                        </div>
                    )}
                    <div className="zone-content">
                        {content}
                    </div>
                    <div className="zone-actions">
                        {onToggleSubscription && (
                            <button className="action-btn" onClick={onToggleSubscription}>
                                {zone?.subscribed ? "Se désabonner" : "S'abonner aux alertes"}
                            </button>
                        )}
                        <button className="action-btn" onClick={exportToCSV}>
                            Exporter les données
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}