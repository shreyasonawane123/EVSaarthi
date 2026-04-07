// backend/production/routes/stations.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const { verifyToken } = require("./auth");
const { generateSlotsForStation } = require("../utils/slotGenerator");

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function updateStationRating(stationId) {
  try {
    const reviewsSnapshot = await db.collection("stations").doc(stationId).collection("reviews")
      .where("status", "in", ["approved", "pending"]).get();
    let totalRating = 0; let count = reviewsSnapshot.size;
    if (count === 0) { await db.collection("stations").doc(stationId).update({ rating: 0 }); return; }
    reviewsSnapshot.forEach(doc => { totalRating += (doc.data().rating || 0); });
    const averageRating = Number((totalRating / count).toFixed(1));
    await db.collection("stations").doc(stationId).update({ rating: averageRating });
  } catch (err) { console.error(`[Rating Update Error]:`, err.message); }
}

router.get("/all", async (req, res) => {
  try {
    const snapshot = await db.collection("stations").where("isActive", "==", true).get();
    const stations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, stations });
  } catch (err) { res.status(500).json({ error: "Failed to fetch stations" }); }
});

router.get("/nearby", async (req, res) => {
  const { lat, lng, radiusKm } = req.query; if (!lat || !lng) return res.status(400).json({ error: "lat and lng are required" });
  try {
    const snapshot = await db.collection("stations").where("isActive", "==", true).get();
    let stations = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const distance = getDistanceKm(parseFloat(lat), parseFloat(lng), data.lat, data.lng);
      if (distance <= (parseFloat(radiusKm) || 10)) stations.push({ id: doc.id, ...data, distance: Number(distance.toFixed(2)) });
    });
    res.json({ success: true, stations: stations.sort((a,b) => a.distance - b.distance) });
  } catch (err) { res.status(500).json({ error: "Failed to fetch nearby stations" }); }
});

router.get("/:id/reviews", async (req, res) => {
  try {
    const reviewsSnapshot = await db.collection("stations").doc(req.params.id).collection("reviews").where("status", "==", "approved").get();
    const reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ error: "Failed to fetch reviews" }); }
});

router.post("/:id/reviews", verifyToken, async (req, res) => {
  const { rating, text, photoUrl, userLat, userLng } = req.body;
  const stationId = req.params.id;
  try {
    const stationRef = db.collection("stations").doc(stationId);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) return res.status(404).json({ error: "Station not found" });
    const autoApprove = stationDoc.data().autoApproveReviews || false;
    const reviewData = {
      userId: req.uid, userName: req.email?.split('@')[0] || "User",
      rating: Number(rating), text, photoUrl: photoUrl || null,
      status: autoApprove ? "approved" : "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await stationRef.collection("reviews").doc(req.uid).set(reviewData, { merge: true });
    await updateStationRating(stationId);
    res.json({ success: true, message: autoApprove ? "Review posted" : "Review submitted for moderation" });
  } catch (err) { res.status(500).json({ error: "Failed to submit review" }); }
});

router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("stations").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Station not found" });
    res.json({ success: true, station: { id: doc.id, ...doc.data() } });
  } catch (err) { res.status(500).json({ error: "Failed to fetch station" }); }
});

router.put("/:id/schedule", verifyToken, async (req, res) => {
  const { schedule } = req.body;
  try {
    const batch = db.batch();
    for (const [day, data] of Object.entries(schedule)) {
      batch.set(db.collection("stations").doc(req.params.id).collection("schedule").doc(day), { ...data, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
    await batch.commit();
    generateSlotsForStation(req.params.id).catch(err => console.error("[Production] Slot generation failed:", err.message));
    res.json({ success: true, message: "Schedule updated" });
  } catch (err) { res.status(500).json({ error: "Failed to update schedule" }); }
});

router.get("/:id/slots", async (req, res) => {
  const { date } = req.query; if (!date) return res.status(400).json({ error: "Date parameter is required" });
  try {
    const slotsSnapshot = await db.collection("stations").doc(req.params.id).collection("slots").where("date", "==", date).where("status", "==", "available").get();
    let slots = []; slotsSnapshot.forEach(doc => { slots.push(doc.data().time); });
    res.json({ success: true, slots: slots.sort() });
  } catch (err) { res.status(500).json({ error: "Failed to fetch slots" }); }
});

module.exports = { router, updateStationRating };
