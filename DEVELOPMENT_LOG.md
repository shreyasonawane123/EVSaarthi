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
**March 6 – April 4, 2026 (5 Weeks)**

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
- Station popup with details: address, price, connector type, live rating.
- **Haversine formula** for calculating real-world distance between user and stations.
- Nearby station search by GPS coordinates + configurable radius.

**Key Files:**
- `frontend/map-app/src/pages/MapPage.js` — Full map with station markers
- `backend/station-service/routes/stations.js` — Station data API with geolocation

---

### Week 4 — Mar 25–31: Slot Booking System + Admin Tools
**What we built:**
- Calendar UI for selecting date and time slot.
- Auto-generated time slots per station using the `slotGenerator` utility.
- **Station Operating Hours** — Admin can define custom open/close times per day, and slots are only generated within those active hours.
- Slot data written to Firestore `stations/{id}/slots/` collection.
- **Razorpay** payment integration (verified payment flow).
- Booking confirmation screen.
- **Server-side Duplicate Prevention** — When an admin tries to add a station with the same name + city that already exists in Firestore, the request is rejected with a clear error message.
- **Multi-checkbox Payment Methods** — Admin can tag each station with one or more payment types (UPI, Card, Cash, etc.).
- **Excel Bulk Station Upload** — Admin can upload a `.csv` / `.xlsx` file to create dozens of stations at once. Each row is parsed and sent to the Firestore stations collection, with per-row error reporting.
- `sample_stations.csv` provided as a template for the bulk uploader.

**Key Files:**
- `frontend/booking-app/src/pages/BookingPage.js` — Full booking UI
- `backend/booking-service/routes/booking.js` — Razorpay + Firestore booking logic
- `backend/station-service/utils/slotGenerator.js` — Smart time slot generator
- `frontend/admin-app/src/pages/StationsPage.js` — Full admin station management
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
**April 5 – April 18, 2026**

### Week 6 — Apr 5–11: Community Review System
**What we built:**
- **5-star rating + text review form** shown to the user after completing a booking.
- **Photo Upload** — Users can attach a photo of the charging station with their review. Stored in Firebase Storage.
- **GPS-Verified Reviews** — Only users with a verified booking are permitted to post a review (prevents fake entries).
- **Auto-Approve Toggle** — Admin can configure each station to either auto-approve reviews or send them to the moderation queue.
- **Manual Review Moderation** — A full moderation dashboard in the Admin panel where admins can:
  - View all pending, approved, and rejected reviews across all stations.
  - See review text, star rating, reviewer name, and attached photo.
  - Click **"Approve"** or **"Reject"** on each review.
  - Approved reviews are shown to users on the map; rejected ones are hidden.
- **Live Average Rating** — Station rating is automatically recalculated every time a review is approved or rejected, using a weighted average formula.
- **Rating Sync Script** (`sync_ratings_script.js`) — A one-time migration script to fix historical station ratings that were not calculated correctly.
- Reviews are shown in the station popup on the map.

**Key Files:**
- `backend/station-service/routes/stations.js` — Review POST/GET + rating recalculation
- `frontend/booking-app/src/pages/BookingPage.js` — Review form (post-booking)
- `frontend/admin-app/src/pages/ReviewsPage.js` — Admin review moderation UI
- `sync_ratings_script.js` — One-time fix script for rating averages

---

### Week 7 — Apr 8 (Today): Operator System + Production Deployment
**What we built:**

**Operator Role System:**
- Added a new **Operator** user role (below Admin, above regular User).
- Operators can manage their own assigned stations: update slot availability, mark ports as occupied/broken.
- `verifyOperator` middleware created to protect operator-only routes.
- Admin can assign and remove operators from the **OperatorsPage** in the admin panel.

**Unified Production Backend:**
- Consolidated all 7 microservices into a single Express app in `backend/production/` for easier and cheaper hosting on Render.
- Centralized Firebase config that supports both local file key and production Base64 environment variable.
- All routes prefixed under `/api/` for clean, unified access.

**Frontend Deployment:**
- All 7 React apps built and hosted under one Vercel project using subfolder routing (`/admin`, `/booking`, `/auth`, etc.).
- `scripts/build-all.js` — Master build script that builds all 7 apps in sequence.
- `vercel.json` — Smart traffic router that serves the correct app for each URL path, without interfering with static assets.

**Live URLs:**
- 🟢 **Backend API:** `https://ev-saarthi-backend.onrender.com`
- 🟢 **Frontend:** `https://ev-saarthi-frontend.vercel.app`

**Key Files:**
- `backend/production/index.js` — Unified master backend
- `backend/station-service/middleware/verifyOperator.js` — Operator auth middleware
- `backend/station-service/routes/operators.js` — Operator management routes
- `frontend/admin-app/src/pages/OperatorsPage.js` — Admin operator management UI
- `scripts/build-all.js` — Automates building all 7 frontend apps
- `vercel.json` — Vercel routing configuration

---

## 📦 Extra Features Built (Beyond Original Plan)

| Feature | Where | Description |
|---|---|---|
| **Excel Bulk Upload** | Admin Panel | Upload `.csv`/`.xlsx` to create stations in bulk |
| **Duplicate Station Check** | Backend | Server-side rejection if station name+city already exists |
| **Operating Hours per Station** | Admin + Backend | Define daily open/close times; slots generated only within active hours |
| **Multi-Checkbox Payment Types** | Admin | Tag each station: UPI, Card, Cash, Wallet, etc. |
| **Photo Reviews** | Booking App | Users can attach a photo to their review |
| **Manual Review Moderation** | Admin Panel | Approve/Reject individual reviews from a centralized queue |
| **Auto-Approve Toggle** | Admin Panel | Per-station setting to auto-approve or manually moderate reviews |
| **Operator Role System** | Backend + Admin | Role below Admin to manage specific stations |
| **GPS-Verified Reviews** | Backend | Only confirmed booking users can write a review |
| **Live Rating Recalculation** | Backend | Station rating auto-updates on each review action |
| **Rating Sync Script** | Scripts | One-time fix to repair bad historical rating values |
| **Haversine Distance** | Backend | Real-world km calculation between user GPS and stations |
| **Nearby Station Search** | Backend + Map | Filter stations by radius from user location |

---

## 🔜 PHASE 3 — AI & Advanced Features
**April 18 – May 4, 2026**
- AI Trip Planner (Mappls + OpenWeatherMap + Range Engine with AC/temperature/terrain factors).
- Multi-stop charging plan builder.
- AI Chatbot (Hindi + English, Indian EV subsidy and range context).

## 🔜 PHASE 4 — Battery Exchange + Launch
**May 4 – May 18, 2026**
- Battery Exchange Bazaar MVP (List / Browse / Contact seller).
- Admin moderation queue for listings.
- Final public launch.

---

## 📦 Repository Structure

```
EVSaarthi/
├── backend/
│   ├── production/              ← Unified deployment backend
│   │   ├── index.js             ← Master entry point (all services merged)
│   │   ├── config/firebase.js   ← Environment-smart Firebase init
│   │   ├── routes/              ← auth, user, stations, booking, vehicle, admin
│   │   └── package.json         ← All dependencies in one file
│   ├── auth-service/            ← Local dev microservice
│   ├── user-service/
│   ├── station-service/         ← Includes operator middleware + slot generator
│   ├── booking-service/
│   ├── vehicle-service/
│   └── admin-service/
├── frontend/
│   ├── shell-app/               ← Root navigation app
│   ├── auth-app/                ← Login / Register
│   ├── dashboard-app/           ← Analytics + Green Points
│   ├── booking-app/             ← Slot booking + Post-booking Reviews
│   ├── map-app/                 ← Station Map with live markers
│   ├── profile-app/             ← User profile + Vehicle management
│   └── admin-app/               ← Full admin panel (stations, users, reviews, operators)
├── scripts/
│   └── build-all.js             ← Builds all 7 frontend apps for Vercel
├── vercel.json                  ← Vercel routing config
├── sync_ratings_script.js       ← One-time rating migration tool
├── DEVELOPMENT_LOG.md           ← This document
├── .gitlab-ci.yml               ← CI/CD pipeline
└── .gitignore
```

---

## 🔑 Environment Variables (Production)

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Render | Base64-encoded Firebase service account JSON |
| `RAZORPAY_KEY_ID` | Render | Razorpay payment gateway key |
| `RAZORPAY_KEY_SECRET` | Render | Razorpay payment gateway secret |
| `REACT_APP_API_URL` | Vercel | Render backend base URL |

---

*Document last updated: April 8, 2026*
