# 🌊 Torrent - Smart IoT Environmental Monitoring & Automation Platform

**Torrent** is an IoT platform designed for environmental telemetry tracking, smart alphanumeric display broadcasting, and remote hardware automation.

> **Project Author:** Designed and Developed by **Sudarshan**, Dept. of Electrical Engineering, **GCOEY**  
> **Platform Theme:** Light Blue Theme  
> **Timezone:** UTC+05:30 (Asia/Kolkata)

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, Tailwind CSS, Chart.js, Lucide Icons, Vanilla JavaScript.
- **Backend:** Node.js (Express REST API), JSON Web Tokens (JWT), Bcrypt.js.
- **Database:** SQLite3 with pre-configured schemas and automatic migrations.
- **Hardware Controller:** ESP8266 (NodeMCU / WeMos D1) with DHT11, 16x2 I2C LCD, and LED.
- **Deployment:** Render-ready (`render.yaml` Blueprint included).

---

## 🔌 Hardware Setup & Pin Mapping

| Component | ESP8266 Pin | GPIO Pin | Notes |
| :--- | :--- | :--- | :--- |
| **DHT11 Data** | `D5` | `GPIO 14` | Reads Temperature & Humidity every 10s |
| **LED Indicator** | `D0` | `GPIO 16` | Active HIGH digital output |
| **LCD 16x2 SCL** | `D1` | `GPIO 5` | I2C Clock (Address `0x27` or `0x3F`) |
| **LCD 16x2 SDA** | `D2` | `GPIO 4` | I2C Data |
| **VCC (All)** | `5V / Vin` | - | 5V Power supply |
| **GND (All)** | `GND` | - | Common ground |

### Network Credentials (Configured in Arduino Code)
- **WiFi Name (SSID):** `COE YAVATMAL`
- **WiFi Password:** `shoaib845`

---

## 🚀 Running Locally

1. **Start the Node.js Server:**
   ```bash
   npm start
   ```
2. **Access Web Application:**
   Open your browser and navigate to:  
   `http://localhost:3000`

3. **Default Test Account (or register a new one):**
   - **Email:** `sudarshan@gcoey.ac.in`
   - **Password:** `password123`

---

## ☁️ Deploying to Render

This application is 100% Render deployable:

1. Push this project repository to your GitHub account:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Torrent IoT Platform"
   git remote add origin https://github.com/<your-username>/torrent-iot.git
   git push -u origin main
   ```
2. Log into [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** -> **Web Service** (or use Blueprint with `render.yaml`).
4. Connect your GitHub repository.
5. Set the following settings:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV`: `production`
     - `PORT`: `10000`
     - `JWT_SECRET`: *(Generate a secure random string or use the default in render.yaml)*
6. Once deployed, Render will provide a public URL like:  
   `https://torrent-iot.onrender.com`

---

## 🤖 ESP8266 Arduino Sketch Setup

1. Open Arduino IDE.
2. Install the required libraries via **Sketch -> Include Library -> Manage Libraries...**:
   - `DHT sensor library` by Adafruit
   - `LiquidCrystal I2C` by Frank de Brabander
   - `ArduinoJson` (v6 or v7) by Benoit Blanchon
3. Open the sketch located at:  
   [`arduino/torrent_esp8266/torrent_esp8266.ino`](file:///c:/Users/GCOEY/Desktop/Iot%20Project/arduino/torrent_esp8266/torrent_esp8266.ino)
4. Update the server URL in the sketch:
   - For Render: `const char* serverEndpoint = "https://<your-render-app>.onrender.com/api/device/telemetry";`
   - For Local testing: `const char* serverEndpoint = "http://<YOUR_LOCAL_PC_IP>:3000/api/device/telemetry";`
5. Select your board (**NodeMCU 1.0 (ESP-12E Module)**) and COM Port.
6. Click **Upload**.

---

## 📊 Features & Functional Highlights

1. **Tab 1: Environment Monitoring**
   - **Section 1:** Innovative circular gauge and seek-bar visualizer for Temperature (°C) and Humidity (% RH). Real-time interactive trend graph powered by Chart.js.
   - **Section 2:** Saved records table with pagination (20 records per page, latest first) and delete action. All timestamps converted to **Asia/Kolkata (+5:30)**.
2. **Tab 2: Smart LCD**
   - Alphanumeric 16x2 LCD controller with a real-time hardware visualizer screen matching the character grid and cyan backlight.
   - Row 1 and Row 2 inputs with quick preset messages.
3. **Tab 3: LED Automation**
   - High-tech toggle switch to control the LED on pin `D0` with realistic animated bulb glow.
4. **Bi-Directional 10-Second Telemetry Synchronization**
   - When the ESP8266 posts sensor readings to `/api/device/telemetry`, the server immediately returns the latest LED state and LCD text lines in the response, eliminating the need for open incoming ports on the microcontroller.
