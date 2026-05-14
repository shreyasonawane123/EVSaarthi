// backend/user-service/config/firebase.js
// Firebase Admin SDK — same credentials as original backend

const admin = require("firebase-admin");

if (!admin.apps.length) {
  let serviceAccount;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // Production (Render): read credentials from environment variable
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  } else {
    // Local development: fallback to serviceAccountKey.json file on disk
    serviceAccount = require("../serviceAccountKey.json");
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || "ru-green-ev-bf229",
  });
}

const db = admin.firestore();
const adminAuth = admin.auth();

module.exports = { admin, db, adminAuth };
