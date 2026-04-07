# 🚗⚡ EV Saarthi — Project Development Log
**Team Progress Document | March – May 2026**

---

## 🏗️ Project Architecture Overview

EV Saarthi is built as a **Micro-Frontend + Microservice** architecture:

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React (CRA) | 7 independent micro-apps |
| **Backend** | Node.js + Express | 7 microservices (consolidated for production) |
| **Database** | Firebase Firestore | Real-time NoSQL database |
| **Auth** | Firebase Auth | Google One-Tap Sign-In |
| **Payments** | Razorpay | EV slot booking payments |
| **Maps** | Mappls API | Indian maps & geocoding |
| **Storage** | Firebase Storage | Review photo uploads |
| **CI/CD** | GitHub + GitLab CI | Automated testing pipeline |
| **Hosting (Backend)** | Render.com | Unified Node.js service |
| **Hosting (Frontend)** | Vercel | Unified static deployment |

---

## ✅ PHASE 1 — Core MVP
**March 6 – April 4, 2026 (4 Weeks)**

### Week 1 — Mar 6–10: Foundation & Environment Setup
**What we built:**
- Initialized Firebase project (`ru-green-ev-bf229`) with Firestore database.
- Created the Git repository on GitLab and GitHub.
- Set up `.env` files for both frontend and backend services.
- Configured the CI/CD pipeline skeleton using `.gitlab-ci.yml`.
- Set up 7 backend microservices (auth, user, station, booking, vehicle, admin, gateway).
- Set up the 7 React micro-frontend apps (shell, auth, dashboard, booking, map, profile, admin).

**Key Files Created:**
- `backend/*/server.js` — Individual service entry points
- `frontend/*/src/App.js` — Individual React app roots
- `.gitignore`, `.gitlab-ci.yml`

---

### Week 2 — Mar 11–17: Authentication
**What we built:**
- Google One-Tap Sign-In integrated via Firebase Authentication.
- On first login, user profile automatically created in Firestore `users/` collection.
- JWT token verification middleware built for all protected routes.
- `auth-service` backend for token validation.

**Key Files:**
- `backend/auth-service/routes/auth.js` — Token verification endpoint
- `frontend/auth-app/src/` — Login UI with Google Sign-In

---

### Week 3 — Mar 18–24: Charging Station Map
**What we built:**
- Interactive map using **Mappls API** (Indian mapping provider).
- Real-time station status using Firestore `onSnapshot()` listener.
- Green/Yellow/Red marker system based on available slots.
- Station popup with details (address, price, connector type, rating).

**Key Files:**
- `frontend/map-app/src/pages/MapPage.js` — Full map with station markers
- `backend/station-service/routes/stations.js` — Station data API

---

### Week 4 — Mar 25–31: Slot Booking System
**What we built:**
- Calendar UI for selecting date and time slot.
- Slot data written to Firestore `stations/{id}/slots/` collection.
- **Razorpay** payment integration for booking payments.
- Booking confirmation screen.
- Duplicate station prevention (server-side check by name + address).
- Multi-checkbox payment method selection for admin.
- Excel (XLSX) bulk station upload tool for admin.

**Key Files:**
- `frontend/booking-app/src/pages/BookingPage.js` — Full booking UI
- `backend/booking-service/routes/booking.js` — Payment + Firestore booking logic
- `frontend/admin-app/src/pages/StationsPage.js` — Admin station management
- `frontend/admin-app/sample_stations.csv` — Sample CSV for bulk upload

---

### Week 5 — Apr 1–4: Analytics Dashboard + Green Points
**What we built:**
- Recharts bar/line charts showing: km driven, CO2 saved, money saved.
- Green Points system — points auto-awarded on trip/booking completion.
- Points balance display in user dashboard.

**Key Files:**
- `frontend/dashboard-app/src/` — Dashboard charts and points display
- `frontend/shell-app/src/` — Main shell/navigation app

### 🎯 Phase 1 Deliverable
> **Working app: Login → Find Stations on Map → Book a Slot → See Points Dashboard**

---

## ✅ PHASE 2 — Feature Expansion
**April 5 – April 18, 2026 (2 Weeks)**

### Week 6 — Apr 5–11: Community Review System
**What we built:**
- 5-star rating system for charging stations.
- Photo upload to Firebase Storage (from booking page).
- GPS-verified review (visit check — user must book to review).
- Reviews displayed in station popup on map.
- **Admin review moderation** — Approve/Reject reviews from admin panel.
- Average rating calculated and stored per station.
- `sync-ratings` script to fix historical rating data.

**Key Files:**
- `backend/station-service/routes/stations.js` — Review POST/GET endpoints
- `frontend/booking-app/src/pages/BookingPage.js` — Review form (post-booking)
- `frontend/admin-app/src/pages/ReviewsPage.js` — Admin review moderation UI
- `sync_ratings_script.js` — One-time fix script for rating averages

---

### Week 7 — Apr 8 (today): Production Deployment
**What we built:**
- **Unified Production Backend** — Consolidated all 7 microservices into a single Express app in `backend/production/` for easier/cheaper hosting.
- **Centralized Firebase Config** — Supports both local file key and production Base64 environment variable.
- **Vercel Frontend Deployment** — All 7 React apps built and hosted under one Vercel project using subfolder routing.
- **Render.com Backend Deployment** — Single Node.js instance serving all API routes.
- `scripts/build-all.js` — Master build script that builds all 7 apps and organizes them into a unified `public/` folder.
- `vercel.json` — Traffic router directing `/admin`, `/booking`, `/auth`, etc. to the correct app.

**Live URLs:**
- 🟢 **Backend API:** `https://ev-saarthi-backend.onrender.com`
- 🟡 **Frontend:** `https://ev-saarthi-frontend.vercel.app` *(deploying...)*

**Key Files:**
- `backend/production/index.js` — Unified master backend entry point
- `backend/production/routes/` — All service routes merged here
- `backend/production/config/firebase.js` — Environment-smart Firebase init
- `backend/production/package.json` — All dependencies in one file
- `scripts/build-all.js` — Automates building all 7 frontend apps
- `vercel.json` — Vercel routing configuration

---

## 🔜 PHASE 3 — AI & Advanced Features
**April 18 – May 4, 2026**

### Week 8 — Apr 18–26: AI Trip Planner *(Upcoming)*
- Mappls API for route planning.
- OpenWeatherMap for temperature-aware range calculation.
- Range Engine with AC/temperature/terrain factors.
- Multi-stop charging plan builder.

### Week 9 — Apr 26–May 4: AI Chatbot *(Upcoming)*
- Hindi and English language support.
- Indian EV context in system prompt (subsidies, range tips).

---

## 🔜 PHASE 4 — Battery Exchange + Launch
**May 4 – May 18, 2026**

- **Battery Exchange Bazaar**: List/browse/buy second-hand batteries.
- Admin moderation queue for listings.
- Final production deployment and public launch.

---

## 📦 Repository Structure

```
EVSaarthi/
├── backend/
│   ├── production/          ← 🆕 Unified deployment backend
│   │   ├── index.js         ← Master entry point
│   │   ├── config/firebase.js
│   │   ├── routes/          ← auth, user, stations, booking, vehicle, admin
│   │   └── package.json
│   ├── auth-service/        ← Original microservice (local dev)
│   ├── user-service/
│   ├── station-service/
│   ├── booking-service/
│   ├── vehicle-service/
│   └── admin-service/
├── frontend/
│   ├── shell-app/           ← Root app (homepage)
│   ├── auth-app/            ← Login/Register
│   ├── dashboard-app/       ← Analytics + Green Points
│   ├── booking-app/         ← Slot booking + Reviews
│   ├── map-app/             ← Station Map
│   ├── profile-app/         ← User profile
│   └── admin-app/           ← Admin panel
├── scripts/
│   └── build-all.js         ← 🆕 Builds all 7 apps for Vercel
├── vercel.json              ← 🆕 Vercel routing config
├── .gitlab-ci.yml           ← CI/CD pipeline
└── .gitignore
```

---

## 🔑 Environment Variables (Production)

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Render | Base64-encoded service account JSON |
| `RAZORPAY_KEY_ID` | Render | Payment gateway key |
| `RAZORPAY_KEY_SECRET` | Render | Payment gateway secret |
| `REACT_APP_API_URL` | Vercel | Render backend URL |

---

*Document last updated: April 8, 2026*
