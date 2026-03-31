// backend/admin-service/routes/admin.js
// All admin API routes for EV Saarthi
// Requires verifyToken + verifyAdmin on protected routes

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// ─────────────────────────────────────────────────────────────────────────────
// MAPPLS GEOCODING HELPER
// ─────────────────────────────────────────────────────────────────────────────

// Simple in-memory cache for the Mappls OAuth token to avoid rate limits
let cachedMapplsToken = null;
let tokenExpiryTime = 0;

/**
 * Fetch a Bearer token from Mappls using Client ID and Secret.
 * Tokens are usually valid to be cached, so we cache it in memory.
 */
async function getMapplsToken() {
  if (cachedMapplsToken && Date.now() < tokenExpiryTime) {
    return cachedMapplsToken;
  }
  
  const clientId = process.env.MAPPLS_CLIENT_ID;
  const clientSecret = process.env.MAPPLS_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.warn("[geocode] MAPPLS_CLIENT_ID or MAPPLS_CLIENT_SECRET not set in .env");
    return null;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);

    const res = await axios.post('https://outpost.mappls.com/api/security/oauth/token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    });

    if (res.data && res.data.access_token) {
      cachedMapplsToken = res.data.access_token;
      // Expires in seconds, subtract 5 mins (300s) buffer
      const expiresIn = res.data.expires_in || 86400; 
      tokenExpiryTime = Date.now() + (expiresIn - 300) * 1000;
      console.log("[geocode] ✅ Successfully generated Mappls OAuth Bearer Token");
      return cachedMapplsToken;
    }
  } catch (err) {
    console.error("[geocode] ❌ Failed to get Mappls OAuth token:", err.response?.data || err.message);
  }
  return null;
}

/**
 * Geocode a full address using the Mappls REST API as requested.
 * Returns { lat, lng } on success, or null on failure.
 */
async function geocodeAddress(address, city, state) {
  const fullAddress = [address, city, state, "India"]
    .map(s => (s || "").trim())
    .filter(Boolean)
    .join(", ");

  const token = await getMapplsToken();
  if (!token) {
    console.warn("[geocode] Cannot geocode because Mappls OAuth token is missing.");
    return null;
  }

  try {
    const url = `https://atlas.mappls.com/api/places/geocode`;
    const response = await axios.get(url, {
      params: { address: fullAddress },
      headers: { 
        "Authorization": `bearer ${token}`,
        "User-Agent": "EVSaarthiAdmin/1.0" 
      },
      timeout: 10000,
    });

    const data = response.data;
    
    // Mappls Geocoding API returns a single object in `copResults`
    if (data && data.copResults) {
      const r = data.copResults;
      const parsedLat = parseFloat(r.latitude || r.lat || 0);
      const parsedLng = parseFloat(r.longitude || r.lng || 0);
      
      if (!isNaN(parsedLat) && !isNaN(parsedLng) && parsedLat !== 0) {
        console.log(`[geocode] ✅ "${fullAddress}" → ${parsedLat}, ${parsedLng}`);
        return { lat: parsedLat, lng: parsedLng };
      }
    }
    
    console.warn(`[geocode] ⚠️  No results for: "${fullAddress}"`);
    return null;
  } catch (err) {
    console.error(`[geocode] ❌ Error for "${fullAddress}":`, err.response?.status || 500, err.response?.data || err.message);
    return null;
  }
}

/** Wait helper */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ─────────────────────────────────────────────────────────────────────────────
// STATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stations
// Returns ALL stations (including inactive) — no auth required (read-only)
router.get("/stations", async (req, res) => {
  try {
    const snapshot = await db
      .collection("stations")
      .orderBy("createdAt", "desc")
      .get();

    const stations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings for JSON
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || null,
    }));

    res.json({ success: true, stations });
  } catch (error) {
    console.error("[admin-service] Get stations error:", error.message);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

// POST /api/admin/stations/add
// Add a new charging station. Auto-geocodes via OpenStreetMap if lat/lng absent.
router.post("/stations/add", verifyToken, verifyAdmin, async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    connectorTypes,
    totalSlots,
    pricePerUnit,
    paymentMethods,
  } = req.body;

  // Validate required fields
  if (!name || !address || !city || !state || !totalSlots || !pricePerUnit) {
    return res.status(400).json({
      error: "Missing required fields: name, address, city, state, totalSlots, pricePerUnit",
    });
  }
  if (!connectorTypes || !Array.isArray(connectorTypes) || connectorTypes.length === 0) {
    return res.status(400).json({ error: "At least one connector type is required" });
  }

  const slots = Number(totalSlots);

  try {
    // 🛑 DUPLICATE PREVENTION
    const duplicateSnapshot = await db.collection("stations")
      .where("name", "==", name.trim())
      .where("city", "==", city.trim())
      .get();

    if (!duplicateSnapshot.empty) {
      return res.status(400).json({
        error: "Duplicate station",
        message: `Station with name ${name} already exists in ${city}. Please verify before adding.`
      });
    }

    // 📍 AUTO-GEOCODE: if frontend didn't supply valid lat/lng, do it server-side
    let lat = Number(req.body.lat) || 0;
    let lng = Number(req.body.lng) || 0;

    if (!lat || !lng) {
      console.log(`[admin-service] Geocoding "${name}" at "${address}, ${city}, ${state}"...`);
      const coords = await geocodeAddress(address, city, state);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      } else {
        console.warn(`[admin-service] Geocoding failed for "${name}" — saving with lat=0, lng=0`);
      }
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    const stationData = {
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      connectorTypes,
      totalSlots: slots,
      availableSlots: slots,
      status: "open",
      pricePerUnit: Number(pricePerUnit),
      paymentMethods: Array.isArray(paymentMethods) ? paymentMethods : ["UPI"],
      rating: 0,
      isActive: true,
      lat,
      lng,
      addedBy: req.uid,
      lastUpdatedBy: req.uid,
      createdAt: now,
      updatedAt: now,
    };

    const stationRef = await db.collection("stations").add(stationData);
    const stationId = stationRef.id;

    res.json({
      success: true,
      stationId,
      message: "Station added successfully",
      geocoded: lat !== 0 && lng !== 0,
      coords: { lat, lng },
    });
  } catch (error) {
    console.error("[admin-service] Add station error:", error.message);
    res.status(500).json({ error: "Failed to add station", details: error.message });
  }
});

// POST /api/admin/stations/geocode-missing
// Batch-geocodes all stations where lat=0 or lng=0 and updates them in Firestore
router.post("/stations/geocode-missing", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("stations").get();
    const missing = snapshot.docs.filter(doc => {
      const d = doc.data();
      return !d.lat || !d.lng;
    });

    if (missing.length === 0) {
      return res.json({ success: true, fixed: 0, failed: 0, message: "No stations with missing coordinates" });
    }

    let fixed = 0;
    let failed = 0;
    const results = [];

    for (const doc of missing) {
      const d = doc.data();
      const coords = await geocodeAddress(d.address, d.city, d.state);
      if (coords) {
        await doc.ref.update({
          lat: coords.lat,
          lng: coords.lng,
          lastUpdatedBy: req.uid,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        fixed++;
        results.push({ id: doc.id, name: d.name, status: "fixed", ...coords });
      } else {
        failed++;
        results.push({ id: doc.id, name: d.name, status: "failed" });
      }
      
      // Delay 1 second to respect OpenStreetMap Nominatim usage policy
      await sleep(1000);
    }

    res.json({ success: true, fixed, failed, total: missing.length, results });
  } catch (error) {
    console.error("[admin-service] Geocode-missing error:", error.message);
    res.status(500).json({ error: "Failed to geocode missing stations", details: error.message });
  }
});

// PUT /api/admin/stations/:id
// Update any fields on an existing station; re-geocodes if address/city/state changed
router.put("/stations/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // Strip immutable fields
  delete updates.id;
  delete updates.createdAt;
  delete updates.addedBy;

  try {
    const stationRef = db.collection("stations").doc(id);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) {
      return res.status(404).json({ error: "Station not found" });
    }

    const existing = stationDoc.data();

    // No backend geocoding; use lat/lng from frontend if provided
    if (updates.lat !== undefined) updates.lat = Number(updates.lat);
    if (updates.lng !== undefined) updates.lng = Number(updates.lng);

    await stationRef.update({
      ...updates,
      lastUpdatedBy: req.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true, message: "Station updated successfully" });
  } catch (error) {
    console.error("[admin-service] Update station error:", error.message);
    res.status(500).json({ error: "Failed to update station", details: error.message });
  }
});

// DELETE /api/admin/stations/:id
// Hard delete from Firestore
router.delete("/stations/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const stationRef = db.collection("stations").doc(id);
    if (!(await stationRef.get()).exists) {
      return res.status(404).json({ error: "Station not found" });
    }
    await stationRef.delete();
    res.json({ success: true, message: "Station deleted successfully" });
  } catch (error) {
    console.error("[admin-service] Delete station error:", error.message);
    res.status(500).json({ error: "Failed to delete station" });
  }
});

// PATCH /api/admin/stations/:id/toggle
// Toggle isActive true ↔ false (visible/hidden on map)
router.patch("/stations/:id/toggle", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const stationRef = db.collection("stations").doc(id);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) {
      return res.status(404).json({ error: "Station not found" });
    }
    const newActive = !stationDoc.data().isActive;
    await stationRef.update({
      isActive: newActive,
      lastUpdatedBy: req.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, isActive: newActive });
  } catch (error) {
    console.error("[admin-service] Toggle station error:", error.message);
    res.status(500).json({ error: "Failed to toggle station" });
  }
});

// PATCH /api/admin/stations/:id/slots
// Update available slots and auto-recalculate status
router.patch("/stations/:id/slots", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { availableSlots } = req.body;

  if (availableSlots === undefined || availableSlots === null) {
    return res.status(400).json({ error: "availableSlots is required" });
  }
  const slots = Number(availableSlots);
  if (isNaN(slots) || slots < 0) {
    return res.status(400).json({ error: "availableSlots must be a non-negative number" });
  }

  // Auto-calculate status
  const status = slots === 0 ? "full" : slots <= 2 ? "filling" : "open";

  try {
    const stationRef = db.collection("stations").doc(id);
    if (!(await stationRef.get()).exists) {
      return res.status(404).json({ error: "Station not found" });
    }
    await stationRef.update({
      availableSlots: slots,
      status,
      lastUpdatedBy: req.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, availableSlots: slots, status });
  } catch (error) {
    console.error("[admin-service] Update slots error:", error.message);
    res.status(500).json({ error: "Failed to update slots" });
  }
});

// POST /api/admin/stations/bulk-add
// Add multiple stations atomically using Firestore WriteBatch.
// Input: { stations: [...] }
router.post("/stations/bulk-add", verifyToken, verifyAdmin, async (req, res) => {
  const { stations } = req.body;

  if (!stations || !Array.isArray(stations) || stations.length === 0) {
    return res.status(400).json({ error: "Stations array is required and must not be empty" });
  }

  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const stationsCol = db.collection("stations");
    
    // Firestore batch limit is 500 operations.
    // We break the array into chunks of 500 even though the UI handles it.
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;

    for (let i = 0; i < stations.length; i += CHUNK_SIZE) {
      const chunk = stations.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      chunk.forEach((st) => {
        const slots = Number(st.totalSlots) || 1;
        const price = Number(st.pricePerUnit) || 0;
        const lat = Number(st.lat);
        const lng = Number(st.lng);

        const stationData = {
          name: (st.name || "").trim(),
          address: (st.address || "").trim(),
          city: (st.city || "").trim(),
          state: (st.state || "").trim(),
          connectorTypes: Array.isArray(st.connectorTypes) ? st.connectorTypes : [],
          totalSlots: slots,
          availableSlots: slots,
          status: "open",
          pricePerUnit: price,
          paymentMethods: Array.isArray(st.paymentMethods) ? st.paymentMethods : ["UPI"],
          rating: 0,
          isActive: true,
          lat,
          lng,
          addedBy: req.uid,
          lastUpdatedBy: req.uid,
          createdAt: now,
          updatedAt: now,
        };

        const newDocRef = stationsCol.doc();
        batch.set(newDocRef, stationData);
      });

      await batch.commit();
      totalSuccess += chunk.length;
    }

    res.json({
      success: true,
      message: `Bulk add complete. ${totalSuccess} stations added.`,
      addedCount: totalSuccess
    });
  } catch (error) {
    console.error("[admin-service] Bulk add error:", error.message);
    res.status(500).json({ error: "Bulk add failed", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// USER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users
// Returns all users from users/ collection
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));
    // Sort by name
    users.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json({ success: true, users });
  } catch (error) {
    console.error("[admin-service] Get users error:", error.message);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS ROUTE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
// Returns dashboard-level counts
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const [usersSnap, stationsSnap, vehiclesSnap] = await Promise.all([
      db.collection("users").get(),
      db.collection("stations").get(),
      db.collection("vehicles").get(),
    ]);

    let activeStations = 0;
    stationsSnap.docs.forEach((doc) => {
      if (doc.data().isActive === true) activeStations++;
    });

    res.json({
      success: true,
      stats: {
        totalUsers: usersSnap.size,
        totalStations: stationsSnap.size,
        activeStations,
        totalVehicles: vehiclesSnap.size,
      },
    });
  } catch (error) {
    console.error("[admin-service] Get stats error:", error.message);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEAM ROUTES (superadmin only)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/team
// Returns all admins from adminUsers/ — superadmin only
router.get("/team", verifyToken, verifyAdmin, async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }
  try {
    const snapshot = await db.collection("adminUsers").get();
    const admins = snapshot.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));
    admins.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    res.json({ success: true, admins });
  } catch (error) {
    console.error("[admin-service] Get team error:", error.message);
    res.status(500).json({ error: "Failed to fetch admin team" });
  }
});

// POST /api/admin/team/add
// Add a user as admin by email — superadmin only
// Body: { email: "someone@gmail.com" }
router.post("/team/add", verifyToken, verifyAdmin, async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }

  const { email } = req.body;
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Step 1: Find user in users/ collection by email
    const usersSnapshot = await db
      .collection("users")
      .where("email", "==", email.trim().toLowerCase())
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({
        error: "User not found. Ask them to login to EV Saarthi first.",
      });
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;
    const userData = userDoc.data();

    // Step 2: Check if already an admin
    const existingAdmin = await db.collection("adminUsers").doc(uid).get();
    if (existingAdmin.exists) {
      return res.status(400).json({ error: "This person is already an admin" });
    }

    // Step 3: Add to adminUsers/
    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminData = {
      uid,
      email: userData.email,
      name: userData.name || "Unknown",
      role: "admin",
      addedBy: req.uid,
      createdAt: now,
    };
    await db.collection("adminUsers").doc(uid).set(adminData);

    res.json({
      success: true,
      message: "Admin added successfully",
      admin: { uid, email: userData.email, name: userData.name, role: "admin" },
    });
  } catch (error) {
    console.error("[admin-service] Add admin error:", error.message);
    res.status(500).json({ error: "Failed to add admin", details: error.message });
  }
});

// DELETE /api/admin/team/:uid
// Remove an admin — superadmin only
// Cannot remove yourself or another superadmin
router.delete("/team/:uid", verifyToken, verifyAdmin, async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }

  const { uid } = req.params;

  if (uid === req.uid) {
    return res.status(400).json({ error: "Cannot remove yourself" });
  }

  try {
    const targetDoc = await db.collection("adminUsers").doc(uid).get();
    if (!targetDoc.exists) {
      return res.status(404).json({ error: "Admin not found" });
    }
    if (targetDoc.data().role === "superadmin") {
      return res.status(403).json({ error: "Cannot remove a superadmin" });
    }

    await db.collection("adminUsers").doc(uid).delete();
    res.json({ success: true, message: "Admin removed successfully" });
  } catch (error) {
    console.error("[admin-service] Remove admin error:", error.message);
    res.status(500).json({ error: "Failed to remove admin", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW MODERATION ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/reviews
// Returns ALL reviews across all stations for moderation
router.get("/reviews", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Collection Group Query: gets 'reviews' subcollection from ANY document
    // Temporarily removed orderBy to avoid index requirement
    const snapshot = await db.collectionGroup("reviews").get();
    
    const reviews = snapshot.docs.map(doc => {
      const data = doc.data();
      // To update/delete, we need the parent station ID
      // doc.ref.parent.parent.id gives the stationId
      const stationId = doc.ref.parent.parent.id;
      
      return {
        id: doc.id,
        stationId,
        ...data,
        timestamp: data.timestamp?.toDate?.().toISOString() || null,
      };
    });

    res.json({ success: true, reviews });
  } catch (error) {
    console.error("[admin-service] Get reviews moderation error:", error.message);
    res.status(500).json({ 
      error: "Failed to fetch reviews for moderation", 
      message: error.message,
      // If this is a missing index error, the message will contain a link to create it!
      details: error.stack 
    });
  }
});

// PATCH /api/admin/reviews/:stationId/:reviewId
// Approve or reject a review
router.patch("/reviews/:stationId/:reviewId", verifyToken, verifyAdmin, async (req, res) => {
  const { stationId, reviewId } = req.params;
  const { status } = req.body; // "approved" | "rejected" | "pending"

  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const reviewRef = db.collection("stations").doc(stationId).collection("reviews").doc(reviewId);
    const doc = await reviewRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Review not found" });
    }

    await reviewRef.update({
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      moderatedBy: req.uid
    });

    res.json({ success: true, message: `Review ${status} successfully` });
  } catch (error) {
    console.error("[admin-service] Update review status error:", error.message);
    res.status(500).json({ error: "Failed to update review status" });
  }
});

module.exports = router;
