# EV Saarthi ⚡

A smart EV charging assistant focused on gamification, rewards, and actionable insights.
Built as a Microservices + Microfrontend architecture.

## Installation 📦

To run this project, you will need Node.js installed.
First, clone the repository, then install dependencies for all services:

1. **Install backend dependencies:**
   ```bash
   cd backend/api-gateway && npm install
   cd ../auth-service && npm install
   cd ../user-service && npm install
   ```
2. **Install frontend dependencies:**
   ```bash
   cd frontend/shell-app && npm install
   cd ../auth-app && npm install
   cd ../dashboard-app && npm install
   cd ../profile-app && npm install
   ```

### ⚠️ IMPORTANT: Firebase Credentials

The backend microservices require the Firebase Admin SDK credentials to run. **This is not attached to git for security reasons.**
You MUST place a valid `serviceAccountKey.json` from the Firebase Console (Project Settings > Service Accounts) in the root of **both** these folders:
1. `backend/auth-service/serviceAccountKey.json`
2. `backend/user-service/serviceAccountKey.json`

Without this, the servers will crash on boot.

## Running the Application 🚀

### Option 1: One-Click Start (Windows)
Double-click the `start-all.bat` script in the root directory. This will open 4 separate terminals to run all 3 backend services and the main frontend shell app.

### Option 2: Manual Start (Any OS)
You will need to run the following commands in 4 separate terminal windows/tabs:

1. **API Gateway (Port 5000):**
   ```bash
   cd backend/api-gateway
   npm start
   ```
2. **Auth Service (Port 5001):**
   ```bash
   cd backend/auth-service
   npm start
   ```
3. **User Service (Port 5002):**
   ```bash
   cd backend/user-service
   npm start
   ```
4. **Main Frontend App (Port 3000):**
   ```bash
   cd frontend/shell-app
   npm start
   ```

The application will be accessible at `http://localhost:3000`.

## Architecture 🏗️

- **`backend/api-gateway/`**: Proxies requests from frontend to correct backend service.
- **`backend/auth-service/`**: Validates Firebase auth tokens.
- **`backend/user-service/`**: Gets & updates user profile records in Firestore.
- **`frontend/shell-app/`**: The main user-facing React application that routes between views.
- **`frontend/*-app/`**: Standalone microfrontend projects that can be run independently for isolated development.
