import React, { useState, useEffect } from "react";
import { MapIcon, GitCompare, User, Settings, Flame, Droplet, CloudSnow, Zap, Menu, BarChart3 } from "lucide-react";
import { Button } from "../../components/ui/Button";
import logo from "../../assets/Physis_logo.png";

const navItems = [
  { id: "map", label: "Carte", icon: MapIcon },
  { id: "compare", label: "Comparer", icon: GitCompare },
  { id: "stats", label: "Utilisateurs", icon: BarChart3 },
  { id: "profile", label: "Profil", icon: User },
  { id: "settings", label: "Paramètres", icon: Settings },
];
const filters = [
  { label: "Tous les risques", icon: Menu },
  { label: "Incendie", icon: Flame },
  { label: "Inondation", icon: Droplet },
  { label: "Verglas", icon: CloudSnow },
  { label: "Tempête", icon: Zap },
];

export function Sidebar({
  activeView,
  onViewChange,
  activeFilter,
  onFilterChange,
  setSelectedRisk,
  useDailyAPI,
  setUseDailyAPI
}) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [apiDaily, setApiDaily] = useState(useDailyAPI === true);
  const [apiHourly, setApiHourly] = useState(useDailyAPI === false);
  const [sensorMode, setSensorMode] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setApiDaily(useDailyAPI === true);
    setApiHourly(useDailyAPI === false);
  }, [useDailyAPI]);

  useEffect(() => {
    if (sensorMode) setUseDailyAPI(null);
    else if (apiDaily) setUseDailyAPI(true);
    else if (apiHourly) setUseDailyAPI(false);
  }, [apiDaily, apiHourly, sensorMode, setUseDailyAPI]);

  const switchBg = (state) => (state ? "#4CAF50" : "#ccc");
  const knobPos = (state) => (state ? "22px" : "2px");

  return (
    <>
      {isMobile && (
        <button
          onClick={() => setOpen(!open)}
          aria-label="Menu"
          style={{
            position: "fixed",
            top: 16,
            left: 16,
            zIndex: 3000,
            background: "#151515",
            border: "none",
            padding: "8px",
            borderRadius: "6px",
            cursor: "pointer"
          }}
        >
          <Menu className="h-5 w-5" color="#fff" />
        </button>
      )}
      <aside
        className="sidebar"
        style={{
          width: "260px",
          minWidth: "260px",
          maxWidth: "260px",
          flexShrink: 0,
          borderRight: "1px solid #ddd",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          background: "#f9f9f9",
          position: isMobile ? "fixed" : "relative",
          height: isMobile ? "100vh" : "auto",
          left: isMobile ? (open ? 0 : "-280px") : 0,
          top: 0,
          transition: "left 0.3s ease",
          zIndex: 2000,
          overflowY: "auto"
        }}
      >
        <div style={{
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e5e5",
            marginTop: isMobile ? "50px" : "0",
            transition: "margin 0.3s ease"
        }}>
          <img
            src={logo}
            alt="Logo Physis"
            style={{
                height: "40px",
                width: "auto",
                objectFit: "contain"
            }}
          />
          <div style={{ fontWeight: "bold", fontSize: "16px", lineHeight: "1.2" }}>
             Physis
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "-5px" }}>
          {navItems.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeView === id ? "default" : "ghost"}
              onClick={() => { onViewChange(id); if(isMobile) setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: activeView === id ? "#151515" : "#eee",
                color: activeView === id ? "#fff" : "#000",
                padding: "4px 6px",
                fontSize: "14px",
                borderRadius: "4px"
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
        <div style={{
          marginTop: "4px",
          marginBottom: "4px",
          padding: "4px",
          background: "#fff",
          borderRadius: "6px",
          border: "1px solid #ddd"
        }}>
          <p style={{ fontWeight: "bold", marginBottom: "8px" }}>Choix de l'API</p>
          {["API journalière", "API horaire", "Capteurs"].map((label, idx) => {
            const state = label === "API journalière" ? apiDaily : label === "API horaire" ? apiHourly : sensorMode;
            const onClick = () => {
              setSensorMode(label === "Capteurs" ? !sensorMode : false);
              setApiDaily(label === "API journalière");
              setApiHourly(label === "API horaire");
            };
            return (
              <div
                key={idx}
                onClick={onClick}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", cursor: "pointer" }}
              >
                <p>{label}</p>
                <div style={{
                  width: "44px",
                  height: "22px",
                  background: switchBg(state),
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
                    left: knobPos(state),
                    transition: ".3s"
                  }} />
                </div>
              </div>
            );
          })}
        </div>
        {activeView === "map" && (
          <div style={{ flex: 1, marginTop: "-10px" }}>
            <p style={{ marginBottom: "8px", fontWeight: "bold" }}>Filtrer par type de risque :</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filters.map(({ label, icon: IconComp }) => (
                <button
                  key={label}
                  onClick={() => {
                    onFilterChange(label);
                    const riskKey =
                      label === "Incendie" ? "incendie" :
                      label === "Inondation" ? "inondation" :
                      label === "Verglas" ? "verglas" :
                      label === "Tempête" ? "tempête" : null;
                    setSelectedRisk(riskKey);
                    if(isMobile) setOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: activeFilter === label ? "#151515" : "#eee",
                    color: activeFilter === label ? "#fff" : "#000",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  <IconComp className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { onFilterChange("Tous les risques"); setSelectedRisk(null); if(isMobile) setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: activeFilter === "Tous les risques" ? "#151515" : "#eee",
                color: activeFilter === "Tous les risques" ? "#fff" : "#000",
                border: "none",
                padding: "6px 8px",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "8px",
                justifyContent: "center",
              }}
            >
              Réinitialiser
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
