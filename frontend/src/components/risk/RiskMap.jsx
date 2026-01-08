import React, { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import ZoneDetails from "../common/ZoneDetails";
import "../../styles/zonedetails.css";
import logoIUT from "../../assets/logo-iut.png";
import logoRepublique from "../../assets/logo-republique.png";
import { getWeather as getMeteoBlu, toggleZoneSubscription } from "../../services/api";
import { getWeather as getOpenMeteo } from "../../services/apiDirect";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Configuration des zones initiales
const initialZones = [
    {
        name: "Valbonne",
        polygon: [[43.62, 7.01], [43.62, 7.045], [43.60, 7.045], [43.60, 7.01]],
        risks: { incendie: "Faible", inondation: "Faible", verglas: "Faible", tempête: "Faible" },
        forecast: "En attente...",
        subscribed: false,
        sensorId: "CapteurValbonne", // Pas de capteur actif
        hasData: true // Par défaut visible au chargement
    },
    {
        name: "Biot",
        polygon: [[43.64, 7.08], [43.64, 7.11], [43.61, 7.11], [43.61, 7.08]],
        risks: { incendie: "Faible", inondation: "Faible", verglas: "Faible", tempête: "Faible" },
        forecast: "En attente...",
        subscribed: false,
        sensorId: "CapteurBiot", // Pas de capteur actif
        hasData: true
    },
    {
        name: "Sophia Antipolis",
        polygon: [[43.635, 7.05], [43.635, 7.075], [43.61, 7.075], [43.61, 7.05]],
        risks: { incendie: "Faible", inondation: "Faible", verglas: "Faible", tempête: "Faible" },
        forecast: "En attente...",
        subscribed: false,
        sensorId: "ESP8266_Zone_B", // LE SEUL CAPTEUR ACTIF EST ICI
        hasData: true
    }
];

const riskColors = { Faible: "green", Moyen: "orange", Élevé: "red" };

// Fonction de calcul des risques
const calculateRisks = (weather) => {
    if (!weather) return { incendie: "Faible", inondation: "Faible", verglas: "Faible", tempête: "Faible" };
    
    const t = weather.temperature[0] || 0;
    const h = weather.relativehumidity[0] || 0;
    const w = weather.windspeed[0] || 0;
    const p = weather.precipitation_probability[0] || 0;
    const g = weather.gaz ? weather.gaz[0] : 0; 

    let rFire = "Faible";
    if (g > 200) rFire = "Élevé";
    else if (g > 100) rFire = "Moyen";
    else if (t > 30 && h < 30) rFire = "Élevé";
    else if (t > 25 && h < 50) rFire = "Moyen";

    let rFlood = "Faible";
    if (p > 80) rFlood = "Élevé";
    else if (p > 50) rFlood = "Moyen";

    let rIce = "Faible";
    if (t <= 0) rIce = "Élevé";
    else if (t <= 3) rIce = "Moyen";

    let rStorm = "Faible";
    if (w > 90) rStorm = "Élevé";
    else if (w > 50) rStorm = "Moyen";

    return { incendie: rFire, inondation: rFlood, verglas: rIce, tempête: rStorm };
};

const getForecastText = (risks) => {
    const highs = Object.entries(risks).filter(([k, v]) => v === "Élevé").map(([k]) => k);
    if (highs.length > 0) return "⚠️ ALERTE : " + highs.join(", ").toUpperCase();

    const mediums = Object.entries(risks).filter(([k, v]) => v === "Moyen").map(([k]) => k);
    if (mediums.length > 0) return "Vigilance : " + mediums.join(", ");

    return "Conditions normales.";
};

export default function RiskMap({ selectedRisk, useDailyAPI, currentUser, onSubscriptionChange }) {
    const [mapZones, setMapZones] = useState(initialZones);
    const [selectedZone, setSelectedZone] = useState(initialZones[0]);
    const [globalWeatherData, setGlobalWeatherData] = useState(null);
    
    const mapRef = useRef(null); // Référence à l'instance de la carte
    const polygonRefs = useRef({}); // Référence aux polygones Leaflet
    const lastFetchRef = useRef(0);

    // Reset lors du changement de source
    useEffect(() => {
        lastFetchRef.current = 0;
        setGlobalWeatherData(null);
    }, [useDailyAPI]);

    // Polling des données
    useEffect(() => {
        let intervalId;

        const fetchData = async () => {
            // >>> MODE CAPTEURS (BDD)
            if (useDailyAPI === null) {
                try {
                    const response = await fetch(`${API_URL}/api/latest-sensors`);
                    if (!response.ok) throw new Error("Erreur DB");
                    const sensors = await response.json(); 

                    setMapZones(currentZones => currentZones.map(zone => {
                        const sensorData = sensors.find(s => s.deviceId === zone.sensorId);
                        
                        // Si on a des données capteur, on affiche la zone et on met à jour
                        if (sensorData) {
                            const weatherFormatted = {
                                temperature: [parseFloat(sensorData.temperature)],
                                relativehumidity: [parseFloat(sensorData.humidite)],
                                windspeed: [0], 
                                precipitation_probability: [0], 
                                gaz: [parseInt(sensorData.gaz)]
                            };

                            const risks = calculateRisks(weatherFormatted);
                            return {
                                ...zone,
                                risks: risks,
                                forecast: getForecastText(risks),
                                weather: weatherFormatted,
                                hasData: true // Données trouvées => Zone visible
                            };
                        }
                        
                        // Si pas de données capteur pour cette zone => Zone invisible
                        return { ...zone, hasData: false };
                    }));

                } catch (err) {
                    console.error("Erreur polling capteurs:", err);
                }
            } 
            // >>> MODE API EXTERNE
            else {
                const now = Date.now();
                if (now - lastFetchRef.current < 3600 * 1000 && globalWeatherData) return;

                try {
                    const data = useDailyAPI ? await getMeteoBlu() : await getOpenMeteo();
                    if (!data) return;
                    lastFetchRef.current = now;

                    let normalized;
                    if (useDailyAPI) {
                        normalized = {
                            temperature: Array.isArray(data.data_1h.temperature) ? data.data_1h.temperature : [data.data_1h.temperature ?? 0],
                            relativehumidity: Array.isArray(data.data_1h.relativehumidity) ? data.data_1h.relativehumidity : [data.data_1h.relativehumidity ?? 0],
                            windspeed: Array.isArray(data.data_1h.windspeed) ? data.data_1h.windspeed : [data.data_1h.windspeed ?? 0],
                            precipitation_probability: Array.isArray(data.data_1h.precipitation_probability) ? data.data_1h.precipitation_probability : [data.data_1h.precipitation_probability ?? 0]
                        };
                    } else {
                        normalized = {
                            temperature: Array.isArray(data.temperature) ? data.temperature : [data.temperature ?? 0],
                            relativehumidity: Array.isArray(data.relativehumidity || data.humidity) ? (data.relativehumidity ?? data.humidity) : [data.relativehumidity ?? data.humidity ?? 0],
                            windspeed: Array.isArray(data.windspeed || data.wind) ? (data.windspeed ?? data.wind) : [data.windspeed ?? data.wind ?? 0],
                            precipitation_probability: Array.isArray(data.precipitation_probability || data.rainProb) ? (data.precipitation_probability ?? data.rainProb) : [data.precipitation_probability ?? data.rainProb ?? 0]
                        };
                    }
                    
                    setGlobalWeatherData(normalized);
                    
                    const risks = calculateRisks(normalized);
                    const forecast = getForecastText(risks);
                    
                    // En mode API, toutes les zones sont visibles (hasData: true) car on applique la météo globale
                    setMapZones(prev => prev.map(z => ({
                        ...z,
                        risks,
                        forecast,
                        weather: normalized,
                        hasData: true
                    })));

                } catch (err) {
                    console.error("Erreur API Météo:", err);
                }
            }
        };

        fetchData();

        if (useDailyAPI === null) {
            intervalId = setInterval(fetchData, 10000);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [useDailyAPI]);

    // Synchro sélection
    useEffect(() => {
        if (selectedZone) {
            const updated = mapZones.find(z => z.name === selectedZone.name);
            if (updated) setSelectedZone(updated);
        }
    }, [mapZones]);

    // Synchro des abonnements au chargement 
    useEffect(() => {
        if (currentUser && currentUser.zones) {
            setMapZones(currentZones => currentZones.map(z => ({
                ...z,
                subscribed: currentUser.zones.includes(z.name)
            })));
        }
    }, [currentUser]);

    // Init Leaflet
    useEffect(() => {
        if (!document.getElementById("map")) return;

        const container = L.DomUtil.get("map");
        if(container != null) {
            container._leaflet_id = null;
        }

        const isMobile = window.innerWidth < 768;
        const initialZoom = isMobile ? 11 : 13;
        const map = L.map("map", { zoomControl: false }).setView([43.6167, 7.0676], initialZoom);
        mapRef.current = map; // Sauvegarde de la réf pour usage ultérieur
            
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "© OpenStreetMap contributors"
        }).addTo(map);

        // Logos
        const logosControl = L.control({ position: "topright" });
        logosControl.onAdd = () => {
            const div = L.DomUtil.create("div", "logos-container");
            div.style.display = "flex";
            div.style.gap = "10px";
            div.style.alignItems = "center";
            div.style.background = "white";
            div.style.padding = "6px 10px";
            div.style.borderRadius = "8px";
            div.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
            const img1 = L.DomUtil.create("img", "", div); img1.src = logoIUT; img1.style.height = "35px";
            const img2 = L.DomUtil.create("img", "", div); img2.src = logoRepublique; img2.style.height = "35px";
            return div;
        };
        logosControl.addTo(map);

        initialZones.forEach(zone => {
            const poly = L.polygon(zone.polygon, { color: "blue", weight: 2, fillOpacity: 0.15 }).addTo(map);
            poly.bindTooltip(zone.name, { permanent: true, direction: "center", className: "zone-label" }).openTooltip();
            polygonRefs.current[zone.name] = poly;
            
            poly.on("click", () => {
                setMapZones(currentZones => {
                    const clickedZone = currentZones.find(z => z.name === zone.name);
                    setSelectedZone(clickedZone);
                    return currentZones;
                });
            });
        });

        // Zoom custom
        const zoomControl = L.Control.extend({
            options: { position: "bottomright" },
            onAdd: () => {
                const c = L.DomUtil.create("div", "custom-zoom");
                c.innerHTML = `<button id="zoom-in">+</button><button id="zoom-out">-</button>`;
                c.style.display="flex"; c.style.flexDirection="column"; c.style.gap="4px"; c.style.background="white"; c.style.padding="4px"; c.style.borderRadius="4px";
                L.DomEvent.disableClickPropagation(c);
                return c;
            }
        });
        map.addControl(new zoomControl());
        setTimeout(() => {
            const btnIn = document.getElementById("zoom-in");
            const btnOut = document.getElementById("zoom-out");
            if(btnIn) btnIn.onclick = () => map.zoomIn();
            if(btnOut) btnOut.onclick = () => map.zoomOut();
        }, 100);

        const legend = L.control({ position: "topleft" });
        legend.onAdd = () => {
            const div = L.DomUtil.create("div", "legend");
            div.style.background = "rgba(255,255,255,0.9)"; div.style.padding = "8px"; div.style.borderRadius = "8px"; div.style.fontSize = "12px";
            div.innerHTML = `
                <b>Légende des risques</b><br/>
                <span style="display:inline-block;width:12px;height:12px;background:blue;margin-right:5px;"></span> Neutre<br/>
                <span style="display:inline-block;width:12px;height:12px;background:green;margin-right:5px;"></span> Faible<br/>
                <span style="display:inline-block;width:12px;height:12px;background:orange;margin-right:5px;"></span> Moyen<br/>
                <span style="display:inline-block;width:12px;height:12px;background:red;margin-right:5px;"></span> Élevé
            `;
            return div;
        };
        legend.addTo(map);

        return () => {
            map.remove();
            polygonRefs.current = {};
            mapRef.current = null;
        };
    }, []); 

    // Mise à jour visuelle (Popups & Couleurs & VISIBILITÉ)
    useEffect(() => {
        mapZones.forEach(zone => {
            const poly = polygonRefs.current[zone.name];
            if (!poly) return;

            // --- GESTION VISIBILITÉ ---
            // Si la zone n'a pas de données (ex: pas de capteur), on la retire de la carte
            if (!zone.hasData) {
                poly.remove();
                return; // On arrête là pour cette zone
            } else {
                // Si la zone a des données, on s'assure qu'elle est affichée
                if (mapRef.current && !mapRef.current.hasLayer(poly)) {
                    poly.addTo(mapRef.current);
                    poly.openTooltip(); // Réaffiche le label si nécessaire
                }
            }

            // --- GESTION CONTENU & COULEURS ---
            poly.unbindPopup();
            poly.on("mouseover", () => {
                if (!zone.weather) return;
                
                const t = zone.weather.temperature[0];
                const h = zone.weather.relativehumidity[0];
                const w = zone.weather.windspeed[0];
                const p = zone.weather.precipitation_probability[0];
                const g = zone.weather.gaz ? zone.weather.gaz[0] : null;

                let popupHTML = `<b>${zone.name}</b><br/>`;
                popupHTML += `Température : ${t}°C<br/>`;
                popupHTML += `Humidité : ${h}%<br/>`;
                
                if(useDailyAPI !== null) { 
                    popupHTML += `Vent : ${w} km/h<br/>`;
                    popupHTML += `Pluie : ${p}%`;
                } else { 
                    if(g !== null) popupHTML += `Gaz/Fumée : ${g} ppm<br/>`;
                    popupHTML += `<i>Données capteur en direct</i>`;
                }
                
                poly.bindPopup(popupHTML).openPopup();
            });

            if (!selectedRisk) {
                poly.setStyle({ color: "blue", fillColor: "blue", fillOpacity: 0.15 });
            } else {
                const level = zone.risks[selectedRisk];
                const color = riskColors[level] || "blue";
                poly.setStyle({ color, fillColor: color, fillOpacity: 0.45 });
            }
        });
    }, [selectedRisk, mapZones, useDailyAPI]);

    const handleToggleSubscription = async (zoneName) => {
        if (!currentUser) {
            alert("Vous devez être connecté pour vous abonner aux alertes.");
            return;
        }

        const result = await toggleZoneSubscription(currentUser.id, zoneName);

        if (result && result.success) {
            setMapZones(prev => prev.map(z => 
                z.name === zoneName ? { ...z, subscribed: !z.subscribed } : z
            ));

            if (onSubscriptionChange) {
                onSubscriptionChange(result.newZones);
            }
        } else {
            alert("Erreur lors de l'enregistrement de l'abonnement.");
        }
    };

return (
        <div className="map-container">
            <div id="map" className="map"></div>
            <ZoneDetails
                zone={selectedZone}
                onToggleSubscription={() => handleToggleSubscription(selectedZone?.name)}
                isSensorMode={useDailyAPI === null}
                useDailyAPI={useDailyAPI}
            />
        </div>
    );
}