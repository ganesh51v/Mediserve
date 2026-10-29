# MediServe Hardware Wiring & Assembly Guide

This document details the physical hardware construction, electrical wiring, pinout mapping, and safety interlocks for the **MediServe ESP32 Smart Medication Dispenser**.

---

## 1. Bill of Materials (BOM)

| Item | Component | Model / Part | Quantity | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **MCU** | ESP32-WROOM-32 DevKit | 30-Pin / 38-Pin ESP32-S3 | 1 | Master controller, Wi-Fi 802.11 b/g/n, FreeRTOS |
| **OLED** | Monochrome I2C Display | 0.96" SSD1306 (128x64) | 1 | Real-time clock, medication instructions, QR/ID |
| **Motor** | Rotary Carousel Stepper | 28BYJ-48 5V Stepper + ULN2003 | 1 | 4-compartment 90° indexing rotary mechanism |
| **Button** | Large Momentary Pushbutton | 24mm Arcade or SPST Panel Mount | 1 | Patient Ingestion Confirmation (Active-LOW) |
| **Buzzer** | Acoustic Alert Sounder | 5V Piezoelectric Transducer | 1 | 2.4kHz alarm chime when dose is due |
| **LED 1** | Dual-Color Status Lens | 5mm Bi-Color Green / Red LED | 1 | Green = Ready, Red = Jammed/Fault |
| **LED 2** | Status Alert Lens | 5mm Amber LED | 1 | Amber = Dose Due / Awaiting Ingestion |
| **Drop Sensor** | IR Optical Break-Beam | Omron EE-SX672 or TCRT5000 | 1 | Pill drop detection into discharge chute |
| **Resistors** | Current Limiting | 220 $\Omega$ (x3) | 3 | Protection for LEDs |
| **Power** | 5V 2A Power Supply | USB-C Breakout or 5V 2A Wall Wart | 1 | Powers ESP32, ULN2003 stepper driver, and OLED |

---

## 2. Complete Pinout Mapping

```
                 ESP32-WROOM-32 Pinout Connections
                 +-------------------------------+
                 |  [USB-C Programming Port]     |
          3V3 ---| 3V3                       GND |--- Common Ground
           EN ---| EN                       GPIO23|--- ULN2003 IN4 (Stepper)
       GPIO36 ---| VP                       GPIO22|--- I2C SCL (SSD1306 OLED)
       GPIO39 ---| VN                       GPIO1|--- TX0 (Debug Serial)
       GPIO34 ---| GPIO34                   GPIO3|--- RX0 (Debug Serial)
       GPIO35 ---| GPIO35                   GPIO21|--- I2C SDA (SSD1306 OLED)
(IR Drop) GPIO32 -| GPIO32                  GPIO19|--- Buzzer Anode (+)
       GPIO33 ---| GPIO33                   GPIO18|--- ULN2003 IN1 (Stepper)
 (Button) GPIO4 -| GPIO4                     GPIO5|--- ULN2003 IN2 (Stepper)
       GPIO0  ---| GPIO0                    GPIO17|--- ULN2003 IN3 (Stepper)
  (LED Red) GPIO15-| GPIO15                  GPIO16|--- LED Green (220 Ohm)
       GPIO2  ---| GPIO2                    GPIO4 |--- LED Amber (220 Ohm)
                 +-------------------------------+
```

### Detailed Wiring Table

| Component | Pin | ESP32 Pin | Logic / Wiring Notes |
| :--- | :--- | :--- | :--- |
| **SSD1306 OLED** | `VCC` | `3V3` | 3.3V Power Rail |
| | `GND` | `GND` | Ground Reference |
| | `SDA` | `GPIO 21` | I2C Data (Requires internal pull-up) |
| | `SCL` | `GPIO 22` | I2C Clock (100kHz / 400kHz standard) |
| **Confirm Button** | Terminal 1 | `GPIO 4` | Configured as `pinMode(4, INPUT_PULLUP)` |
| | Terminal 2 | `GND` | Momentary closure drives pin LOW |
| **Piezo Buzzer** | Anode (`+`) | `GPIO 19` | PWM tone generation (`tone(19, 2400)`) |
| | Cathode (`-`)| `GND` | Ground |
| **Green LED** | Anode (`+`) | `GPIO 16` | In series with 220 $\Omega$ resistor (Solid when Ready) |
| **Amber LED** | Anode (`+`) | `GPIO 2` | In series with 220 $\Omega$ resistor (Pulses when Due) |
| **Red LED** | Anode (`+`) | `GPIO 15` | In series with 220 $\Omega$ resistor (Strobe on Fault) |
| **IR Drop Sensor**| Output (`D0`)| `GPIO 32` | Digital drop pulse when pill breaks optical beam |
| | `VCC` / `GND` | `5V` / `GND` | Sensor power rail |
| **ULN2003 Driver**| `IN1` | `GPIO 18` | Stepper Coil A |
| | `IN2` | `GPIO 5` | Stepper Coil B |
| | `IN3` | `GPIO 17` | Stepper Coil C |
| | `IN4` | `GPIO 23` | Stepper Coil D |
| | `+5V` / `GND` | External 5V | Stepper Motor High-Current Power Rail |

---

## 3. Mechanical Carousel Calibration

1. **Compartment Indexing:** The carousel features 4 radially spaced slots ($90^\circ$ apart).
2. **Steps per Revolution:** The 28BYJ-48 with 1:64 reduction gearbox requires 2048 steps for a full $360^\circ$ turn.
   - Each slot advance = $2048 \div 4 = 512\text{ steps}$.
3. **Safety Jam Detection:**
   - If the stepper motor takes $> 1.5\text{ seconds}$ to step or the IR drop sensor does not detect a falling pill within 2000ms after opening, the motor driver is powered down (`all coils LOW`), the red LED triggers, and an MQTT alert packet is sent to the cloud.
