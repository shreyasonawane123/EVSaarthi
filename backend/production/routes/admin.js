// backend/production/routes/admin.js
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db, admin } = require("../config/firebase");
const { verifyToken } = require("./auth");
const { updateStationRating } = require("./stations");

// Simplified Admin Verification for production (one app, one logic)
const verifyAdmin = async (req, res, next) => {
  try {
    const adminDoc = await db.collection("adminUsers").doc(req.uid).get();
    if (!adminDoc.exists) return res.status(403).json({ error: "Access denied: Not an administrator" });
    const data = adminDoc.data();
    req.adminRole = data.role || "admin";
    next();
  } catch (error) {
    res.status(500).json({ error: "Failed to verify admin status" });
  }
};

router.get("/stations", async (req, res) => {
  try {
    const snapshot = await db.collection("stations").orderBy("createdAt", "desc").get();
    const stations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, stations });
  } catch (err) { res.status(500).json({ error: "Failed to fetch stations" }); }
});

router.post("/stations/add", verifyToken, verifyAdmin, async (req, res) => {
  const { name, address, city, state, connectorTypes, totalSlots, pricePerUnit, paymentMethods, autoApproveReviews } = req.body;
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const stationData = {
      name: name.trim(), address: address.trim(), city: city.trim(), state: state.trim(),
      connectorTypes, totalSlots: Number(totalSlots), availableSlots: Number(totalSlots),
      pricePerUnit: Number(pricePerUnit), paymentMethods: paymentMethods || ["UPI"],
      autoApproveReviews: Boolean(autoApproveReviews), rating: 0, isActive: true,
      lat: Number(req.body.lat) || 0, lng: Number(req.body.lng) || 0,
      createdAt: now, updatedAt: now,
    };
    const ref = await db.collection("stations").add(stationData);
    res.json({ success: true, stationId: ref.id });
  } catch (err) { res.status(500).json({ error: "Failed to add station" }); }
});

router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [u, s, v] = await Promise.all([db.collection("users").get(), db.collection("stations").get(), db.collection("vehicles").get()]);
    res.json({ success: true, stats: { totalUsers: u.size, totalStations: s.size, activeStations: s.docs.filter(d => d.data().isActive).length, totalVehicles: v.size } });
  } catch (err) { res.status(500).json({ error: "Failed to fetch stats" }); }
});

router.get("/reviews", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collectionGroup("reviews").get();
    const reviews = snapshot.docs.map(doc => ({ id: doc.id, stationId: doc.ref.parent.parent.id, ...doc.data() }));
    res.json({ success: true, reviews });
  } catch (err) { res.status(500).json({ error: "Failed to fetch reviews" }); }
});

router.patch("/reviews/:stationId/:reviewId", verifyToken, verifyAdmin, async (req, res) => {
  const { stationId, reviewId } = req.params; const { status } = req.body;
  try {
    await db.collection("stations").doc(stationId).collection("reviews").doc(reviewId).update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    await updateStationRating(stationId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to update review" }); }
});

module.exports = { router, verifyAdmin };
