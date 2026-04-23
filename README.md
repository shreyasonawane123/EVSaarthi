# EV Saarthi ⚡
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

**EV Saarthi** is India's smartest EV charging companion, built to transform the charging experience through gamification, rewards (Green Points), and actionable insights. It uses a modern **Microservices + Microfrontend** architecture for maximum scalability and independent deployment.

---

## 🏗️ Architecture Overview

The project is split into two main layers:

### 1. Backend Microservices (Node.js/Express)
*   **`api-gateway` (Port 5000)**: The central entry point. Routes all frontend traffic to internal services.
*   **`auth-service` (Port 5001)**: Handles Firebase session validation and staff authentication.
*   **`user-service` (Port 5002)**: Manages user profiles, preferences, and CO2 savings logic.
*   **`station-service` (Port 5003)**: Core logic for EV charging stations, status tracking, and reviews.
*   **`booking-service` (Port 5004)**: Handles real-time slot bookings and scheduling.
*   **`points-service` (Port 5005)**: The reward engine. Manages "Green Points" ledger, referrals, and rewards redemption.
*   **`admin-service` (Port 5006)**: Multi-tenant administrative controls for Superadmins and Tenant Admins.

### 2. Frontend Microfrontends (React)
*   **`shell-app` (Port 3000)**: The main consumer-facing portal. Handles routing and global state.
*   **`admin-app` (Port 3007)**: The administrative dashboard for managing stations, reviews, and tenants.
*   **`map-app`**: Dedicated mapping module for station discovery.
*   **`booking-app`**: Specialized module for the reservation flow.

---

## 🎁 Referral Code System
EV Saarthi features a built-in referral system to grow the green community:
- **New Users**: Receive **100 Green Points** instantly upon joining.
- **Referrers**: Receive **200 Green Points** for every friend who joins using their unique code.
- **Onboarding**: A dedicated referral modal captures codes during the first-time sign-up process.

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v16 or higher)
- **Firebase Project**: Setup Firestore, Authentication, and Hosting.

### 1. Backend Setup
Install dependencies for all services:
```bash
# Example for one service (repeat for all in /backend)
cd backend/api-gateway && npm install
```

**⚠️ IMPORTANT: Firebase Credentials**
You MUST place your `serviceAccountKey.json` in the root of the following folders (not included in Git):
1. `backend/auth-service/`
2. `backend/user-service/`
3. `backend/points-service/`

### 2. Frontend Setup
```bash
# Example for shell-app
cd frontend/shell-app && npm install
```

### 3. Environment Variables
Create a `.env` file in `frontend/shell-app/` and `frontend/admin-app/`:
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_ADMIN_URL=http://localhost:3007
```

---

## 🛠️ Running the Project

### One-Click Start (Recommended)
If you are on Windows, simply run:
```powershell
.\start-all.bat
```
This script will automatically open multiple terminals and launch the Gateway, Auth, User, Points, and all major frontend apps.

### Manual Start
Start the Gateway first, followed by services, then the Shell App:
```bash
# Start Gateway
cd backend/api-gateway && npm start

# Start Shell App
cd frontend/shell-app && npm start
```

---

## 🛡️ Security & RBAC
- **User Side**: Secured via Firebase Google OAuth.
- **Admin Side**: Features a standalone **Staff Portal** for Email/Password login.
- **Multi-Tenancy**: Tenant Admins can only see and manage their own stations and reviews. Superadmins have global oversight.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

*EV Saarthi — Driving India towards a Greener Tomorrow.* 🌿⚡
