-- ----------------------------
-- Base de données des messages MQTT
-- ----------------------------

CREATE DATABASE IF NOT EXISTS nodered;

USE nodered;

CREATE TABLE IF NOT EXISTS mqtt_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    deviceId VARCHAR(50),
    temperature FLOAT,
    humidite FLOAT,
    gaz INT,
    date VARCHAR(20),
    heure VARCHAR(20),
    latitude FLOAT,
    longitude FLOAT,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------
-- Base de données des utilisateurs
-- ----------------------------

GRANT ALL PRIVILEGES ON *.* TO 'nodered'@'%';
FLUSH PRIVILEGES;

CREATE DATABASE IF NOT EXISTS utilisateurs;
USE utilisateurs;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,

    usage_type TEXT,
    langue VARCHAR(20) DEFAULT 'fr',

    notifications TEXT,
    zones TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    zone_name VARCHAR(100),
    risk_type VARCHAR(50),
    message TEXT,
    level VARCHAR(20),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

