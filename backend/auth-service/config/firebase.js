// backend/auth-service/config/firebase.js
// Firebase Admin SDK — same credentials as original backend

const admin = require("firebase-admin");
const path = require("path");

// Path to serviceAccountKey.json in THIS service's root folder
const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");

if (!admin.apps.length) {
  let credential;
  try {
    const serviceAccount = require(serviceAccountPath);
    credential = admin.credential.cert(serviceAccount);
  } catch (err) {
    console.error(
      "❌ serviceAccountKey.json not found in auth-service/\n" +
      "   Copy it from evsaarthi-backend/serviceAccountKey.json"
    );
    process.exit(1);
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID || "ru-green-ev-bf229",
  });
}

const db = admin.firestore();
const adminAuth = admin.auth();

module.exports = { admin, db, adminAuth };
