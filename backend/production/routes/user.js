// backend/production/routes/user.js
const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken } = require("./auth"); // Import from common auth

router.get("/profile", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }
    res.json({ success: true, profile: userDoc.data() });
  } catch (error) {
    console.error("[user-service] Get profile error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/profile", verifyToken, async (req, res) => {
  const { name, city, electricityTariff, email, photoURL } = req.body;
  try {
    const userRef = db.collection("users").doc(req.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      await userRef.set({
        uid: req.uid,
        email: email || req.email || "",
        name: name || "",
        photoURL: photoURL || "",
        city: city || "",
        electricityTariff: electricityTariff || 7,
        totalPoints: 0,
        co2Saved: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const updates = { updatedAt: new Date().toISOString() };
      if (name !== undefined) updates.name = name;
      if (city !== undefined) updates.city = city;
      if (electricityTariff !== undefined) updates.electricityTariff = electricityTariff;
      if (photoURL !== undefined) updates.photoURL = photoURL;
      await userRef.update(updates);
    }
    res.json({ success: true, message: "Profile saved successfully" });
  } catch (error) {
    console.error("[user-service] Save profile error:", error);
    res.status(500).json({ error: "Failed to save profile", details: error.message });
  }
});

module.exports = { router };
