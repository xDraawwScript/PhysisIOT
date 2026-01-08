export function generateHistoricalData(days = 7) {
  const data = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);

    data.push({
      date: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      temperature: Math.round(10 + Math.random() * 15),     // 10 à 25°C
      humidity: Math.round(40 + Math.random() * 40),        // 40 à 80%
      windSpeed: Math.round(2 + Math.random() * 25),        // 2 à 27 km/h
    });
  }

  return data;
}
