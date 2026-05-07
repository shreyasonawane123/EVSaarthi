const admin = require("firebase-admin");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../backend/admin-service/.env") });

const serviceAccountPath = path.join(__dirname, "../backend/admin-service/serviceAccountKey.json");

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  console.error("❌ serviceAccountKey.json not found. Please ensure it exists in backend/admin-service/");
  process.exit(1);
}

const db = admin.firestore();

async function listAdmins() {
  console.log("--- Registered Admins (adminUsers collection) ---");
  const snapshot = await db.collection("adminUsers").get();
  if (snapshot.empty) {
    console.log("No admins found in database.");
  } else {
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- Name: ${data.name} | Email: ${data.email} | Role: ${data.role}`);
    });
  }
  process.exit(0);
}

listAdmins();
