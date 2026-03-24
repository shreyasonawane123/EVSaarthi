// backend/station-service/routes/stations.js
const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");

// Haversine formula
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /api/stations/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "station-service", timestamp: new Date().toISOString() });
});

// GET /api/stations/all
// Returns ONLY isActive = true stations
router.get("/all", async (req, res) => {
  try {
    const snapshot = await db
      .collection("stations")
      .where("isActive", "==", true)
      .get();

    const stations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || null,
    }));

    res.json({ success: true, stations });
  } catch (error) {
    console.error("[station-service] Get all stations error:", error.message);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// GET /api/stations/nearby
// Queries nearby stations based on lat/lng and radiusKm
router.get("/nearby", async (req, res) => {
  const { lat, lng, radiusKm } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radius = parseFloat(radiusKm) || 10;

  try {
    const snapshot = await db
      .collection("stations")
      .where("isActive", "==", true)
      .get();

    let stations = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lat && data.lng) {
        const distance = getDistanceKm(userLat, userLng, data.lat, data.lng);
        if (distance <= radius) {
          stations.push({
            id: doc.id,
            ...data,
            distance: Number(distance.toFixed(2)),
            createdAt: data.createdAt?.toDate?.().toISOString() || null,
            updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
          });
        }
      }
    });

    // Sort by distance ascending
    stations.sort((a, b) => a.distance - b.distance);

    res.json({ success: true, stations });
  } catch (error) {
    console.error("[station-service] Get nearby stations error:", error.message);
    res.status(500).json({ error: "Failed to fetch nearby stations" });
  }
});

// GET /api/stations/:id
router.get("/:id", async (req, res) => {
  try {
    const doc = await db.collection("stations").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Station not found" });
    }
    const data = doc.data();
    res.json({
      success: true,
      station: {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[station-service] Get single station error:", error.message);
    res.status(500).json({ error: "Failed to fetch station" });
  }
});

module.exports = router;
