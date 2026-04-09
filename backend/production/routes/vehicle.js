// backend/production/routes/vehicle.js
const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { verifyToken } = require("./auth");

router.post("/save", verifyToken, async (req, res) => {
  const { vehicleBrand, vehicleModel, batteryCapacity, connectorType, registrationNumber, purchaseYear } = req.body;
  try {
    const vehicleRef = db.collection("vehicles").doc(req.uid);
    const vehicleDoc = await vehicleRef.get();
    const now = new Date().toISOString();
    if (!vehicleDoc.exists) {
      await vehicleRef.set({
        uid: req.uid, vehicleBrand: vehicleBrand || "", vehicleModel: vehicleModel || "",
        batteryCapacity: batteryCapacity !== undefined ? Number(batteryCapacity) : null,
        connectorType: connectorType || "", registrationNumber: registrationNumber || "",
        purchaseYear: purchaseYear !== undefined && purchaseYear !== "" ? Number(purchaseYear) : null,
        createdAt: now, updatedAt: now,
      });
    } else {
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
  } catch (err) { res.status(500).json({ error: "Failed to save vehicle" }); }
});

router.get("/me", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("vehicles").doc(req.uid).get();
    res.json({ success: true, vehicle: doc.exists ? doc.data() : null });
  } catch (err) { res.status(500).json({ error: "Failed to fetch vehicle" }); }
});

module.exports = { router };
