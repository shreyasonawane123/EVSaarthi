// backend/station-service/routes/stations.js
require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyOperator = require("../middleware/verifyOperator");
const { generateSlotsForStation } = require("../utils/slotGenerator");

// ─────────────────────────────────────────────────────────────────────────────
// IN-MEMORY CACHE (station list only — does NOT affect booking/admin routes)
// ─────────────────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const stationsCache = {
  all: { data: null, fetchedAt: 0 },
  nearby: new Map(), // key = "lat,lng,radiusKm"
};

function isCacheFresh(fetchedAt) {
  return (Date.now() - fetchedAt) < CACHE_TTL_MS;
}

/** Call this whenever a station is mutated so caches are invalidated immediately. */
function invalidateStationsCache() {
  stationsCache.all.data = null;
  stationsCache.all.fetchedAt = 0;
  stationsCache.nearby.clear();
  console.log("[station-service] Station cache invalidated.");
}

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

/** Recalculate average rating for a station (includes pending & approved) */
async function updateStationRating(stationId) {
  try {
    const reviewsSnapshot = await db.collection("stations").doc(stationId).collection("reviews")
      .where("status", "in", ["approved", "pending"])
      .get();

    let totalRating = 0;
    let count = reviewsSnapshot.size;

    if (count === 0) {
      await db.collection("stations").doc(stationId).update({ rating: 0 });
      return;
    }

    reviewsSnapshot.forEach(doc => {
      totalRating += (doc.data().rating || 0);
    });

    const rawAverage = totalRating / count;
    // Round to nearest 0.5 (e.g., 3.7 → 3.5, 4.3 → 4.5)
    const averageRating = Math.round(rawAverage * 2) / 2;
    await db.collection("stations").doc(stationId).update({ rating: averageRating });
    console.log(`[station-service] Updated station ${stationId} rating to ${averageRating}`);
  } catch (error) {
    console.error(`[station-service] Failed to update rating for station ${stationId}:`, error.message);
  }
}

// GET /api/stations/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "station-service", timestamp: new Date().toISOString() });
});

// GET /api/stations/all
// Returns ONLY isActive = true stations (with server-side in-memory cache)
router.get("/all", async (req, res) => {
  // Serve from cache if still fresh
  if (stationsCache.all.data && isCacheFresh(stationsCache.all.fetchedAt)) {
    console.log("[station-service] /all served from cache.");
    return res.json({ success: true, stations: stationsCache.all.data, cached: true });
  }

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

    // Store in cache
    stationsCache.all.data = stations;
    stationsCache.all.fetchedAt = Date.now();
    console.log(`[station-service] /all fetched from Firestore and cached (${stations.length} stations).`);

    res.json({ success: true, stations });
  } catch (error) {
    console.error("[station-service] Get all stations error:", error.message);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// GET /api/stations/nearby
// Queries nearby stations based on lat/lng and radiusKm (with server-side in-memory cache)
router.get("/nearby", async (req, res) => {
  const { lat, lng, radiusKm } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const userLat = parseFloat(lat);
  const userLng = parseFloat(lng);
  const radius = parseFloat(radiusKm) || 10;

  // Round coordinates to 2 decimal places for a coarse cache key (~1 km precision)
  const cacheKey = `${userLat.toFixed(2)},${userLng.toFixed(2)},${radius}`;
  const cached = stationsCache.nearby.get(cacheKey);

  if (cached && isCacheFresh(cached.fetchedAt)) {
    console.log(`[station-service] /nearby served from cache (key: ${cacheKey}).`);
    return res.json({ success: true, stations: cached.data, cached: true });
  }

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

    // Store in nearby cache
    stationsCache.nearby.set(cacheKey, { data: stations, fetchedAt: Date.now() });
    console.log(`[station-service] /nearby fetched from Firestore and cached (${stations.length} stations, key: ${cacheKey}).`);

    res.json({ success: true, stations });
  } catch (error) {
    console.error("[station-service] Get nearby stations error:", error.message);
    res.status(500).json({ error: "Failed to fetch nearby stations" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stations/:id/reviews
// Returns approved reviews for a station
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/reviews", async (req, res) => {
  try {
    const reviewsSnapshot = await db
      .collection("stations")
      .doc(req.params.id)
      .collection("reviews")
      .where("status", "==", "approved")
      .get();

    const reviews = reviewsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.().toISOString() || null,
    }));

    res.json({ success: true, reviews });
  } catch (error) {
    console.error("[station-service] Get reviews error:", error.message);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stations/:id/reviews
// Submits a new review — requires a completed booking (one review per booking)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/reviews", verifyToken, async (req, res) => {
  const { rating, text, photoUrl, userLat, userLng, bookingId } = req.body;
  const stationId = req.params.id;

  if (!rating || !text) {
    return res.status(400).json({ error: "Rating and text are required" });
  }
  if (!bookingId) {
    return res.status(400).json({ error: "A completed booking is required to submit a review" });
  }

  try {
    const stationRef = db.collection("stations").doc(stationId);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) return res.status(404).json({ error: "Station not found" });

    // Verify booking: must belong to this user, this station, and be confirmed
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(400).json({ error: "Booking not found" });
    }
    const booking = bookingDoc.data();
    if (booking.userId !== req.uid) {
      return res.status(403).json({ error: "This booking does not belong to you" });
    }
    if (booking.stationId !== stationId) {
      return res.status(400).json({ error: "Booking does not match this station" });
    }
    if (booking.status !== "confirmed") {
      return res.status(400).json({ error: "Only confirmed (completed) bookings can be reviewed" });
    }
    // Check if already reviewed
    if (booking.reviewSubmitted) {
      return res.status(400).json({ error: "You have already submitted a review for this booking" });
    }

    // GPS Verified logic (200m = 0.2km)
    let verifiedVisit = true; // Booking-verified since we validated above
    if (userLat && userLng) {
      const station = stationDoc.data();
      if (station.lat && station.lng) {
        const distKm = getDistanceKm(userLat, userLng, station.lat, station.lng);
        if (distKm <= 0.2) verifiedVisit = true;
      }
    }

    const autoApprove = stationDoc.data().autoApproveReviews || false;

    // Use bookingId as review doc ID → guarantees one review per booking
    const reviewId = bookingId;
    const reviewData = {
      userId: req.uid,
      userName: req.email?.split('@')[0] || "User",
      rating: Number(rating),
      text,
      photoUrl: photoUrl || null,
      verifiedVisit,
      bookingId,
      status: autoApprove ? "approved" : "pending",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await stationRef.collection("reviews").doc(reviewId).set(reviewData);

    // Mark the booking as reviewed so it can't be reviewed again
    await db.collection("bookings").doc(bookingId).update({ reviewSubmitted: true });

    // Fire-and-forget: review submission points (unique per booking)
    axios.post(
      `${process.env.POINTS_SERVICE_URL}/api/points/award`,
      {
        userId: req.uid,
        reason: "review_submitted",
        points: 20,
        referenceId: stationId,
        checkDuplicate: true,
        duplicateKey: `review_${req.uid}_${bookingId}`,
      },
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
    ).catch((err) => console.error("[station-service] Review points failed:", err.message));

    // Recalculate average rating immediately (includes pending/approved logic)
    await updateStationRating(stationId);

    const message = autoApprove ? "Review posted successfully" : "Review submitted for moderation";
    res.json({ success: true, message, verifiedVisit });
  } catch (error) {
    console.error("[station-service] Submit review error:", error.message);
    res.status(500).json({ error: "Failed to submit review" });
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/stations/:id/generate-slots
// Generates slots for the next 7 days based on schedule (Task 3)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:id/generate-slots", verifyToken, async (req, res) => {
  try {
    const result = await generateSlotsForStation(req.params.id);
    res.json(result);
  } catch (error) {
    console.error("[station-service] Generate slots error:", error.message);
    res.status(500).json({ error: "Failed to generate slots", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/stations/:id/schedule
// Updates the station schedule per day (Task 2)
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:id/schedule", verifyToken, async (req, res) => {
  const { schedule } = req.body; // Expects an array or object of days
  const stationId = req.params.id;

  if (!schedule) {
    return res.status(400).json({ error: "Schedule data is required" });
  }

  try {
    const batch = db.batch();

    // schedule format: { "Monday": { isOpen: true, openTime: "09:00", closeTime: "22:00", slotDuration: 30 } }
    for (const [day, data] of Object.entries(schedule)) {
      const scheduleRef = db.collection("stations").doc(stationId).collection("schedule").doc(day);
      batch.set(scheduleRef, {
        day,
        isOpen: Boolean(data.isOpen),
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
        slotDuration: Number(data.slotDuration) || 30,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();

    // After updating schedule, auto-generate future slots without touching existing ones
    // We can do it asynchronously to not block the request
    generateSlotsForStation(stationId).catch(err => {
      console.error("[station-service] Async slot generation failed after schedule update:", err.message);
    });

    res.json({ success: true, message: "Schedule updated successfully and future slots are being regenerated" });
  } catch (error) {
    console.error("[station-service] Update schedule error:", error.message);
    res.status(500).json({ error: "Failed to update schedule" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stations/:id/slots
// Fetch dynamically generated available slots for a specific date
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/slots", async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ error: "Date parameter is required" });

  try {
    const slotsSnapshot = await db.collection("stations").doc(req.params.id)
      .collection("slots")
      .where("date", "==", date)
      .where("status", "==", "available")
      .get();

    const slots = [];
    slotsSnapshot.forEach(doc => {
      slots.push(doc.data().time);
    });

    // Sort chronologically
    slots.sort();

    res.json({ success: true, slots });
  } catch (error) {
    console.error("[station-service] Fetch slots error:", error.message);
    res.status(500).json({ error: "Failed to fetch slots" });
  }
});

module.exports = router;
