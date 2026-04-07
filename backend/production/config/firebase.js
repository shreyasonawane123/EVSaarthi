// backend/production/config/firebase.js
// Centralized Firebase Admin SDK for all production routes

const admin = require("firebase-admin");
const path = require("path");

// In production on Render/Railway, we use environment variables for keys to avoid committing secrets
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!admin.apps.length) {
    if (serviceAccountKey) {
        // Option A: Use Base64 encoded JSON string from environment variable (Secure)
        // Clean the string to remove any unexpected whitespace/newlines from copy-paste
        const cleanKey = serviceAccountKey.replace(/\s/g, '');
        const buff = Buffer.from(cleanKey, 'base64');
        const serviceAccount = JSON.parse(buff.toString('utf-8'));
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id
        });
        console.log("✅ Initialized Firebase via Base64 Service Account Key.");
    } else {
        // Option B: Fallback to local file (for local testing only)
        try {
            const serviceAccount = require("../serviceAccountKey.json");
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id
            });
            console.log("✅ Initialized Firebase via local serviceAccountKey.json.");
        } catch (err) {
            console.error("❌ ERROR: No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT_KEY or add serviceAccountKey.json.");
            // process.exit(1); 
        }
    }
}

const db = admin.firestore();
const adminAuth = admin.auth();

module.exports = { admin, db, adminAuth };
