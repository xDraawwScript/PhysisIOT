import React, { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function UserProfile({ user, onUserUpdate }) {
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [langue, setLangue] = useState("fr");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    push: false,
    email: false,
    daily: false
  });
  const [zones, setZones] = useState([]);
  const ALL_ZONES = ["Valbonne", "Sophia Antipolis", "Biot"];
  const [initialProfile, setInitialProfile] = useState(null);
  const Card = ({ children }) => (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
        marginBottom: 20
      }}
    >
      {children}
    </div>
  );

  const Row = ({ children }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 0"
      }}
    >
      {children}
    </div>
  );

  const Switch = ({ checked, onChange }) => (
    <div
      onClick={onChange}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        background: checked ? "#111827" : "#d1d5db",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s"
      }}
    >
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "#fff",
          position: "absolute",
          top: 3,
          left: checked ? 23 : 3,
          transition: "left 0.2s"
        }}
      />
    </div>
  );
  {ALL_ZONES.map(zone => (
    <Row key={zone}>
      <span>{zone}</span>
      <Switch
        checked={zones.includes(zone)}
        onChange={() =>
          setZones(prev =>
            prev.includes(zone)
              ? prev.filter(z => z !== zone)
              : [...prev, zone]
          )
        }
      />
    </Row>
  ))}
  useEffect(() => {
    if (!user) return;

    const notifState = {
      push: user.notifications?.includes("push"),
      email: user.notifications?.includes("email"),
      daily: user.notifications?.includes("daily")
    };

    const zonesState = user.zones || [];

    setUsername(user.username);
    setEmail(user.email);
    setLangue(user.langue || "fr");
    setPassword(user.password || "");
    setInitialPassword(user.password || "");

    setNotifications(notifState);
    setZones(zonesState);

    setInitialProfile({
      username: user.username,
      email: user.email,
      langue: user.langue || "fr",
      password: user.password || "",
      notifications: notifState,
      zones: zonesState
    });
  }, [user]);


  if (!user) return <div>Chargement du profil...</div>;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          langue,
          newPassword: password,
          notifications: Object.entries(notifications)
            .filter(([_, v]) => v)
            .map(([k]) => k),
          zones
        })
      });

      const data = await res.json();

      if (data.success) {
        alert("Modifications enregistrées avec succès");

        const updatedUser = {
          ...user,
          username,
          email,
          langue,
          password,
          notifications: Object.entries(notifications)
            .filter(([_, v]) => v)
            .map(([k]) => k),
          zones
        };

        onUserUpdate?.(updatedUser);

        setInitialProfile({
          username,
          email,
          langue,
          password,
          notifications,
          zones
        });

        setInitialPassword(password);
      } else {
        alert("Erreur : " + (data.error || "Impossible de mettre à jour"));
      }
    } catch (error) {
      console.error("Erreur API:", error);
      alert("Erreur de connexion au serveur");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="userprofile-container">
      <h2 className="card-title">Profil utilisateur</h2>
      <p className="profile-subtitle">Gérez vos préférences et paramètres</p>

      <div className="card">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.username ? user.username.charAt(0).toUpperCase() : "👤"}
          </div>
          <div>
            <h3>{user.username}</h3>
            <p style={{ color: "gray", fontSize: "0.95rem" }}>{user.email}</p>
          </div>
        </div>

        <div className="section">
          <label>Nom d’utilisateur</label>
          <input
            className="profile-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            type="text"
          />
        </div>

        <div className="section">
          <label>Adresse e-mail</label>
          <input
            className="profile-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className="section" style={{ position: "relative" }}>
          <label>Nouveau mot de passe</label>
          <input
            className="profile-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 10,
              top: 38,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>

        <div className="section">
          <label>Langue</label>
          <select
            className="select-input"
            value={langue}
            onChange={(e) => setLangue(e.target.value)}
          >
            <option value="fr">Français</option>
            <option value="en">Anglais</option>
          </select>
        </div>
      </div>

      <Card>
        <h3 style={{ marginBottom: 10 }}>Préférences de notification</h3>

        {[
          {
            key: "push",
            label: "Notifications push",
            desc: "Recevoir des alertes sur ce navigateur",
            icon: "🔔"
          },
          {
            key: "email",
            label: "Notifications e-mail",
            desc: "Recevoir des alertes par e-mail",
            icon: "✉️"
          },
          {
            key: "daily",
            label: "Résumé quotidien",
            desc: "Rapport journalier des zones surveillées",
            icon: "🌐"
          }
        ].map(({ key, label, desc, icon }) => (
          <Row key={key}>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 13, color: "#6b7280" }}>{desc}</div>
              </div>
            </div>

            <Switch
              checked={notifications[key]}
              onChange={() =>
                setNotifications(prev => ({
                  ...prev,
                  [key]: !prev[key]
                }))
              }
            />
          </Row>
        ))}
      </Card>

      <Card>
        <h3 style={{ marginBottom: 12 }}>Zones abonnées</h3>

        {ALL_ZONES.map(zone => (
          <Row key={zone}>
            <span>{zone}</span>
            <Switch
              checked={zones.includes(zone)}
              onChange={() =>
                setZones(prev =>
                  prev.includes(zone)
                    ? prev.filter(z => z !== zone)
                    : [...prev, zone]
                )
              }
            />
          </Row>
        ))}
      </Card>

      <div className="card">
        <div className="save-buttons">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>

          <button
            className="btn-secondary"
            onClick={() => {
              if (!initialProfile) return;

              setUsername(initialProfile.username);
              setEmail(initialProfile.email);
              setLangue(initialProfile.langue);
              setPassword(initialProfile.password);
              setNotifications(initialProfile.notifications);
              setZones(initialProfile.zones);
            }}
          >
            Annuler
          </button>

        </div>
      </div>
    </div>
  );
}
