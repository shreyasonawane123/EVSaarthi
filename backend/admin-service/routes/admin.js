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
// Add a new charging station + auto-geocode lat/lng via Mappls
router.post("/stations/add", verifyToken, verifyAdmin, async (req, res) => {
  const {
    name,
    address,
    city,
    state,
    connectorTypes,
    totalSlots,
    pricePerUnit,
    upiSupported,
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
    const now = admin.firestore.FieldValue.serverTimestamp();

    const stationData = {
      name          : name.trim(),
      address       : address.trim(),
      city          : city.trim(),
      state         : state.trim(),
      connectorTypes,
      totalSlots    : slots,
      availableSlots: slots,
      status        : "open",
      pricePerUnit  : Number(pricePerUnit),
      upiSupported  : Boolean(upiSupported),
      rating        : 0,
      isActive      : true,
      lat           : Number(req.body.lat) || 0,
      lng           : Number(req.body.lng) || 0,
      addedBy       : req.uid,
      lastUpdatedBy : req.uid,
      createdAt     : now,
      updatedAt     : now,
    };

    const stationRef = await db.collection("stations").add(stationData);
    const stationId  = stationRef.id;

    res.json({
      success  : true,
      stationId,
      message  : "Station added successfully",
      coords   : { lat: stationData.lat, lng: stationData.lng },
    });
  } catch (error) {
    console.error("[admin-service] Add station error:", error.message);
    res.status(500).json({ error: "Failed to add station", details: error.message });
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
      updatedAt    : admin.firestore.FieldValue.serverTimestamp(),
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
      isActive     : newActive,
      lastUpdatedBy: req.uid,
      updatedAt    : admin.firestore.FieldValue.serverTimestamp(),
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
  const { id }            = req.params;
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
      lastUpdatedBy : req.uid,
      updatedAt     : admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true, availableSlots: slots, status });
  } catch (error) {
    console.error("[admin-service] Update slots error:", error.message);
    res.status(500).json({ error: "Failed to update slots" });
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
        totalUsers    : usersSnap.size,
        totalStations : stationsSnap.size,
        activeStations,
        totalVehicles : vehiclesSnap.size,
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

    const userDoc  = usersSnapshot.docs[0];
    const uid      = userDoc.id;
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
      email   : userData.email,
      name    : userData.name || "Unknown",
      role    : "admin",
      addedBy : req.uid,
      createdAt: now,
    };
    await db.collection("adminUsers").doc(uid).set(adminData);

    res.json({
      success: true,
      message: "Admin added successfully",
      admin  : { uid, email: userData.email, name: userData.name, role: "admin" },
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

module.exports = router;
