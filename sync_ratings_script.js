// scripts/syncRatings.js
const admin = require("firebase-admin");
const serviceAccount = require("C:/Users/Admin/Downloads/ru-green-ev/ru-green-ev/backend/station-service/config/serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function syncAllRatings() {
  console.log("🚀 Starting global rating sync...");
  const stationsSnapshot = await db.collection("stations").get();
  
  for (const stationDoc of stationsSnapshot.docs) {
    const stationId = stationDoc.id;
    const reviewsSnapshot = await db.collection("stations").doc(stationId).collection("reviews")
      .where("status", "in", ["approved", "pending"])
      .get();

    let totalRating = 0;
    let count = reviewsSnapshot.size;

    if (count === 0) {
      await db.collection("stations").doc(stationId).update({ rating: 0 });
      console.log(`- ${stationDoc.data().name}: 0 ratings`);
      continue;
    }

    reviewsSnapshot.forEach(doc => {
      totalRating += (doc.data().rating || 0);
    });

    const averageRating = Number((totalRating / count).toFixed(1));
    await db.collection("stations").doc(stationId).update({ rating: averageRating });
    console.log(`✅ ${stationDoc.data().name}: ${averageRating} stars (${count} reviews)`);
  }
  console.log("⭐ Done! All stations synced.");
  process.exit(0);
}

syncAllRatings().catch(err => {
  console.error(err);
  process.exit(1);
});
