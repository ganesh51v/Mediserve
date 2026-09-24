# MediServe – MERN Stack Edition
### Smart Medication Monitoring & Management System (MongoDB, Express, React, Node.js)

This edition rebuilds the complete MediServe healthcare platform using the **MERN Stack**:
- **M**: MongoDB (Mongoose models, schemas, and aggregation pipelines)
- **E**: Express.js REST API with JWT authentication, rate limiting, and role-based access control
- **R**: React 18 + Vite + Tailwind CSS + Lucide Icons + Recharts
- **N**: Node.js + WebSockets (Socket.IO)

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on default port `27017` (e.g. `mongodb://127.0.0.1:27017/mediserve_mern`)

### 2. Start MERN Development Servers
From the `mern/` directory:
```bash
npm run dev
```
Or from the root directory:
```bash
npm run mern:dev
```

This starts:
- **MERN Backend API**: [http://localhost:5001/api](http://localhost:5001/api) (WebSockets: `ws://localhost:5001`)
- **MERN Frontend UI**: [http://localhost:5174/](http://localhost:5174/)

---

## 📦 Available Scripts (in `mern/`)

| Command | Action |
| :--- | :--- |
| `npm run dev` | Runs both backend (port 5001) and frontend (port 5174) concurrently |
| `npm run dev:backend` | Runs MERN Express server with hot-reload (`tsx watch`) |
| `npm run dev:frontend` | Runs MERN Vite frontend dev server |
| `npm run build` | Compiles backend TypeScript (`tsc`) and bundles frontend (`vite build`) |
| `npm test` | Runs the automated backend test suite (10/10 Vitest tests) |
| `npm run seed` | Seeds realistic clinical demo data into MongoDB |
| `npm run db:clear` | Purges all MongoDB collections to reset to a clean empty state |

---

## 🏥 Architecture Overview

### MongoDB Collections (`mern/backend/src/models/`)
- `users`: Healthcare staff credentials, roles (`admin`, `doctor`, `caretaker`), and status.
- `patients`: Demographics, assigned doctor/caretaker, conditions, allergies, and emergency contacts.
- `devices`: Smart dispenser fleet with 6-compartment allocation, signal strength, battery level, and last seen.
- `medications`: Prescriptions with stock counts, refill alert thresholds, frequencies, and meal relations.
- `medicationschedules`: Daily timing rules linked to meal phases.
- `medicationevents`: Dosage tracking (`pending`, `dispensing`, `taken`, `missed`, `delayed`).
- `alerts`: Real-time critical clinical and hardware notifications with acknowledgment workflows.
- `healthrecords`: Patient biometric vital signs (BP, pulse, glucose, SpO2, temp).
- `auditlogs`: Immutable administrative audit trail.
