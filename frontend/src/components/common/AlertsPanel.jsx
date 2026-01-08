import React, { useState, useEffect } from "react";
import { X, Bell, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "../ui/Button";
import Badge from "../ui/Badge";

const riskLevelColors = {
  low: "bg-green-100 text-green-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};
export function AlertsPanel({ alerts, onAlertClick, onMarkAsRead }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 640);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  const unreadCount = alerts.filter(a => !a.read).length;
  const formatTimestamp = (date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return new Date(date).toLocaleDateString("fr-FR");
  };
  const renderAlertsContent = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
      {alerts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
          <p>Aucune alerte active</p>
        </div>
      ) : (
        alerts.map((alert) => (
          <div
            key={alert.id}
            style={{
              padding: 12,
              borderRadius: 8,
              border: "1px solid #ddd",
              marginBottom: 12,
              backgroundColor: alert.read ? "#fff" : "#ffe5e5",
              cursor: "pointer",
            }}
            onClick={() => onAlertClick(alert.zoneId)}
          >
            <div style={{ display: "flex", alignItems: "start", gap: 8 }}>
              <AlertTriangle
                className={`h-5 w-5 mt-1 ${
                  alert.riskLevel === "high"
                    ? "text-red-500"
                    : alert.riskLevel === "medium"
                    ? "text-orange-500"
                    : "text-green-500"
                }`}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <p style={{ fontWeight: "bold", margin: 0 }}>{alert.zoneName}</p>
                  <Badge className={riskLevelColors[alert.riskLevel]}>
                    {alert.riskLevel === "high"
                      ? "Élevé"
                      : alert.riskLevel === "medium"
                      ? "Moyen"
                      : "Faible"}
                  </Badge>
                </div>
                <p style={{ margin: "4px 0" }}>{alert.message}</p>
                <p style={{ fontSize: 12, color: "#666" }}>{formatTimestamp(alert.timestamp)}</p>
              </div>
            </div>
            {!alert.read && (
              <Button
                size="sm"
                variant="outline"
                style={{ marginTop: 8, width: "100%" }}
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead(alert.id);
                }}
              >
                Marquer comme lu
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );
  const panelStyle = isMobile
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.5)",
        zIndex: 999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }
    : {
        position: "fixed",
        top: 60,
        right: 16,
        width: 320,
        height: "70vh",
        background: "white",
        border: "1px solid #ccc",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 999,
        display: "flex",
        flexDirection: "column",
      };
  const innerPanelStyle = isMobile
    ? {
        width: "90%",
        height: "90%",
        background: "#fff",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }
    : {};
  return (
    <div>
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 1000 }}>
        <Button size="icon" variant="ghost" onClick={() => setIsOpen(!isOpen)} style={{ position: "relative" }}>
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                background: "red",
                color: "white",
                borderRadius: "50%",
                width: 16,
                height: 16,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                fontSize: 10,
              }}
            >
              {unreadCount}
            </span>
          )}
        </Button>
      </div>
      {isOpen && (
        <div style={panelStyle} onClick={() => setIsOpen(false)}>
          <div style={innerPanelStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #ddd",
                fontWeight: "bold",
              }}
            >
              Alertes
              <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderAlertsContent()}
          </div>
        </div>
      )}
    </div>
  );
}
