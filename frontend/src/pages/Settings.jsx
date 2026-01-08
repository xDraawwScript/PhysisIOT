import React, { useState, useEffect } from "react";

const HARDCODED_USER_EMAIL = "saebut3@gmail.com"; 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Settings({ onClose, onLogout }) {
  const [bugReportType, setBugReportType] = useState("bug");
  const [bugDescription, setBugDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gradientColor, setGradientColor] = useState("");
  const appVersion = "1.2.3";
  const buildDate = "20 octobre 2025";
  const serverStatus = "Connecté";

  useEffect(() => {
    const gradients = [
      "linear-gradient(45deg, #2E7D32, #4CAF50, #81C784, #C8E6C9)",
      "linear-gradient(45deg, #1B5E20, #388E3C, #66BB6A, #A5D6A7)",
      "linear-gradient(45deg, #33691E, #558B2F, #8BC34A, #DCEDC8)",
      "linear-gradient(45deg, #004D40, #00796B, #26A69A, #80CBC4)",
    ];
    const random = gradients[Math.floor(Math.random() * gradients.length)];
    setGradientColor(random);
  }, []);
  const handleSubmitReport = async () => {
    if (!bugDescription.trim()) {
      alert(
        `Veuillez décrire votre ${
          bugReportType === "bug" ? "bug" : "suggestion"
        }`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const reportData = {
        type: bugReportType,
        description: bugDescription.trim(),
        userEmail: HARDCODED_USER_EMAIL,
      };

      // Envoi au backend
      const response = await fetch(`${API_URL}/api/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) throw new Error("Erreur serveur");

      alert(
        bugReportType === "bug"
          ? "Rapport envoyé ! (Voir logs serveur)"
          : "Suggestion envoyée ! (Voir logs serveur)"
      );
      setBugDescription("");
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi au serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogoutClick = () => {
    if (window.confirm("Voulez-vous vraiment vous déconnecter ?")) {
        if (onLogout) {
            onLogout();
        }
    }
  };

  const containerStyle = {
    padding: 20,
    maxWidth: 700,
    margin: "20px auto",
    background: "#f7f7f7",
    borderRadius: 10,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    border: "6px solid",
    borderImage: `${gradientColor} 1`,
    transition: "border-image 0.5s ease-in-out",
  };

  const sectionStyle = {
    background: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
  };

  const labelStyle = { display: "block", marginBottom: 5 };
  const inputStyle = {
    width: "100%",
    padding: 8,
    borderRadius: 5,
    border: "1px solid #ccc",
    marginBottom: 10,
  };
  const buttonStyle = {
    padding: "8px 16px",
    borderRadius: 5,
    border: "none",
    cursor: "pointer",
    backgroundColor: "#0fa334ff",
    color: "#fff",
    fontWeight: 500,
    marginTop: 5,
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#dc2626",
  };

  return (
    <div style={containerStyle}>
      <h2 style={{ marginBottom: 10, fontWeight: "normal" }}>{t('settingsPage.title')}</h2>
      <p style={{ marginBottom: 20, color: "#555" }}>
        Gérez les paramètres de votre application.
      </p>
      <div style={sectionStyle}>
        <h3 style={{ fontWeight: "normal" }}>Informations sur l'application</h3>
        <p>Version: {appVersion}</p>
        <p>Date de build: {buildDate}</p>
        <p>Environnement: Production</p>
      </div>
      <div style={sectionStyle}>
        <h3 style={{ fontWeight: "normal" }}>État du serveur</h3>
        <p>Statut: {serverStatus}</p>
      </div>
      <div style={sectionStyle}>
        <h3 style={{ fontWeight: "normal" }}>Rapport / Suggestions</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>
          Envoi simulé avec l'adresse : <strong>{HARDCODED_USER_EMAIL}</strong>
        </p>
        <label style={labelStyle}>
          Type de rapport:
          <select
            value={bugReportType}
            onChange={(e) => setBugReportType(e.target.value)}
            style={inputStyle}
          >
            <option value="bug">Signaler un bug</option>
            <option value="suggestion">Proposer une amélioration</option>
          </select>
        </label>
        <label style={labelStyle}>
          Description:
          <textarea
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            rows={5}
            style={inputStyle}
          />
        </label>
        <button
          onClick={handleSubmitReport}
          disabled={isSubmitting || !bugDescription.trim()}
          style={buttonStyle}
        >
          {isSubmitting ? "Envoi..." : "Envoyer"}
        </button>
      </div>
      <div style={sectionStyle}>
        <h3 style={{ fontWeight: "normal" }}>Déconnexion</h3>
        <p style={{ fontSize: 12, color: "#555", marginBottom: 10 }}>
          Vous serez déconnecté de l'application. Vos préférences et abonnements
          seront sauvegardés.
        </p>
        <button onClick={handleLogoutClick} style={dangerButtonStyle}>
          Se déconnecter
        </button>
      </div>
      {onClose && (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={onClose}
            style={{ ...buttonStyle, backgroundColor: "#6b7280" }}
          >
            Retour
          </button>
        </div>
      )}
    </div>
  );
}
