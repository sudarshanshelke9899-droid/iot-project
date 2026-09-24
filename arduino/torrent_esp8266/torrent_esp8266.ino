/*
 * Project: Torrent IoT - Smart Environmental Monitoring & Automation System
 * Organization: Dept. of Electrical Engineering, GCOEY
 * Author: Designed and Developed by Sudarshan
 * 
 * Hardware Connections:
 *  - ESP8266 Board (NodeMCU / WeMos D1 Mini)
 *  - DHT11 Sensor Data Pin -> D5 (GPIO 14)
 *  - LED Pin              -> D0 (GPIO 16)
 *  - LCD 16x2 I2C:
 *      * SCL              -> D1 (GPIO 5)
 *      * SDA              -> D2 (GPIO 4)
 *      * VCC              -> 5V (or Vin)
 *      * GND              -> GND
 * 
 * Required Arduino Libraries (Install via Library Manager):
 *  1. "DHT sensor library" by Adafruit (plus Adafruit Unified Sensor dependency)
 *  2. "LiquidCrystal I2C" by Frank de Brabander / Marco Schwartz
 *  3. "ArduinoJson" (v6 or v7) by Benoit Blanchon
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>
#include <ArduinoJson.h>

// ==========================================
// Network & Hardware Configurations
// ==========================================
const char* ssid     = "COE YAVATMAL";
const char* password = "shoaib845";

// Configure your backend server URL:
// For local testing on same WiFi: "http://<YOUR_PC_LOCAL_IP>:3000/api/device/telemetry"
// For Render cloud deployment:   "https://<YOUR-APP-NAME>.onrender.com/api/device/telemetry"
const char* serverEndpoint = "http://192.168.1.100:3000/api/device/telemetry";

// Pin Definitions
#define DHTPIN D5         // DHT11 Data Pin connected to D5 (GPIO 14)
#define DHTTYPE DHT11     // DHT 11
#define LED_PIN D0        // LED connected to D0 (GPIO 16)
#define I2C_SDA D2        // I2C SDA connected to D2 (GPIO 4)
#define I2C_SCL D1        // I2C SCL connected to D1 (GPIO 5)

// LCD 16x2 I2C setup (Default address is usually 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);
DHT dht(DHTPIN, DHTTYPE);

// Interval Configuration (10 seconds)
const unsigned long TELEMETRY_INTERVAL_MS = 10000;
unsigned long lastTelemetryTime = 0;

// Cached State
String currentLcdLine1 = "Torrent IoT";
String currentLcdLine2 = "Ready...";
int currentLedState = 0;

// ==========================================
// Helper Functions
// ==========================================

void connectToWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi:");
  lcd.setCursor(0, 1);
  lcd.print("COE YAVATMAL");

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 30) {
    delay(500);
    Serial.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected Successfully!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());

    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected!");
    lcd.setCursor(0, 1);
    lcd.print(WiFi.localIP().toString());
    delay(2000);
  } else {
    Serial.println("\nFailed to connect to WiFi! Retrying in background...");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed!");
    lcd.setCursor(0, 1);
    lcd.print("Check Credentials");
    delay(2000);
  }
}

void updateLcdScreen(String line1, String line2) {
  // Pad strings to 16 characters for clean overwriting
  while (line1.length() < 16) line1 += " ";
  while (line2.length() < 16) line2 += " ";

  line1 = line1.substring(0, 16);
  line2 = line2.substring(0, 16);

  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);

  currentLcdLine1 = line1;
  currentLcdLine2 = line2;
}

void sendTelemetryAndSync(float temperature, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected. Skipping telemetry sync.");
    return;
  }

  WiFiClient client;
  HTTPClient http;

  Serial.println("\n-------------------------------------------");
  Serial.print("Sending DHT11 Telemetry to: ");
  Serial.println(serverEndpoint);

  http.begin(client, serverEndpoint);
  http.addHeader("Content-Type", "application/json");

  // Create JSON Payload
  StaticJsonDocument<256> reqDoc;
  reqDoc["temperature"] = temperature;
  reqDoc["humidity"] = humidity;

  String requestBody;
  serializeJson(reqDoc, requestBody);

  Serial.print("Payload: ");
  Serial.println(requestBody);

  int httpCode = http.POST(requestBody);

  if (httpCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Response Code: ");
    Serial.println(httpCode);
    Serial.print("Server Response: ");
    Serial.println(response);

    if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED) {
      StaticJsonDocument<512> resDoc;
      DeserializationError error = deserializeJson(resDoc, response);

      if (!error) {
        // 1. Process LED State
        if (resDoc.containsKey("led_state")) {
          int targetLed = resDoc["led_state"];
          if (targetLed != currentLedState) {
            currentLedState = targetLed;
            digitalWrite(LED_PIN, (currentLedState == 1) ? HIGH : LOW);
            Serial.printf("LED updated to: %s\n", (currentLedState == 1) ? "ON" : "OFF");
          }
        }

        // 2. Process Smart LCD Display Text
        String targetLine1 = resDoc["lcd_line1"] | currentLcdLine1;
        String targetLine2 = resDoc["lcd_line2"] | currentLcdLine2;

        if (targetLine1 != currentLcdLine1 || targetLine2 != currentLcdLine2) {
          Serial.println("Updating LCD text from server...");
          updateLcdScreen(targetLine1, targetLine2);
        }
      } else {
        Serial.print("JSON Deserialization failed: ");
        Serial.println(error.f_str());
      }
    }
  } else {
    Serial.printf("HTTP POST Failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
}

// ==========================================
// Arduino Setup & Main Loop
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n\n=======================================");
  Serial.println("  TORRENT IoT System - ESP8266 Booting");
  Serial.println("  Dept. of Electrical Engineering, GCOEY");
  Serial.println("=======================================");

  // Initialize LED Pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW); // Start with LED OFF

  // Initialize I2C communication on D2(SDA) and D1(SCL)
  Wire.begin(I2C_SDA, I2C_SCL);

  // Initialize LCD
  lcd.init();
  lcd.backlight();
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Torrent IoT");
  lcd.setCursor(0, 1);
  lcd.print("EE Dept GCOEY");

  // Initialize DHT11 Sensor
  dht.begin();
  delay(1500);

  // Connect to WiFi
  connectToWiFi();

  // Set default initial display
  updateLcdScreen("Torrent Ready", "Temp & Hum Mon");
}

void loop() {
  // Auto-reconnect WiFi if connection drops
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi dropped. Reconnecting...");
    WiFi.reconnect();
    delay(2000);
  }

  unsigned long currentMillis = millis();

  // Transmit telemetry every 10 seconds
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS || lastTelemetryTime == 0) {
    lastTelemetryTime = currentMillis;

    // Read Temperature & Humidity from DHT11
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature(); // Celsius

    // Check if any reads failed
    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("⚠️ Warning: Failed to read data from DHT11 sensor! Checking wiring on D5...");
      // Still notify server with -1 or skip
    } else {
      Serial.printf("DHT11 Reading -> Temp: %.1f C | Humidity: %.1f %%\n", temperature, humidity);
      // Send to server and receive updated LED/LCD commands
      sendTelemetryAndSync(temperature, humidity);
    }
  }

  // Small delay for stability
  delay(50);
}
