require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer')
const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const cron = require('node-cron');
const cors = require('cors');
const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'nodered',
  password: process.env.DB_PASSWORD || 'noderedpassword',
  database: process.env.DB_NAME || 'nodered'
});

const app = express();
app.use(cors());
app.use(express.json());

const DATA_PATH = path.join(__dirname, 'data', 'storage.json');
const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

// Mapping des zones concernées
const ZONES = {
  "Valbonne": { lat: 43.62, lon: 7.01 },
  "Biot": { lat: 43.64, lon: 7.09 },
  "Sophia Antipolis": { lat: 43.635, lon: 7.05 }
};


// Récupère les données utilisateur de la base de donnée
const userDB = mysql.createPool({
  host: process.env.DB_HOST || 'mysql',
  user: process.env.DB_USER || 'nodered',
  password: process.env.DB_PASSWORD || 'noderedpassword',
  database: 'utilisateurs'
});

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'mysql',
      user: process.env.DB_USER || 'nodered',
      password: process.env.DB_PASSWORD || 'noderedpassword'
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS utilisateurs`);
    await connection.query(`USE utilisateurs`);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        \`usage_type\` TEXT,
        langue VARCHAR(20) DEFAULT 'fr',
        notifications TEXT,
        zones TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Base de données locale configurée");
  } catch (e) {
    console.log("Info DB: " + e.message);
  }
})();

// Mapping zones vers sensorId
const ZONE_TO_SENSOR = {
  "Valbonne": "CapteurValbonne",
  "Biot": "CapteurBiot",
  "Sophia Antipolis": "ESP8266_Zone_B"
};

// Vérification du stockage des zones
async function ensureStorage() {
  await fs.ensureFile(DATA_PATH);
  const exists = await fs.readJson(DATA_PATH).catch(() => null);
  if (!exists) {
    await fs.writeJson(DATA_PATH, { zones: Object.fromEntries(Object.keys(ZONES).map(z => [z, []])) }, { spaces: 2 });
  }
}

// Récupération des données pour l'historique
async function fetchMeteoblue(zoneName) {
  const z = ZONES[zoneName];
  if (!z) throw new Error('Zone inconnue');
  const url = `https://my.meteoblue.com/packages/basic-1h_basic-day?lat=${z.lat}&lon=${z.lon}&apikey=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error('Meteoblue error', res.status, text);
    throw new Error('Erreur Meteoblue');
  }
  return res.json();
}

// Récupération d'une heure spécifique dans la journée pour y constituer un historique par jour
function computeDailySummary(apiJson) {
  const d = apiJson.data_1h;
  if (!d || !d.time) return null;
  const dates = d.time.map(t => t.split(' ')[0]);
  const targetDate = dates[0];
  const indices = dates.map((dt, idx) => dt === targetDate ? idx : -1).filter(i => i !== -1);
  if (indices.length === 0) return null;
  // Données récupérées et affichées
  const fields = ['temperature', 'relativehumidity', 'windspeed', 'precipitation_probability'];
  const summary = { date: targetDate };
  fields.forEach(field => {
    const arr = d[field];
    if (!arr) {
      summary[field] = null;
      return;
    }
    const vals = indices.map(i => arr[i]).filter(v => v !== null && v !== undefined);
    const avg = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
    summary[field] = avg !== null ? Math.round(avg * 100) / 100 : null;
  });
  summary.snapshot = {
    temperature: d.temperature && d.temperature[indices[0]] != null ? d.temperature[indices[0]] : null,
    humidity: d.relativehumidity && d.relativehumidity[indices[0]] != null ? d.relativehumidity[indices[0]] : null,
    windSpeed: d.windspeed && d.windspeed[indices[0]] != null ? d.windspeed[indices[0]] : null,
    precipProb: d.precipitation_probability && d.precipitation_probability[indices[0]] != null ? d.precipitation_probability[indices[0]] : null
  };
  return summary;
}

// éviter des doublons de résumé pour un même jour
async function appendSummary(zoneName, summary) {
  await ensureStorage();
  const storage = await fs.readJson(DATA_PATH);
  const arr = storage.zones[zoneName] || [];
  if (arr.length && arr[arr.length - 1].date === summary.date) {
    arr[arr.length - 1] = summary;
  } else {
    arr.push(summary);
    if (arr.length > 365) arr.shift();
  }
  storage.zones[zoneName] = arr;
  await fs.writeJson(DATA_PATH, storage, { spaces: 2 });
}

// Séparation dans la récupération des données zones par zones
async function fetchAndStoreZone(zoneName) {
  try {
    console.log('Fetching for', zoneName);
    const apiJson = await fetchMeteoblue(zoneName);
    const summary = computeDailySummary(apiJson);
    if (!summary) throw new Error('Impossible de calculer le résumé journalier');
    await appendSummary(zoneName, summary);
    console.log('Stored summary for', zoneName, summary.date);
    return summary;
  } catch (err) {
    console.error('Erreur fetchAndStoreZone', zoneName, err.message);
    throw err;
  }
}

// Obtention de l'historique hebdomadaire API, fonctionnel pour chaque zones
app.get('/api/history/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  const days = parseInt(req.query.days || '7', 10);
  try {
    await ensureStorage();
    const storage = await fs.readJson(DATA_PATH);
    const arr = storage.zones[zoneId] || [];
    const slice = arr.slice(-days).map(item => {
      const d = new Date(item.date + 'T00:00:00');
      const dd = d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
      return {
        date: dd,
        temperature: item.temperature !== undefined ? item.temperature : (item.snapshot ? item.snapshot.temperature : null),
        humidity: item.relativehumidity !== undefined ? item.relativehumidity : (item.snapshot ? item.snapshot.humidity : null),
        windSpeed: item.snapshot ? item.snapshot.windSpeed : null,
        raw: item
      };
    });
    res.json(slice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Historique des capteurs pour une zone
app.get('/api/sensor-history/:zoneId', async (req, res) => {
  const { zoneId } = req.params;
  const sensorId = ZONE_TO_SENSOR[zoneId];

  if (!sensorId) {
    return res.status(404).json({ error: 'Zone inconnue' });
  }

  try {
    // Récupérer toutes les données du capteur
    const [rows] = await db.query(`
      SELECT 
        DATE_FORMAT(received_at, '%d/%m') as date,
        temperature,
        humidite,
        gaz,
        received_at
      FROM mqtt_messages
      WHERE deviceId = ?
      ORDER BY received_at DESC
      LIMIT 100
    `, [sensorId]);

    // Grouper par jour et calculer les moyennes
    const grouped = {};
    rows.forEach(row => {
      const dateKey = row.date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
          temperatures: [],
          humidites: [],
          gaz: []
        };
      }
      if (row.temperature != null) grouped[dateKey].temperatures.push(parseFloat(row.temperature));
      if (row.humidite != null) grouped[dateKey].humidites.push(parseFloat(row.humidite));
      if (row.gaz != null) grouped[dateKey].gaz.push(parseInt(row.gaz));
    });

    // Calculer les moyennes pour chaque jour
    const result = Object.keys(grouped).map(dateKey => {
      const dayData = grouped[dateKey];

      const avgTemp = dayData.temperatures.length > 0
          ? dayData.temperatures.reduce((a, b) => a + b, 0) / dayData.temperatures.length
          : null;

      const avgHumidite = dayData.humidites.length > 0
          ? dayData.humidites.reduce((a, b) => a + b, 0) / dayData.humidites.length
          : null;

      const avgGaz = dayData.gaz.length > 0
          ? dayData.gaz.reduce((a, b) => a + b, 0) / dayData.gaz.length
          : null;

      return {
        date: dateKey,
        temperature: avgTemp ? Math.round(avgTemp * 100) / 100 : null,
        humidite: avgHumidite ? Math.round(avgHumidite * 100) / 100 : null,
        gaz: avgGaz ? Math.round(avgGaz) : null
      };
    }).reverse(); // Pour avoir l'ordre chronologique

    res.json(result);
  } catch (err) {
    console.error("Erreur /api/sensor-history :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/fetch-now', async (req, res) => {
  try {
    const results = {};
    for (const zoneName of Object.keys(ZONES)) {
      try {
        const summary = await fetchAndStoreZone(zoneName);
        results[zoneName] = { ok: true, date: summary.date };
      } catch (err) {
        results[zoneName] = { ok: false, error: err.message };
      }
    }
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur lors du fetch manuel' });
  }
});

app.get('/api/zones', (req, res) => {
  res.json(Object.keys(ZONES));
});

// Inscription utilisateur
app.post('/api/signup', async (req, res) => {
  try {
    const { username, email, password, purposes, langue, notifications, zones } = req.body;

    // Champs obligatoires
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Champs manquants" });
    }

    // Vérifier si username existe déjà
    const [existingUser] = await userDB.query(
      "SELECT id FROM users WHERE username = ?",
      [username]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({ error: "Nom d'utilisateur déjà utilisé" });
    }

    const purposeMap = {
      firefighter: 'Je suis pompier et souhaite prévoir les risques avec précision',
      forestGuard: 'Je suis garde forestier et souhaite préserver les zones à risque',
      insurance: 'Je travaille pour une assurance et souhaite voir les zones avec un risque élevé',
      housing: 'Je cherche un logement et souhaite voir les zones sécurisées'
    };

    const selectedPurposes = purposes.map(p => purposeMap[p]);

    await userDB.query(
      `INSERT INTO users (username, email, password, \`usage_type\`, langue, notifications, zones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        email,
        password,
        selectedPurposes.join(',') || null,
        langue || 'fr',
        notifications.join(',') || null,
        zones.join(',') || null,
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
app.post('/api/submit-report', async (req, res) => {
  const { type, description, userEmail } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: 'Champs manquants.' });
  }

  // La configuration de l'expediteur
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'saebut3@gmail.com', 
      pass: 'fkyo kwxd gcjz xqun'
    }
  });

  // La configuration du message
  const mailOptions = {
    from: '"App SAE IOT" saebut3@gmail.com', 
    to: 'loris.galland123@gmail.com', 
    replyTo: userEmail, 
    subject: `[Rapport ${type}] Nouveau message de l'app`,
    text: `
      Nouveau rapport reçu depuis l'application.
      
      Type : ${type}
      Auteur : ${userEmail}
      Date : ${new Date().toLocaleString()}

      -----------------------------------------
      Message :
      ${description}
    `
  };

  // Envoi de l'email
  try {
    await transporter.sendMail(mailOptions);
    console.log('Email envoyé avec succès !');
    res.json({ message: 'Email envoyé !' });
  } catch (error) {
    console.error("Erreur d'envoi mail:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi du mail." });
  }
});

// Connexion utilisateur
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await userDB.query(
      `SELECT * FROM users WHERE username = ?`,
      [username]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Utilisateur introuvable" });
    }
    const user = rows[0];
    if (password !== user.password) {
      return res.status(401).json({ error: "Mot de passe incorrect" });
    }
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        password: user.password,
        email: user.email,
        langue: user.langue || 'fr',
        notifications: user.notifications
          ? user.notifications.split(',')
          : [],
        zones: user.zones
          ? user.zones.split(',')
          : []
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { username, email, langue, newPassword, notifications, zones } = req.body;

  try {
    let query = "UPDATE users SET username = ?, email = ?, langue = ?, notifications = ?, zones = ?";
    let params = [ username, email, langue, notifications?.join(',') || null, zones?.join(',') || null];
    if (newPassword && newPassword.trim() !== "") {
      query += ", password = ?";
      params.push(newPassword);
    }


    query += " WHERE id = ?";
    params.push(userId);

    await userDB.query(query, params);

    res.json({
      success: true,
      message: "Profil mis à jour",
      user: { id: userId, username, email, langue }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Erreur serveur" });
  }
});
app.get('/api/latest-sensors', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT m1.*
      FROM mqtt_messages m1
      INNER JOIN (
        SELECT deviceId, MAX(received_at) AS last_time
        FROM mqtt_messages
        GROUP BY deviceId
      ) m2 ON m1.deviceId = m2.deviceId AND m1.received_at = m2.last_time
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erreur /api/latest-sensors :", err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/utilisateurs', async (req, res) => {
  try {
    const [rows] = await userDB.query(`
      SELECT id, username, email, password, langue, \`usage_type\`, notifications, zones, created_at
      FROM users
    `);
    res.json(rows);
  } catch (err) {
    console.error("Erreur /api/utilisateurs:", err);
    res.status(500).json({ error: err.message });
  }
});

cron.schedule('5 0 * * *', async () => {
  console.log('Cron: starting daily fetch of zones');
  for (const z of Object.keys(ZONES)) {
    try {
      await fetchAndStoreZone(z);
    } catch (err) {
      console.error('Cron fetch failed for', z, err.message);
    }
  }
});

// Route pour gérer l'abonnement/désabonnement à une zone
app.post('/api/users/:id/toggle-zone', async (req, res) => {
  const userId = req.params.id;
  const { zoneName } = req.body;

  try {
    const [rows] = await userDB.query("SELECT zones FROM users WHERE id = ?", [userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    let currentZonesStr = rows[0].zones || "";
    let zonesArray = currentZonesStr ? currentZonesStr.split(',') : [];

    if (zonesArray.includes(zoneName)) {
      zonesArray = zonesArray.filter(z => z !== zoneName);
    } else {
      zonesArray.push(zoneName);
    }

    const newZonesStr = zonesArray.join(',');
    await userDB.query("UPDATE users SET zones = ? WHERE id = ?", [newZonesStr, userId]);

    res.json({ success: true, newZones: zonesArray });

  } catch (err) {
    console.error("Erreur toggle-zone:", err);
    res.status(500).json({ error: "Erreur serveur lors de la mise à jour des abonnements" });
  }
});

let dbReady = false;

// On attends la DB
const waitForDB = async () => {
  while (!dbReady) { 
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'mysql',
        user: process.env.DB_USER || 'nodered',
        password: process.env.DB_PASSWORD || 'noderedpassword',
        database: 'utilisateurs'
      });
      await connection.end();
      dbReady = true; 
      console.log("--> Backend connecté à la BDD !");
    } catch (e) {
      console.log("--> En attente de la BDD... (Nouvel essai dans 5s)");
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};
waitForDB();

// Mapping des capteurs physiques
const SENSOR_MAPPING = {
  "Sophia Antipolis": "ESP8266_Zone_B"
};

// Fonction de calcul des risques
function calculateRiskLevel(weatherData) {
  const { temp, hum, wind, rain, gaz } = weatherData;
  let risks = [];

  // Incendie (Priorité Capteur Gaz)
  if (gaz > 200) risks.push({ type: "Incendie", level: "Eleve", msg: "Detection de fumee critique !" });
  else if (temp > 30 && hum < 30) risks.push({ type: "Incendie", level: "Eleve", msg: "Conditions canicule + secheresse" });

  // Inondation
  if (rain > 80) risks.push({ type: "Inondation", level: "Eleve", msg: "Fortes precipitations" });

  // Verglas
  if (temp <= 0) risks.push({ type: "Verglas", level: "Eleve", msg: "Temperatures negatives" });

  // Tempete
  if (wind > 90) risks.push({ type: "Tempete", level: "Eleve", msg: "Vents violents" });

  return risks;
}

cron.schedule('*/10 * * * * *', async () => {

  if (!dbReady) {
    return; 
  }
  
  console.log("Verification des risques (Capteurs & API)...");
  
  try {
    const [users] = await userDB.query("SELECT * FROM users");
    
    // Récupérer les données capteurs (SQL)
    const [sensors] = await db.query(`
      SELECT deviceId, temperature, humidite, gaz 
      FROM mqtt_messages 
      WHERE received_at >= NOW() - INTERVAL 1 HOUR
      ORDER BY received_at DESC
    `);

    // Récupérer les données API 
    let apiStorage = {};
    try {
      apiStorage = await fs.readJson(DATA_PATH); 
    } catch (e) {

    }

    for (const zoneName of Object.keys(ZONES)) {
      let zoneData = null; // On va essayer de remplir ça
      
      //  Essayer le CAPTEUR 
      const sensorId = SENSOR_MAPPING[zoneName];
      const sensorReading = sensors.find(s => s.deviceId === sensorId);

      if (sensorReading) {
        zoneData = {
          source: "Capteur",
          temp: sensorReading.temperature,
          hum: sensorReading.humidite,
          gaz: sensorReading.gaz,
          wind: 0, 
          rain: 0
        };
      } 
      
      // Si pas de capteur, on test l'api
      else if (apiStorage && apiStorage.zones && apiStorage.zones[zoneName]) {
        const history = apiStorage.zones[zoneName];
        if (history.length > 0) {
          const lastEntry = history[history.length - 1];
          if (lastEntry.snapshot) {
             zoneData = {
               source: "API",
               temp: lastEntry.snapshot.temperature || 0,
               hum: lastEntry.snapshot.humidity || 0,
               wind: lastEntry.snapshot.windSpeed || 0,
               rain: lastEntry.snapshot.precipProb || 0,
               gaz: 0 
             };
          }
        }
      }

      if (!zoneData) continue;

      // Analyser les risques 
      const detectedRisks = calculateRiskLevel(zoneData);

      for (const risk of detectedRisks) {
        for (const user of users) {
          const userZones = user.zones ? user.zones.split(',') : [];
          if (!userZones.includes(zoneName)) continue;

          const userNotifs = user.notifications ? user.notifications.split(',') : [];

          // Notification PUSH 
          if (userNotifs.includes('push')) {
              await userDB.query(
                `INSERT INTO user_alerts (user_id, zone_name, risk_type, message, level) VALUES (?, ?, ?, ?, ?)`,
                [user.id, zoneName, risk.type, risk.msg, risk.level]
              );
              console.log(`[ALERTE] Nouvelle notif (${zoneData.source}) pour ${user.username} : ${risk.type} à ${zoneName}`);
          }

          // Notification EMAIL 
          if (userNotifs.includes('email')) {
             const [existing] = await userDB.query(
               `SELECT id FROM user_alerts WHERE user_id = ? AND zone_name = ? AND risk_type = ? AND created_at > NOW() - INTERVAL 1 HOUR`,
               [user.id, zoneName, risk.type]
             );

             if (existing.length === 0) {
               const mailer = nodemailer.createTransport({
                 service: 'gmail',
                 auth: { user: 'saebut3@gmail.com', pass: 'fkyo kwxd gcjz xqun' }
               });

               const mailOptions = {
                 from: '"Alerte SAE IoT" saebut3@gmail.com',
                 to: user.email,
                 subject: `ALERTE ${risk.type.toUpperCase()} - ${zoneName}`,
                 text: `Attention ${user.username},\n\nRisque détecté via ${zoneData.source} sur ${zoneName}.\nNature : ${risk.msg}.\n\nPrudence,\nL'équipe IoT.`
               };

               await mailer.sendMail(mailOptions); 
               console.log(`[EMAIL] Simulé vers ${user.email}`);
             }
          }
        }
      }
    }
  } catch (err) {
    console.error("Erreur Cron Alertes:", err);
  }
});

// Routes API Alertes 
app.get('/api/users/:id/alerts', async (req, res) => {
  try {
    const [rows] = await userDB.query(
      "SELECT * FROM user_alerts WHERE user_id = ? AND is_read = False ORDER BY created_at DESC LIMIT 50", 
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur fetch alertes" });
  }
});

app.put('/api/alerts/:alertId/read', async (req, res) => {
  try {
    await userDB.query("UPDATE user_alerts SET is_read = TRUE WHERE id = ?", [req.params.alertId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Erreur update alerte" });
  }
});


async function sendDailySummary() {
  console.log("--> Preparation du resume quotidien...");
  try {
    let storage = {};
    try { storage = await fs.readJson(DATA_PATH); } catch (e) {}

    const [users] = await userDB.query("SELECT * FROM users");

    const mailer = nodemailer.createTransport({
       service: 'gmail',
       auth: { user: 'saebut3@gmail.com', pass: 'fkyo kwxd gcjz xqun' }
    });

    for (const user of users) {
      const userNotifs = user.notifications ? user.notifications.split(',') : [];
      if (!userNotifs.includes('email')) continue;

      const userZones = user.zones ? user.zones.split(',') : [];
      if (userZones.length === 0) continue;

      let messageBody = `Bonjour ${user.username},\n\nVoici le bilan de surveillance pour vos zones ce ${new Date().toLocaleDateString('fr-FR')} :\n\n`;
      let hasInfo = false;

      for (const zoneName of userZones) {
         if (storage.zones && storage.zones[zoneName]) {
            const history = storage.zones[zoneName];
            const lastEntry = history.length > 0 ? history[history.length - 1] : null;
            
            if (lastEntry) {
               messageBody += `ZONE : ${zoneName}\n`;
               messageBody += `   Temperature moy : ${lastEntry.temperature} C\n`;
               messageBody += `   Humidite moy : ${lastEntry.relativehumidity}%\n`;
               
               if (lastEntry.snapshot) {
                  const snapshotData = {
                     temp: lastEntry.snapshot.temperature,
                     hum: lastEntry.snapshot.humidity,
                     wind: lastEntry.snapshot.windSpeed,
                     rain: lastEntry.snapshot.precipProb,
                     gaz: 0 
                  };
                  const risks = calculateRiskLevel(snapshotData);
                  
                  if (risks.length > 0) {
                     messageBody += `   ALERTES : ${risks.map(r => r.type).join(', ')}\n`;
                  } else {
                     messageBody += `   Situation stable.\n`;
                  }
               }
               messageBody += `--------------------------\n`;
               hasInfo = true;
            }
         }
      }

      if (hasInfo) {
         messageBody += `\nRestez prudent,\nL'equipe SAE IoT.`;
         await mailer.sendMail({
           from: '"Meteo Quotidienne" saebut3@gmail.com',
           to: user.email,
           subject: `Bilan Quotidien - ${new Date().toLocaleDateString('fr-FR')}`,
           text: messageBody
         });
         console.log(`[DAILY] Resume envoye a ${user.email}`);
      }
    }
  } catch (err) {
    console.error("Erreur sendDailySummary:", err);
  }
}

// CRON : Envoie le resume à 00:00
cron.schedule('0 0 * * *', async () => {
   console.log("Minuit ! Lancement du resume quotidien...");
   await sendDailySummary();
});

// ROUTE DE TEST
app.post('/api/test-daily-mail', async (req, res) => {
   console.log("Lancement manuel du resume quotidien !");
   sendDailySummary();
   res.json({ success: true, message: "Envoi des emails lance !" });
});

// MODIFICATION POUR LES TESTS :
// On ne lance le serveur que si ce fichier est exécuté directement (node server.js)
// Si c'est un test (jest) qui l'importe, on ne fait pas le listen() ici
if (require.main === module) {
    app.listen(PORT, async () => {
        console.log(`History backend listening on http://localhost:${PORT}`);
        await ensureStorage();
    });
}

// Export de l'application pour les tests
module.exports = app;
