import React, { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { Loader2 } from "lucide-react";
import "../styles/styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

ChartJS.register(ArcElement, Tooltip, Legend);
const COLORS_METIERS = {
  "Pompiers": "#ef4444",
  "Gardes Forestiers": "#22c55e",
  "Assurances": "#3b82f6",
  "Utilisateurs": "#f59e0b",
  "Autre": "#94a3b8"
};
const COLORS_ZONES = {
  "Valbonne": "#8884d8",
  "Sophia Antipolis": "#82ca9d",
  "Biot": "#ffc658"
};

export default function UserStatistique() {
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]); 
  const [filteredUsers, setFilteredUsers] = useState([]); 
  const [chartDataMetiers, setChartDataMetiers] = useState(null);
  const [chartDataZones, setChartDataZones] = useState(null);
  const [kpiData, setKpiData] = useState({ totalUsers: 0, topZone: "Aucune", topJob: "Aucun" });
  const [timeFilter, setTimeFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_URL}/api/utilisateurs`);
        if (!response.ok) throw new Error("Erreur Réseau");
        const data = await response.json();
        setAllUsers(data); 
        setLoading(false);
      } catch (error) {
        console.error("Erreur stats:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (allUsers.length === 0 && !loading) return;
    const now = new Date();
    const filtered = allUsers.filter(user => {
      if (timeFilter === 'all') return true;
      const userDate = new Date(user.created_at); 
      const diffTime = Math.abs(now - userDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      if (timeFilter === 'day') return diffDays <= 1;
      if (timeFilter === 'week') return diffDays <= 7;
      if (timeFilter === 'year') return diffDays <= 365;
      return true;
    });

    setFilteredUsers(filtered);
    const metierCounts = { "Pompiers": 0, "Gardes Forestiers": 0, "Assurances": 0, "Utilisateurs": 0 };
    const zoneCounts = { "Valbonne": 0, "Sophia Antipolis": 0, "Biot": 0 };
    const roleMapping = {
      "Je suis pompier et souhaite prévoir les risques avec précision": "Pompiers",
      "Je suis garde forestier et souhaite préserver les zones à risque": "Gardes Forestiers",
      "Je travaille pour une assurance et souhaite voir les zones avec un risque élevé": "Assurances",
      "Je cherche un logement et souhaite voir les zones sécurisées": "Utilisateurs"
    };

    filtered.forEach(user => {
      if (user.zones) {
        user.zones.split(',').forEach(z => {
          const zoneClean = z.trim();
          if (zoneCounts.hasOwnProperty(zoneClean)) zoneCounts[zoneClean]++;
        });
      }
      if (user.usage_type) {
        user.usage_type.split(',').forEach(role => {
          const label = roleMapping[role.trim()];
          if (label && metierCounts.hasOwnProperty(label)) metierCounts[label]++;
        });
      }
    });
    const labelsMetiers = Object.keys(metierCounts);
    const dataMetiers = Object.values(metierCounts);
    setChartDataMetiers({
      labels: labelsMetiers,
      datasets: [{
        data: dataMetiers,
        backgroundColor: labelsMetiers.map(l => COLORS_METIERS[l]),
        borderWidth: 1,
      }],
    });
    const labelsZones = Object.keys(zoneCounts);
    const dataZones = Object.values(zoneCounts);
    setChartDataZones({
      labels: labelsZones,
      datasets: [{
        data: dataZones,
        backgroundColor: labelsZones.map(l => COLORS_ZONES[l]),
        borderWidth: 1,
      }],
    });
    const maxZoneVal = Math.max(...dataZones);
    const topZoneIndex = dataZones.indexOf(maxZoneVal);
    const topZoneName = maxZoneVal > 0 ? labelsZones[topZoneIndex] : "Aucune";
    const maxJobVal = Math.max(...dataMetiers);
    const topJobIndex = dataMetiers.indexOf(maxJobVal);
    const topJobName = maxJobVal > 0 ? labelsMetiers[topJobIndex] : "Aucun";

    setKpiData({ totalUsers: filtered.length, topZone: topZoneName, topJob: topJobName });
  }, [allUsers, timeFilter, loading]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { 
          padding: 15, 
          usePointStyle: true,
          boxWidth: 10,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            let label = context.label || '';
            if (label) label += ': ';
            let value = context.raw;
            let total = context.chart._metasets[context.datasetIndex].total;
            let percentage = total > 0 ? Math.round((value / total) * 100) + '%' : '0%';
            return label + value + ' (' + percentage + ')';
          }
        }
      }
    }
  };
  
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Loader2 className="spin" size={48} color="#3b82f6" />
        <span style={{ marginLeft: 10 }}>Chargement...</span>
      </div>
    );
  }
  
  return (
    <div className="stats-container">
      <div className="stats-header">
        <div>
          <h2 className="gradient-title" style={{ fontSize: "16px", margin: 0 }}>
            Statistiques utilisateurs (Catégories et Zones)
          </h2>
          <p style={{ color: "#666", marginTop: "5px" }}>
            Analyse des {kpiData.totalUsers} utilisateurs : 
            <strong> {timeFilter === 'all' ? 'Toujours' : timeFilter === 'day' ? "Aujourd'hui" : timeFilter === 'week' ? '7 Jours' : '1 An'}</strong>
          </p>
        </div>
        <div className="filter-buttons">
          <FilterButton label="24h" active={timeFilter === 'day'} onClick={() => setTimeFilter('day')} />
          <FilterButton label="7 Jours" active={timeFilter === 'week'} onClick={() => setTimeFilter('week')} />
          <FilterButton label="1 An" active={timeFilter === 'year'} onClick={() => setTimeFilter('year')} />
        </div>
      </div>
      <div className="kpi-grid">
        <KpiCard title="Utilisateurs" value={kpiData.totalUsers} sub="Actifs sur la période" />
        <KpiCard title="Profil Dominant" value={kpiData.topJob} sub="Sur la période" />
        <KpiCard title="Zone Tendance" value={kpiData.topZone} sub="La plus active" />
      </div>
      <div className="charts-grid">
        <div className="chart-card">
          <h3>Répartition par Catégorie</h3>
          <p className="chart-subtitle">Métiers & Usages</p>
          <div className="chart-container-inner">
            {chartDataMetiers && <Pie data={chartDataMetiers} options={chartOptions} />}
          </div>
        </div>
        <div className="chart-card">
          <h3>Répartition par Zone</h3>
          <p className="chart-subtitle">Valbonne, Biot, Sophia Antipolis</p>
          <div className="chart-container-inner">
            {chartDataZones && <Pie data={chartDataZones} options={chartOptions} />}
          </div>
        </div>
      </div>
    </div>
  );
}
function FilterButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: "20px",
        border: active ? "none" : "1px solid #ddd",
        backgroundColor: active ? "#3b82f6" : "white",
        color: active ? "white" : "#666",
        cursor: "pointer",
        fontWeight: "500",
        transition: "all 0.2s",
        fontSize: "13px"
      }}
    >
      {label}
    </button>
  );
}
function KpiCard({ title, value, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-content">
        <span className="kpi-title">{title}</span>
        <span className="kpi-value">{value}</span>
        <span className="kpi-trend">{sub}</span>
      </div>
    </div>
  );
}