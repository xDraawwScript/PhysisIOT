import React, { useState } from "react";
import UserProfile from "./pages/UserProfile";
import CompareZones from "./pages/CompareZones";
import { Sidebar } from "./components/common/Sidebar";
import RiskMap from "./components/risk/RiskMap";
import Settings from "./pages/Settings";
import { AlertsPanel } from "./components/common/AlertsPanel";
import SignupForm from "./components/common/SignupForm";
import LoginForm from "./components/common/LoginForm";
import UserStatistique from "./pages/UserStatistique"; 
import "./styles/styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function App() {
    const [activeView, setActiveView] = useState("map");
    const [activeFilter, setActiveFilter] = useState("Tous les risques");
    const [selectedRisk, setSelectedRisk] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [useDailyAPI, setUseDailyAPI] = useState(true);
    const [isSignedUp, setIsSignedUp] = useState(false);
    const [authView, setAuthView] = useState("signup");
    const [user, setUser] = useState(null);
    const handleLogout = () => {
        setIsSignedUp(false);
        setAuthView("login");
        setUser(null);
    };
    const handleLogin = (userData) => {
        console.log("Données reçues dans App:", userData);
        setUser(userData);
        setIsSignedUp(true);
    };
    const handleUserUpdate = (updatedUser) => {
        console.log("Mise à jour de l'utilisateur global :", updatedUser);
        setUser(updatedUser);
    };
    
    const handleSubscriptionChange = (newZones) => {
    setUser(prev => ({ ...prev, zones: newZones }));
    };

    //  Récupération automatique des alertes 
    React.useEffect(() => {
        // Si l'utilisateur n'est pas connecté, on ne fait rien
        if (!user) return;

        const fetchAlerts = async () => {
            try {
                // Appel au backend pour récupérer les alertes de l'utilisateur connecté
                const res = await fetch(`${API_URL}/api/users/${user.id}/alerts`);
                if (res.ok) {
                    const data = await res.json();
                    
                    // Formatage des données pour correspondre au composant AlertsPanel
                    const formatted = data.map(a => ({
                        id: a.id,
                        zoneName: a.zone_name,
                        message: `${a.risk_type}: ${a.message}`,
                        riskLevel: (a.level === "Eleve" || a.level === "Élevé") ? "high" : "medium",
                        timestamp: new Date(a.created_at),
                        read: a.is_read === 1 
                    }));
                    setAlerts(formatted);
                }
            } catch (err) {
                console.error("Erreur chargement alertes", err);
            }
        };

        fetchAlerts();
        
        const interval = setInterval(fetchAlerts, 10000);
        return () => clearInterval(interval);
    }, [user]);

    const getBackgroundForFilter = () => {
        switch (activeFilter) {
            case "Incendie": return "linear-gradient(135deg, #fff5ee 30%, #fdbc7bff 100%)";
            case "Inondation": return "linear-gradient(135deg, #e6f8ff 30%, #86d6ffff 100%)";
            case "Verglas": return "linear-gradient(135deg, #f0f8ff 30%, #b0d3fbff 100%)";
            case "Tempête": return "linear-gradient(135deg, #f2f2f2 30%, #878787ff 100%)";
            default: return "#fff";
        }
    };
    const getTitleForFilter = () => {
        switch (activeFilter) {
            case "Incendie": return "Vue Incendie";
            case "Inondation": return "Vue Inondation";
            case "Verglas": return "Vue Verglas";
            case "Tempête": return "Vue Tempête";
            default: return "Vue générale";
        }
    };
    const handleMarkAsRead = async (alertId) => {
        setAlerts(prev => prev.filter(a => a.id !== alertId));
        try {
            await fetch(`${API_URL}/api/alerts/${alertId}/read`, { method: "PUT" });
        } catch (e) { 
            console.error("Erreur lors du marquage comme lu", e); 
        }
    };
    
    const handleAlertClick = (zoneId) => {
        console.log("Alert clicked for zone:", zoneId);
    };

    if (!isSignedUp) {
        return authView === "signup" ? (
            <SignupForm onSignup={() => setIsSignedUp(true)} onLoginClick={() => setAuthView("login")} />
        ) : (
            <LoginForm onLogin={handleLogin} onSignupClick={() => setAuthView("signup")} />
        );
    }
    return (
        <div className="app-root" style={{ display: "flex", height: "100vh", background: "#fff" }}>
            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                setSelectedRisk={setSelectedRisk}
                useDailyAPI={useDailyAPI}
                setUseDailyAPI={setUseDailyAPI}
            />
            <main className="main-content" style={{ flex: 1, overflowY: "auto", position: "relative" }}>
                <div className="alerts-floating" style={{ position: "absolute", top: 16, right: 16, zIndex: 2000 }}>
                    <AlertsPanel alerts={alerts} onAlertClick={handleAlertClick} onMarkAsRead={handleMarkAsRead} />
                </div>
                {activeView === "map" && (
                    <div style={{
                        padding: 16,
                        height: "100%",
                        transition: "background .5s",
                        background: getBackgroundForFilter(),
                        fontSize: "13px"
                    }}>
                        <h2 className="map-header-title" style={{ marginBottom: 16, fontSize: "18px" }}>
                            Carte interactive : {getTitleForFilter()}
                        </h2>
                        <h3 style={{ fontSize: "12px" }}>Zones surveillées : 3 / Abonnements : {user?.zones?.length || 0}</h3>
                        <div style={{ height: 500, borderRadius: 8, overflow: "hidden" }}>
                            <RiskMap selectedRisk={selectedRisk} useDailyAPI={useDailyAPI} currentUser={user} onSubscriptionChange={handleSubscriptionChange} />
                        </div>
                    </div>
                )}
                {activeView === "compare" && <CompareZones />}
                {activeView === "stats" && <UserStatistique />}
                {activeView === "profile" && (
                    <UserProfile
                        user={user}
                        onUserUpdate={handleUserUpdate}
                    />
                )}
                {activeView === "settings" && <Settings onLogout={handleLogout} />}
            </main>
        </div>
    );
}
