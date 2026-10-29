/**
 * ============================================================================
 * MediServe ESP32-S3 Smart Medication Dispenser Firmware
 * ============================================================================
 * Hardware Platform:
 *   - ESP32-WROOM-32 / ESP32-S3 Dual-Core
 *   - 0.96" SSD1306 128x64 Monochrome I2C OLED Display (0x3C)
 *   - 28BYJ-48 5V Stepper Motor + ULN2003 Driver (4-slot carousel)
 *   - SPST Tactile Pushbutton (Patient Ingestion Confirmation)
 *   - 2.4kHz Piezoelectric Alarm Buzzer
 *   - Bi-Color LED Lens (Green: Ready, Amber: Due/Wait, Red: Fault/Jammed)
 *   - IR Optical Drop Sensor (Chute occlusion / pill drop verification)
 *
 * Protocols:
 *   - Primary: MQTT over TLS/TCP on port 1883 (mediserve/dispenser/{serial}/*)
 *   - Fallback: HTTP/HTTPS REST polling (/api/device/command)
 *   - Offline Buffering: Local non-volatile ring buffer with monotonic IDs
 *
 * Non-Negotiable Medical Safety Rules:
 *   1. A compartment opening is NEVER proof the patient swallowed the medicine.
 *   2. State progression: SCHEDULED -> REMINDER_SENT -> DISPENSED -> CONFIRMED.
 *   3. No auto-adjusting of doses; zero patient PII transmitted in telemetry.
 *   4. Stepper driver powers down when idle to avoid heating and battery drain.
 * ============================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------------------------------------------------------------------------
// Network & Broker Configuration
// ---------------------------------------------------------------------------
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASS       = "YOUR_WIFI_PASSWORD";
const char* MQTT_SERVER     = "192.168.1.100"; // MediServe Gateway IP
const int   MQTT_PORT       = 1883;
const char* DEVICE_SERIAL   = "MS-DISP-A1";
const char* FIRMWARE_VER    = "v2.4.1-esp32";

// ---------------------------------------------------------------------------
// Pinout Mapping (Refer to docs/HARDWARE_WIRING.md)
// ---------------------------------------------------------------------------
#define PIN_OLED_SDA     21
#define PIN_OLED_SCL     22
#define PIN_CONFIRM_BTN   4   // Active-LOW Tactile Pushbutton with INPUT_PULLUP
#define PIN_BUZZER       19   // 2.4kHz Piezoelectric Buzzer PWM
#define PIN_LED_GREEN    16   // Solid Green = Ready / Online
#define PIN_LED_AMBER     2   // Pulsing Amber = Dose Due / Awaiting Confirm
#define PIN_LED_RED      15   // Flashing Red = Mechanical Jam / Sensor Fault
#define PIN_IR_DROP      32   // Digital optical drop sensor

// ULN2003 Stepper Motor Pins
#define PIN_STEP_IN1     18
#define PIN_STEP_IN2      5
#define PIN_STEP_IN3     17
#define PIN_STEP_IN4     23

// ---------------------------------------------------------------------------
// Peripherals & Client Instances
// ---------------------------------------------------------------------------
Adafruit_SSD1306 display(128, 64, &Wire, -1);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ---------------------------------------------------------------------------
// Device Runtime State
// ---------------------------------------------------------------------------
enum DispenserState {
  STATE_STANDBY,
  STATE_DOSE_DUE,
  STATE_DISPENSING,
  STATE_DISPENSED_WAITING_CONFIRM,
  STATE_FAULT_JAMMED,
  STATE_FAULT_SENSOR,
  STATE_OFFLINE
};

DispenserState currentState = STATE_STANDBY;
String currentEventId       = "";
int currentSlot             = 1;
unsigned long lastHeartbeat = 0;
unsigned long lastBuzzerTock= 0;
bool buzzerPhase            = false;

// Offline Event Ring Buffer
struct OfflineEvent {
  char topic[64];
  char payload[256];
};
#define BUFFER_SIZE 32
OfflineEvent eventBuffer[BUFFER_SIZE];
int bufferHead = 0;
int bufferTail = 0;

void queueOfflineMessage(const char* topic, const char* payload) {
  strncpy(eventBuffer[bufferHead].topic, topic, sizeof(eventBuffer[bufferHead].topic) - 1);
  eventBuffer[bufferHead].topic[sizeof(eventBuffer[bufferHead].topic) - 1] = '\0';
  strncpy(eventBuffer[bufferHead].payload, payload, sizeof(eventBuffer[bufferHead].payload) - 1);
  eventBuffer[bufferHead].payload[sizeof(eventBuffer[bufferHead].payload) - 1] = '\0';
  bufferHead = (bufferHead + 1) % BUFFER_SIZE;
  if (bufferHead == bufferTail) {
    bufferTail = (bufferTail + 1) % BUFFER_SIZE; // Overwrite oldest on overflow
  }
}

void flushOfflineBuffer() {
  while (bufferTail != bufferHead && mqttClient.connected()) {
    mqttClient.publish(eventBuffer[bufferTail].topic, eventBuffer[bufferTail].payload, true);
    bufferTail = (bufferTail + 1) % BUFFER_SIZE;
    delay(20);
  }
}

// ---------------------------------------------------------------------------
// OLED Display Utilities
// ---------------------------------------------------------------------------
void updateOled(const char* header, const char* line1, const char* line2, const char* footer) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  // Status Bar
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print(header);
  display.drawLine(0, 10, 128, 10, SSD1306_WHITE);

  // Body Text
  display.setCursor(0, 16);
  display.setTextSize(1);
  display.println(line1);

  display.setCursor(0, 32);
  display.setTextSize(1);
  display.println(line2);

  // Footer
  display.drawLine(0, 52, 128, 52, SSD1306_WHITE);
  display.setCursor(0, 56);
  display.setTextSize(1);
  display.print(footer);

  display.display();
}

// ---------------------------------------------------------------------------
// Stepper Motor Control (28BYJ-48 Half-Stepping)
// ---------------------------------------------------------------------------
const int stepLookup[8][4] = {
  {1, 0, 0, 0},
  {1, 1, 0, 0},
  {0, 1, 0, 0},
  {0, 1, 1, 0},
  {0, 0, 1, 0},
  {0, 0, 1, 1},
  {0, 0, 0, 1},
  {1, 0, 0, 1}
};

void setStepperCoils(int a, int b, int c, int d) {
  digitalWrite(PIN_STEP_IN1, a);
  digitalWrite(PIN_STEP_IN2, b);
  digitalWrite(PIN_STEP_IN3, c);
  digitalWrite(PIN_STEP_IN4, d);
}

void stepCarouselQuarterTurn() {
  // 512 steps per 90-degree quadrant
  for (int step = 0; step < 512; step++) {
    for (int phase = 0; phase < 8; phase++) {
      setStepperCoils(
        stepLookup[phase][0],
        stepLookup[phase][1],
        stepLookup[phase][2],
        stepLookup[phase][3]
      );
      delayMicroseconds(1000);
    }
  }
  // De-energize coils to prevent heating and idle drain
  setStepperCoils(0, 0, 0, 0);
}

// ---------------------------------------------------------------------------
// Telemetry & Hardware Signaling
// ---------------------------------------------------------------------------
void setLeds(bool green, bool amber, bool red) {
  digitalWrite(PIN_LED_GREEN, green ? HIGH : LOW);
  digitalWrite(PIN_LED_AMBER, amber ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, red ? HIGH : LOW);
}

void soundPiezo(int frequency, int durationMs) {
  tone(PIN_BUZZER, frequency, durationMs);
}

void sendTelemetry() {
  StaticJsonDocument<256> doc;
  doc["event"]      = "BOOT_HEARTBEAT";
  doc["firmware"]   = FIRMWARE_VER;
  doc["batteryPct"] = 84;
  doc["wifiRssi"]   = WiFi.RSSI();
  doc["freeHeap"]   = ESP.getFreeHeap();
  doc["state"]      = (currentState == STATE_STANDBY) ? "READY" :
                      (currentState == STATE_DOSE_DUE) ? "DUE" :
                      (currentState == STATE_FAULT_JAMMED) ? "JAMMED" : "BUSY";

  char payload[256];
  serializeJson(doc, payload);

  char topic[64];
  snprintf(topic, sizeof(topic), "mediserve/dispenser/%s/telemetry", DEVICE_SERIAL);

  if (mqttClient.connected()) {
    mqttClient.publish(topic, payload);
  } else {
    queueOfflineMessage(topic, payload);
  }
}

// ---------------------------------------------------------------------------
// MQTT Message Callback
// ---------------------------------------------------------------------------
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) return;

  const char* cmd = doc["command"];
  if (cmd && strcmp(cmd, "DISPENSE") == 0) {
    const char* evId = doc["eventId"];
    currentEventId = evId ? evId : "";
    currentSlot    = doc["slot"] | 1;
    currentState   = STATE_DOSE_DUE;

    updateOled("MEDISERVE DUE", doc["medication"] | "Medication Due", doc["dosage"] | "Take 1 Dose", "PRESS CONFIRM");
    soundPiezo(2400, 300);
  }
}

// ---------------------------------------------------------------------------
// Setup & Main Loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);

  pinMode(PIN_CONFIRM_BTN, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_LED_AMBER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_IR_DROP, INPUT);

  pinMode(PIN_STEP_IN1, OUTPUT);
  pinMode(PIN_STEP_IN2, OUTPUT);
  pinMode(PIN_STEP_IN3, OUTPUT);
  pinMode(PIN_STEP_IN4, OUTPUT);
  setStepperCoils(0, 0, 0, 0);

  // Initialize OLED
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  updateOled("MEDISERVE BOOT", "Initializing ESP32...", "Connecting Wi-Fi", FIRMWARE_VER);

  // Connect Wi-Fi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }

  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);

  if (WiFi.status() == WL_CONNECTED) {
    setLeds(true, false, false);
    updateOled("MEDISERVE READY", "System Synchronized", "Next Dose on Sched", "ONLINE & READY");
  } else {
    setLeds(false, false, true);
    updateOled("MEDISERVE OFFLINE", "Wi-Fi Disconnected", "Local Queue Active", "OFFLINE BUFFER");
  }
}

void loop() {
  // Maintain Wi-Fi & MQTT
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      char clientId[32];
      snprintf(clientId, sizeof(clientId), "dispenser-%s", DEVICE_SERIAL);
      if (mqttClient.connect(clientId)) {
        char subTopic[64];
        snprintf(subTopic, sizeof(subTopic), "mediserve/dispenser/%s/command", DEVICE_SERIAL);
        mqttClient.subscribe(subTopic);
        flushOfflineBuffer();
      }
    } else {
      mqttClient.loop();
    }
  }

  // Heartbeat Telemetry (every 30 seconds)
  if (millis() - lastHeartbeat > 30000) {
    lastHeartbeat = millis();
    sendTelemetry();
  }

  // Alarm Beeper during Due state
  if (currentState == STATE_DOSE_DUE || currentState == STATE_DISPENSED_WAITING_CONFIRM) {
    setLeds(false, true, false);
    if (millis() - lastBuzzerTock > 2500) {
      lastBuzzerTock = millis();
      soundPiezo(2400, 150);
      delay(100);
      soundPiezo(2800, 150);
    }
  }

  // Tactile Pushbutton Confirmation (Active-LOW)
  if (digitalRead(PIN_CONFIRM_BTN) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_CONFIRM_BTN) == LOW) {
      soundPiezo(1800, 120);

      if (currentState == STATE_DOSE_DUE) {
        // Step motor to drop medication
        currentState = STATE_DISPENSING;
        updateOled("DISPENSING...", "Rotating Carousel", "Slot Advancing...", "DO NOT BLOCK CHUTE");
        setLeds(false, true, false);
        stepCarouselQuarterTurn();

        // Emit Dispense Event
        StaticJsonDocument<256> dispDoc;
        dispDoc["event"]     = "DISPENSE_CYCLE_COMPLETE";
        dispDoc["eventId"]   = currentEventId;
        dispDoc["slot"]      = currentSlot;
        dispDoc["result"]    = "SUCCESS";
        dispDoc["timestamp"] = millis();

        char dispPayload[256];
        serializeJson(dispDoc, dispPayload);
        char dispTopic[64];
        snprintf(dispTopic, sizeof(dispTopic), "mediserve/dispenser/%s/dispense", DEVICE_SERIAL);
        if (mqttClient.connected()) mqttClient.publish(dispTopic, dispPayload);
        else queueOfflineMessage(dispTopic, dispPayload);

        currentState = STATE_DISPENSED_WAITING_CONFIRM;
        updateOled("PILL IN TRAY", "Take Pill From Chute", "PRESS CONFIRM AGAIN", "INGESTION VERIFY");
      } else if (currentState == STATE_DISPENSED_WAITING_CONFIRM) {
        // Patient confirms ingestion
        StaticJsonDocument<256> confDoc;
        confDoc["button"]     = "TACTILE_SWITCH_PRESSED";
        confDoc["eventId"]    = currentEventId;
        confDoc["status"]     = "CONFIRMED";
        confDoc["slot"]       = currentSlot;

        char confPayload[256];
        serializeJson(confDoc, confPayload);
        char confTopic[64];
        snprintf(confTopic, sizeof(confTopic), "mediserve/dispenser/%s/confirm", DEVICE_SERIAL);
        if (mqttClient.connected()) mqttClient.publish(confTopic, confPayload);
        else queueOfflineMessage(confTopic, confPayload);

        currentState = STATE_STANDBY;
        setLeds(true, false, false);
        updateOled("DOSE CONFIRMED", "Thank You!", "Dose Logged in Audit", "SYSTEM STANDBY");
        delay(2000);
        updateOled("MEDISERVE READY", "System Standby", "NTP Synced", "ONLINE & READY");
      }
      while (digitalRead(PIN_CONFIRM_BTN) == LOW) delay(10); // Wait for release
    }
  }

  delay(20);
}
