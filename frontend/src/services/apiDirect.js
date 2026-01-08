export async function getWeather(lat = 43.61669, lon = 7.07106) {
  const API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=precipitation_probability&timezone=Europe/Paris`;
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error("Erreur API Open-Meteo");
    }
    const data = await response.json();
    return {
      temperature: [data.current.temperature_2m],
      relativehumidity: [data.current.relative_humidity_2m],
      windspeed: [data.current.wind_speed_10m],
      precipitation_probability: [data.hourly?.precipitation_probability?.[0] ?? 0]
    };
  } catch (err) {
    console.error("Erreur lors du fetch météo :", err);
    return null;
  }
}
