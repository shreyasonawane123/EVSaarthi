// backend/user-service/routes/user.js
// User profile routes — GET /api/user/profile, POST /api/user/profile
// Migrated from evsaarthi-backend/routes/user.js

require("dotenv").config();
const express = require("express");
const fs = require("fs");
const axios = require("axios");
const router = express.Router();
const { db } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// GET /api/user/profile
// Returns user profile from Firestore users/{uid}
router.get("/profile", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json({ success: true, profile: userDoc.data() });
  } catch (error) {
    fs.appendFileSync('error.log', new Date().toISOString() + ' GET /profile error: ' + error.message + '\n');
    console.error("[user-service] Get profile error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// POST /api/user/profile
// Creates or updates user profile in Firestore users/{uid}
router.post("/profile", verifyToken, async (req, res) => {
  const { name, city, electricityTariff, email, photoURL } = req.body;

  try {
    const userRef = db.collection("users").doc(req.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // New user — create full profile
      const { referralCode } = req.body;
      await userRef.set({
        uid: req.uid,
        email: email || req.email || "",
        name: name || "",
        photoURL: photoURL || "",
        city: city || "",
        electricityTariff: electricityTariff || 7,
        totalPoints: 0,
        lifetimePoints: 0,
        tier: "bronze",
        referralCode: null,
        co2Saved: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Fire-and-forget: onboarding bonus
      axios.post(
        `${process.env.POINTS_SERVICE_URL}/api/points/award`,
        {
          userId: req.uid,
          reason: "onboarding",
          points: 100,
          referenceId: null,
          checkDuplicate: true,
          duplicateKey: `onboarding_${req.uid}`,
        },
        { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
      ).catch((err) => console.error("[user-service] Onboarding points failed:", err.message));

      // Fire-and-forget: generate referral code
      axios.post(
        `${process.env.POINTS_SERVICE_URL}/api/points/referral/generate`,
        { userId: req.uid },
        { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
      ).catch((err) => console.error("[user-service] Referral generation failed:", err.message));

      // Handle referral code if provided during signup
      if (referralCode && referralCode.trim()) {
        axios.post(
          `${process.env.POINTS_SERVICE_URL}/api/points/referral/validate`,
          { referralCode: referralCode.trim().toUpperCase(), newUserId: req.uid },
          { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
        ).catch((err) => console.error("[user-service] Referral validation failed:", err.message));
      }
    } else {
      // Existing user — update only provided fields
      const updates = { updatedAt: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (city !== undefined) updates.city = city;
      if (electricityTariff !== undefined) updates.electricityTariff = electricityTariff;
      if (photoURL !== undefined) updates.photoURL = photoURL;
      await userRef.update(updates);
    }

    res.json({ success: true, message: "Profile saved successfully" });
  } catch (error) {
    fs.appendFileSync('error.log', new Date().toISOString() + ' POST /profile error: ' + error.message + '\n' + error.stack + '\n');
    console.error("[user-service] Save profile error:", error);
    res.status(500).json({ error: "Failed to save profile", details: error.message });
  }
});

// GET /api/user/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "user-service", port: process.env.PORT || 5002 });
});

module.exports = router;
