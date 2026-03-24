// backend/vehicle-service/routes/vehicle.js
// Vehicle profile routes — POST /api/vehicle/save, GET /api/vehicle/me
// Owns the vehicles/ Firestore collection (separate from users/)

const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// POST /api/vehicle/save
// Creates or updates vehicle profile in Firestore vehicles/{uid}
router.post("/save", verifyToken, async (req, res) => {
  const {
    vehicleBrand,
    vehicleModel,
    batteryCapacity,
    connectorType,
    registrationNumber,
    purchaseYear,
  } = req.body;

  try {
    const vehicleRef = db.collection("vehicles").doc(req.uid);
    const vehicleDoc = await vehicleRef.get();

    const now = new Date().toISOString();

    if (!vehicleDoc.exists) {
      // New vehicle entry — create with all fields
      await vehicleRef.set({
        uid: req.uid,
        vehicleBrand: vehicleBrand || "",
        vehicleModel: vehicleModel || "",
        batteryCapacity: batteryCapacity !== undefined ? Number(batteryCapacity) : null,
        connectorType: connectorType || "",
        registrationNumber: registrationNumber || "",
        purchaseYear: purchaseYear !== undefined && purchaseYear !== "" ? Number(purchaseYear) : null,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Existing entry — merge/update only provided fields
      const updates = { updatedAt: now };
      if (vehicleBrand !== undefined) updates.vehicleBrand = vehicleBrand;
      if (vehicleModel !== undefined) updates.vehicleModel = vehicleModel;
      if (batteryCapacity !== undefined) updates.batteryCapacity = Number(batteryCapacity);
      if (connectorType !== undefined) updates.connectorType = connectorType;
      if (registrationNumber !== undefined) updates.registrationNumber = registrationNumber;
      if (purchaseYear !== undefined && purchaseYear !== "") updates.purchaseYear = Number(purchaseYear);
      await vehicleRef.update(updates);
    }

    res.json({ success: true, message: "Vehicle saved successfully" });
  } catch (error) {
    console.error("[vehicle-service] Save vehicle error:", error.message);
    res.status(500).json({ error: "Failed to save vehicle", details: error.message });
  }
});

// GET /api/vehicle/me
// Returns the authenticated user's vehicle document from vehicles/{uid}
router.get("/me", verifyToken, async (req, res) => {
  try {
    const vehicleDoc = await db.collection("vehicles").doc(req.uid).get();

    if (!vehicleDoc.exists) {
      return res.json({ success: true, vehicle: null });
    }

    res.json({ success: true, vehicle: vehicleDoc.data() });
  } catch (error) {
    console.error("[vehicle-service] Get vehicle error:", error.message);
    res.status(500).json({ error: "Failed to fetch vehicle" });
  }
});

// GET /health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "vehicle-service", port: process.env.PORT || 5007 });
});

module.exports = router;
