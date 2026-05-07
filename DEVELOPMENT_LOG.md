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
| **Hosting (Backend)** | Firebase | Unified service (Cloud Run/Functions) |
| **Hosting (Frontend)** | Firebase | Firebase Hosting (Unified) |

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
- Consolidated all 7 microservices into a single Express app in `backend/production/` for easier and cheaper hosting.
- Centralized Firebase config that supports both local file key and production environment variables.
- All routes prefixed under `/api/` for clean, unified access.

**Frontend Deployment:**
- All 7 React apps built and hosted under one Firebase project using subfolder routing (`/admin`, `/booking`, `/auth`, etc.).
- `scripts/build-all.js` — Master build script that builds all 7 apps in sequence.
- `firebase.json` — Smart traffic router that serves the correct app for each URL path, without interfering with static assets.

**Live URLs:**
- 🟢 **Backend API:** `https://ru-green-ev-bf229.web.app/api`
- 🟢 **Frontend:** `https://ru-green-ev-bf229.web.app`

**Key Files:**
- `backend/production/index.js` — Unified master backend
- `backend/station-service/middleware/verifyOperator.js` — Operator auth middleware
- `backend/station-service/routes/operators.js` — Operator management routes
- `frontend/admin-app/src/pages/OperatorsPage.js` — Admin operator management UI
- `scripts/build-all.js` — Automates building all 7 frontend apps
- `firebase.json` — Firebase routing configuration

---

## ✅ PHASE 5 — Enhanced Governance & Gamification
**April 19 – May 7, 2026 (3 Weeks)**

### Week 8 — Apr 19–25: Tenant Management System
**What we built:**
- **Tenant Entity**: Introduced a "Tenant" level to the architecture, allowing charging stations to be grouped by owner/company.
- **Tenants Page**: A dedicated superadmin dashboard for creating and managing tenants.
- **Contact Details**: Added fields for `contactPhone`, `contactPerson`, and `contactEmail` for every tenant.
- **Green Points Toggle**: A global switch per tenant to enable/disable point earning at their stations (governance control).
- **Decoupled Auth**: Removed mandatory password requirement on tenant creation to improve security.

**Key Files:**
- `frontend/admin-app/src/pages/TenantsPage.js` — Organization management UI
- `backend/admin-service/routes/tenants.js` — Tenant CRUD logic
- `DATABASE_CHANGES_README.md` — Detailed schema documentation

---

### Week 9 — Apr 26–May 3: Referral Program & Tiers
**What we built:**
- **Referral Code System**: Auto-generation of unique referral codes for every user (e.g., `REF123`).
- **Lazy Backfilling**: Existing users automatically get a code assigned the next time they view their balance.
- **Referral Bonus**: 200 points awarded to the referrer when a new user validates their code.
- **User Tiers**: Multi-level rewards system (Bronze, Silver, Gold, Platinum, Diamond) based on **Lifetime Points**.
- **Points Ledger Expiry**: Implemented `expiresAt` logic in the ledger for points expiration tracking.

**Key Files:**
- `backend/points-service/utils/referralGenerator.js` — Unique code engine
- `backend/points-service/utils/tierCalculator.js` — Rank logic based on total activity
- `backend/points-service/routes/referral.js` — Validation and bonus logic

---

### Week 10 — May 4–7: Load More Pagination & Optimization
**What we built:**
- **In-Memory Sorting**: Updated points history to use in-memory sorting, avoiding the need for expensive Firebase composite indexes.
- **Load More Button**: Replaced traditional pagination with "Load More" for a smoother mobile experience in History and Tenants pages.
- **Performance Fixes**: Reduced redundant Firestore reads in the `points-service` by optimizing transaction order.

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
| **Tenant Role System** | Backend + Admin | High-level organization management for superadmins |
| **Referral Program** | Points Service | Users earn points by inviting others via unique codes |
| **Tiered Rewards** | Points Service | Users ranked from Bronze to Diamond based on lifetime activity |
| **GPS-Verified Reviews** | Backend | Only confirmed booking users can write a review |
| **Live Rating Recalculation** | Backend | Station rating auto-updates on each review action |
| **Rating Sync Script** | Scripts | One-time fix to repair bad historical rating values |
| **Haversine Distance** | Backend | Real-world km calculation between user GPS and stations |
| **Nearby Station Search** | Backend + Map | Filter stations by radius from user location |

---

## 🔜 PHASE 6 — AI & Launch
**May 2026**
- AI Trip Planner (Mappls + OpenWeatherMap).
- Multi-stop charging plan builder.
- Battery Exchange Bazaar launch.

---

## 📦 Repository Structure

```
EVSaarthi/
├── backend/
│   ├── production/              ← Unified deployment backend
│   ├── auth-service/
│   ├── user-service/
│   ├── station-service/         ← Includes operator middleware + slot generator
│   ├── booking-service/
│   ├── points-service/          ← Includes referral & tier logic
│   ├── admin-service/           ← Includes tenant management
│   └── vehicle-service/
├── frontend/
│   ├── shell-app/               ← Root navigation app
│   ├── auth-app/
│   ├── dashboard-app/           ← Analytics + Tier display
│   ├── booking-app/             ← Slot booking + Post-booking Reviews
│   ├── map-app/                 ← Station Map with live markers
│   ├── profile-app/
│   └── admin-app/               ← Full admin panel (stations, users, reviews, tenants)
├── scripts/
│   └── build-all.js             ← Builds all 7 frontend apps
├── firebase.json                ← Firebase routing config
├── sync_ratings_script.js       ← One-time rating migration tool
├── DEVELOPMENT_LOG.md           ← This document
```

---

## 🔑 Environment Variables (Production)

| Variable | Where | Description |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Firebase | Secret managed via Cloud Secrets |
| `RAZORPAY_KEY_ID` | Firebase | Secret managed via Cloud Secrets |
| `RAZORPAY_KEY_SECRET` | Firebase | Secret managed via Cloud Secrets |
| `REACT_APP_API_URL` | Firebase | Self-referencing Hosting URL |
| `INTERNAL_SECRET` | Firebase | Secret managed via Cloud Secrets |

---

*Document last updated: May 7, 2026*
