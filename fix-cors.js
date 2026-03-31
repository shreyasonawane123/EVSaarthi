// fix-cors.js
// This script sets the CORS policy for your Firebase Storage bucket 
// so that local uploads (photos) work correctly.

const { Storage } = require('@google-cloud/storage');
const path = require('path');
const fs = require('fs');

// Path to your service account key (using the one from station-service)
const keyPath = path.join(__dirname, 'backend', 'station-service', 'serviceAccountKey.json');

if (!fs.existsSync(keyPath)) {
  console.error("❌ Error: serviceAccountKey.json not found at " + keyPath);
  process.exit(1);
}

const serviceAccount = require(keyPath);
const projectId = serviceAccount.project_id || 'ru-green-ev-bf229';

// Possible bucket names to try
const bucketNames = [
  `${projectId}.appspot.com`,
  `${projectId}.firebasestorage.app`,
  projectId
];

const storage = new Storage({
  projectId: projectId,
  keyFilename: keyPath
});

const corsConfiguration = [
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE", "HEAD"],
    "responseHeader": ["Content-Type", "Authorization", "x-goog-resumable"],
    "maxAgeSeconds": 3600
  }
];

async function setCors() {
  try {
    console.log(`🔍 Searching for your Firebase Storage buckets...`);
    const [buckets] = await storage.getBuckets();
    
    if (buckets.length === 0) {
      console.error("\n❌ Error: No buckets found! Your service account might lack the 'Storage Admin' role.");
      console.log("💡 Tip: Go to Firebase Console > Project Settings > Service Accounts and ensure your account has full access.");
      return;
    }

    console.log(`📁 Found ${buckets.length} bucket(s):`);
    buckets.forEach(b => console.log(`   - ${b.name}`));

    const targetBucket = buckets[0]; // Usually the default one
    console.log(`\n⏳ Setting CORS for: ${targetBucket.name}...`);
    
    await targetBucket.setCorsConfiguration(corsConfiguration);
    console.log(`✅ Success! CORS updated for ${targetBucket.name}.`);
    console.log("🚀 You can now upload photos from your local browser.");

  } catch (error) {
    console.error("\n❌ Critical Failure:", error.message);
    console.log("\n💡 Help: This usually means the service account in 'backend/station-service/serviceAccountKey.json' doesn't have 'Storage Admin' permissions.");
  }
}

setCors();
// Remove any stray calls below
