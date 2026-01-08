import React, { useState, useEffect } from "react";
import "../../styles/connect.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function SignupForm({ onLoginClick }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [langue, setLangue] = useState("fr");
  const [showPassword, setShowPassword] = useState(false);
  const [notifications, setNotifications] = useState({
    push: false,
    email: false,
    daily: false
  });

  const ALL_ZONES = ["Valbonne", "Sophia Antipolis", "Biot"];
  const [zones, setZones] = useState([]);


  const [purposes, setPurposes] = useState({
    firefighter: false,
    forestGuard: false,
    insurance: false,
    housing: false
  });

  const [texts] = useState([
    "Suivez l'évolution des risques naturels",
    "Recevez des alertes personnalisées",
  ]);

  const [textIndex, setTextIndex] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setTextIndex((i) => (i + 1) % texts.length);
        setFade(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCheckboxChange = (key) => {
    setPurposes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !email || !password) {
      alert("Veuillez remplir tous les champs !");
      return;
    }

    const selectedPurposes = Object.entries(purposes)
      .filter(([_, value]) => value)
      .map(([key]) => key);

    //const res = await fetch(`${import.meta.env.VITE_API_URL}/api/signup`, {
    const res = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        email,
        password,
        purposes: selectedPurposes,
        langue,
        notifications: Object.entries(notifications)
          .filter(([_, v]) => v)
          .map(([k]) => k),
        zones
      })
    });

    const data = await res.json();

    if (!data.success) {
      alert(data.error || "Erreur inconnue");
      return;
    }

    alert("Compte créé avec succès !");
    onLoginClick();
  };

  return (
    <div className="auth-wrapper">
      <div className="welcome-section">
        <h1 className="gradient-title">Bienvenue sur Physis</h1>
        <p className={`animated-subtitle ${fade ? "fade-out" : ""}`}>
          {texts[textIndex]}
        </p>
      </div>

      <div className="auth-card">
        <h2 className="auth-title">Créer un compte</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom d’utilisateur"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="auth-input"
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="auth-input"
          />

          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mot de passe"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="auth-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: 10,
                top: 8,
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "1.2rem"
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>


          <div className="section">
            <label className="legend-text">Langue</label>
            <select
              className="auth-input"
              value={langue}
              onChange={(e) => setLangue(e.target.value)}
            >
              <option value="fr">Français</option>
              <option value="en">Anglais</option>
            </select>
          </div>

          <fieldset style={{ border: "none", padding: 0, marginTop: 10 }}>
            <legend className="legend-text">
              Pourquoi utilisez-vous cette application ?
            </legend>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={purposes.firefighter}
                  onChange={() => handleCheckboxChange("firefighter")}
                />
                Je suis pompier et souhaite prévoir les risques avec précision
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={purposes.forestGuard}
                  onChange={() => handleCheckboxChange("forestGuard")}
                />
                Je suis garde forestier et souhaite préserver les zones à risque
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={purposes.insurance}
                  onChange={() => handleCheckboxChange("insurance")}
                />
                Je travaille pour une assurance et souhaite voir les zones avec un risque élevé
              </label>

              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={purposes.housing}
                  onChange={() => handleCheckboxChange("housing")}
                />
                Je cherche un logement et souhaite voir les zones sécurisées
              </label>
            </div>
          </fieldset>

          <h4>Choix des notifications</h4>
          {["push","email","daily"].map(k => (
            <label key={k}>
              <input
                type="checkbox"
                checked={notifications[k]}
                onChange={() =>
                  setNotifications(p => ({ ...p, [k]: !p[k] }))
                }
              />
              {k}
            </label>
          ))}

          <h4>Souhaitez vous vous abonner à des zones surveillées</h4>
          {ALL_ZONES.map(zone => (
            <label key={zone}>
              <input
                type="checkbox"
                checked={zones.includes(zone)}
                onChange={() =>
                  setZones(prev =>
                    prev.includes(zone)
                      ? prev.filter(z => z !== zone)
                      : [...prev, zone]
                  )
                }
              />
              {zone}
            </label>
          ))}

          <button type="submit" className="auth-btn">
            Créer mon compte
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ?
          <span className="auth-link" onClick={onLoginClick}>
            Se connecter
          </span>
        </p>
      </div>
    </div>
  );
}
