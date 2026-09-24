# MediServe – Smart Medication Monitoring & Management Web Application

MediServe is a modern, responsive, and secure full-stack healthcare web platform built for a **Smart Meal-Aware Medication Dispensing System**. The platform bridges patients, doctors, caretakers, smart IoT dispensing hardware, meal detection routines, and real-time adherence analytics into a unified clinical workstation.

---

## 🌟 Key Features

### 1. Role-Based Healthcare Dashboards
- **Doctor Workspace**:
  - Assigned patient panel with medical condition tracking and clinical vitals.
  - Comprehensive **Prescription Creation Form**: Configure medicine name, form (Tablet, Capsule, Liquid, Injection, Inhaler, Topical), dosage, frequency, start/end dates, instructions, precautions, and safety refill thresholds.
  - **Meal-Aware Schedule Linkage**: Attach doses to meals (*Before Breakfast, After Breakfast, Before Lunch, After Lunch, Before Dinner, After Dinner, With Meal, Empty Stomach, Custom Time*).
  - Adherence breakdown with weekly/monthly curves and clinical safety disclaimers.
- **Caretaker Station**:
  - Monitoring-focused interface with **Today's Overview**: Total Scheduled, Taken, Pending, Missed, Delayed, and Upcoming.
  - **Visual Status Badges**: Taken (Emerald), Pending (Amber), Missed (Rose), Delayed (Orange), Dispensing (Indigo), Device Offline (Slate).
  - **Real-Time Medication Timeline**: Automatic real-time status transitions as doses are dispensed or confirmed.
  - **Emergency Action**: One-click dial and direct emergency contact information for every monitored patient.
- **Administrator Console**:
  - Platform governance: Total users, active doctors, caretakers, monitored patients, dispenser fleet status, and critical alerts.
  - User and staff registration with role management.
  - Hardware device fleet telemetry and battery health.
  - Immutable **System Audit Trail** recording all sensitive clinical and administrative operations.

### 2. Detailed Patient Profile (7-Tab Medical Workstation)
1. **Overview**: Demographics, blood group, allergies, conditions, attending doctor, caretaker, emergency contact with instant dialing.
2. **Medications**: Active and historical prescriptions, dosage, frequency, meal relations, and current stock levels.
3. **Schedule**: Daily chronological schedule mapped to meals.
4. **Adherence**: Real-time compliance score (\(\frac{\text{Taken}}{\text{Scheduled}} \times 100\)), weekly and monthly Recharts curves, with required compliance disclaimers.
5. **Health Records**: Vital signs tracking (Blood Pressure, Heart Rate, Blood Glucose, SpO2, Temperature) with interactive "+ Log Vitals" modal.
6. **Smart Dispenser**: Connected IoT hardware identifier, battery %, signal strength, firmware version, and 6-slot compartment fill gauges.
7. **Alerts**: Patient-specific alerts with quick **Acknowledge** and **Resolve** workflows.

### 3. Smart Medication Dispensing & Hardware Integration
- Secure hardware REST API endpoints (`/api/device/register`, `/api/device/heartbeat`, `/api/device/events`, `/api/device/dispense`, `/api/device/status`, `/api/device/config`).
- Supported hardware events:
  - `MEAL_DETECTED` (Breakfast, Lunch, Dinner)
  - `MEDICATION_DISPENSED`
  - `DOSE_TAKEN`
  - `DOSE_MISSED`
  - `DEVICE_ONLINE`
  - `DEVICE_OFFLINE`
  - `LOW_MEDICINE`
  - `DISPENSER_ERROR`
- **Interactive Hardware Simulator**: Built right into the web application (`/simulator`) to test real-time IoT events and observe instant WebSocket dashboard updates without page refreshes!

### 4. Meal-Aware Medication Engine
- Correlates meal detection events (e.g. `MEAL_DETECTED` with meal `breakfast`) against active schedules:
  - Automatically activates "After Breakfast" and morning "With Meal" prescriptions into `dispensing` / `dispensed`.
  - Decrements physical dispenser inventory.
  - Prevents erroneous or contradictory medication timing.

### 5. Medication Inventory & Refill Alert System
- Tracks stock counts for every medication.
- Automatically generates high-priority **Refill Alerts** whenever `current_quantity <= refill_threshold`.
- Built-in stock refill modal to replenish inventory and resolve active refill alerts.

### 6. Healthcare Reporting & CSV Export
- Adherence analytics, missed doses log, medication history, and inventory audits.
- Downloadable CSV spreadsheets for regulatory and clinical compliance.
- Print-optimized report layout.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, Axios, Socket.IO Client |
| **Backend** | Node.js, Express, TypeScript, Socket.IO (WebSockets), `better-sqlite3` (Relational SQL / PostgreSQL-compatible schema), Bcrypt, JWT, Helmet, Express-Rate-Limit |
| **Hardware Link** | REST Device API (`/api/device/*`), Token Authentication, Interactive IoT Simulator |
| **Testing** | Vitest, Supertest (100% pass across adherence, meal rule engine, and API integration) |

---

## 👥 Demo Accounts (Quick Login Enabled)

On the login page, you can either click the **One-Click Demo Role** buttons or use the credentials below:

| Role | Name | Email | Password |
|---|---|---|---|
| **Admin** | Administrator | `admin@mediserve.health` | `Password123!` |
| **Doctor** | Dr. Robert Smith (Cardiology) | `dr.smith@mediserve.health` | `Password123!` |
| **Doctor** | Dr. Anita Patel (Geriatrics) | `dr.patel@mediserve.health` | `Password123!` |
| **Caretaker** | Sarah Jenkins, RN | `sarah.caretaker@mediserve.health` | `Password123!` |
| **Caretaker** | David Miller | `david.caretaker@mediserve.health` | `Password123!` |
| **Caretaker** | Elena Rostova | `elena.caretaker@mediserve.health` | `Password123!` |

*Pre-seeded with 8 patients (`P-1001` through `P-1008`), active prescriptions, smart dispensers, historical vitals, and alert notifications.*

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+)

### Installation
From the root directory:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Database Seeding
To initialize and seed the relational database with realistic clinical data:
```bash
cd backend
npm run seed
```

### Running Locally
Open two terminal windows:

**Terminal 1 (Backend Server & WebSockets on port 5000):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend Client on port 5173):**
```bash
cd frontend
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 Automated Tests

Run the backend unit and integration test suite:
```bash
cd backend
npm test
```
Verifies:
- Medication Adherence formulas and trend calculations
- Meal-Aware rule scheduling and timing validation
- API authentication and role-based route protection
- Hardware heartbeat and telemetry endpoints

---

## 🔒 Security & Healthcare Compliance Note

- **Access Boundaries**: Role-based access control (RBAC) ensures Caretakers cannot prescribe medications, while Doctors and Administrators have strict clinical authorization.
- **Data Protection**: Passwords hashed with bcrypt; stateful JWT tokens; HTTP security headers via Helmet; rate limiting on sensitive routes; prepared SQL queries preventing SQL injection.
- **Healthcare Safety Notice**: MediServe is a medication monitoring and management tracking system. The application does not autonomously diagnose medical conditions, alter prescriptions without authorized clinical supervision, or replace emergency medical protocols. In any acute situation, users are directed to appropriate emergency services.
