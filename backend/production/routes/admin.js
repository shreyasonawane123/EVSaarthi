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

// ─── ADMIN USERS LISTING ─────────────────────────────────────────────
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─── ADMIN TEAM MANAGEMENT ───────────────────────────────────────────
router.get("/team", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("adminUsers").get();
    const admins = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    res.json({ success: true, admins });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

router.post("/team/add", verifyToken, verifyAdmin, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    // 1. Find user in the main users collection
    const snapshot = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: "User not found. They must sign in once first." });
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // 2. Add to adminUsers
    await db.collection("adminUsers").doc(userDoc.id).set({
      name: userData.name || "Admin",
      email: userData.email,
      role: "admin",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Admin added", admin: { name: userData.name, email: userData.email } });
  } catch (err) {
    res.status(500).json({ error: "Failed to add admin" });
  }
});

router.delete("/team/:uid", verifyToken, verifyAdmin, async (req, res) => {
  try {
    await db.collection("adminUsers").doc(req.params.uid).delete();
    res.json({ success: true, message: "Admin removed" });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove admin" });
  }
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
