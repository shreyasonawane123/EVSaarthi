// backend/admin-service/routes/admin.js
// All admin API routes for EV Saarthi
// Requires verifyToken + verifyAdmin on protected routes

const express = require("express");
const router = express.Router();
const axios = require("axios");
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Require superadmin for all tenant creations/deletions
const requireSuperadmin = (req, res, next) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Access denied. Action strictly requires superadmin privileges." });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
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

/** Recalculate average rating for a station */
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

    const averageRating = Number((totalRating / count).toFixed(1));
    await db.collection("stations").doc(stationId).update({ rating: averageRating });
    console.log(`[admin-service] Updated station ${stationId} rating to ${averageRating}`);
  } catch (error) {
    console.error(`[admin-service] Failed to update rating for station ${stationId}:`, error.message);
  }
}

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
// Returns ALL stations scoped by tenantId for admins, or all stations for superadmin
router.get("/stations", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let snapshot;
    
    if (req.adminRole === "superadmin") {
      snapshot = await db.collection("stations").get();
    } else {
      if (!req.tenantId) {
        return res.json({ success: true, stations: [] });
      }
      snapshot = await db.collection("stations").where("tenantId", "==", req.tenantId).get();
    }

    let stations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings for JSON
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || null,
    }));
    
    // Sort in memory to avoid requiring a composite index alongside where
    stations.sort((a, b) => {
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      return tb.localeCompare(ta);
    });

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
    autoApproveReviews,
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
    // 📍 NORMALIZE LAT/LNG (Task 5)
    let lat = Number(req.body.lat ?? req.body.latitude) || 0;
    let lng = Number(req.body.lng ?? req.body.longitude) || 0;

    // 📍 AUTO-GEOCODE: if frontend didn't supply valid lat/lng, do it server-side
    // This must happen BEFORE duplicate check so we have coordinates to compare
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

    // 🛑 DUPLICATE PREVENTION (Task 4)
    // Same name (case-insensitive) AND nearby location (within ~200 meters)
    const stationsSnapshot = await db.collection("stations").get();
    
    let isDuplicate = false;
    const incomingName = name.trim().toLowerCase();

    for (const doc of stationsSnapshot.docs) {
      const station = doc.data();
      const existingName = (station.name || "").trim().toLowerCase();
      
      if (incomingName === existingName) {
        if (lat !== 0 && lng !== 0 && station.lat && station.lng) {
          const distKm = getDistanceKm(lat, lng, station.lat, station.lng);
          if (distKm <= 0.2) {
            isDuplicate = true;
            break;
          }
        }
      }
    }

    if (isDuplicate) {
      return res.status(400).json({
        error: "Station already exists",
      });
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
      autoApproveReviews: Boolean(autoApproveReviews),
      rating: 0,
      isActive: true,
      lat,
      lng,
      tenantId: req.tenantId || null,
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
    // Also normalize latitude/longitude (Task 5)
    if (updates.lat !== undefined) {
      updates.lat = Number(updates.lat);
    } else if (updates.latitude !== undefined) {
      updates.lat = Number(updates.latitude);
      delete updates.latitude;
    }

    if (updates.lng !== undefined) {
      updates.lng = Number(updates.lng);
    } else if (updates.longitude !== undefined) {
      updates.lng = Number(updates.longitude);
      delete updates.longitude;
    }

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
    
    // Fetch all existing stations for duplicate comparison
    const existingSnapshot = await stationsCol.get();
    const existingStations = existingSnapshot.docs.map(doc => doc.data());
    
    // Firestore batch limit is 500 operations.
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let skippedDuplicates = 0;

    for (let i = 0; i < stations.length; i += CHUNK_SIZE) {
      const chunk = stations.slice(i, i + CHUNK_SIZE);
      const batch = db.batch();

      chunk.forEach((st) => {
        const slots = Number(st.totalSlots) || 1;
        const price = Number(st.pricePerUnit) || 0;
        const lat = Number(st.lat ?? st.latitude) || 0;
        const lng = Number(st.lng ?? st.longitude) || 0;

        // 🛑 DUPLICATE CHECK (Backend fail-safe)
        const incomingName = (st.name || "").trim().toLowerCase();
        let isBatchDuplicate = false;

        for (const existing of existingStations) {
          const existingName = (existing.name || "").trim().toLowerCase();
          if (incomingName === existingName) {
            if (lat !== 0 && lng !== 0 && existing.lat && existing.lng) {
              const distKm = getDistanceKm(lat, lng, existing.lat, existing.lng);
              if (distKm <= 0.2) {
                isBatchDuplicate = true;
                break;
              }
            }
          }
        }

        if (isBatchDuplicate) {
          skippedDuplicates++;
          return;
        }

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
          autoApproveReviews: false, // Default for bulk upload
          rating: 0,
          isActive: true,
          lat,
          lng,
          tenantId: req.tenantId || null,
          addedBy: req.uid,
          lastUpdatedBy: req.uid,
          createdAt: now,
          updatedAt: now,
        };

        const newDocRef = stationsCol.doc();
        batch.set(newDocRef, stationData);
        totalSuccess++;
      });

      await batch.commit();
    }

    res.json({
      success: true,
      message: `Bulk add complete. ${totalSuccess} stations added. ${skippedDuplicates} duplicates skipped.`,
      addedCount: totalSuccess,
      skippedDuplicates
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
// Returns all users from users/ collection - Superadmin only
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Access denied. Platform users list is restricted to Superadmin." });
  }
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
// TENANT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /tenants
// Returns all tenants (Superadmin sees all, Admin sees only their own)
router.get("/tenants", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let snapshot;
    if (req.adminRole === "superadmin") {
        snapshot = await db.collection("tenants").get();
    } else {
        if (!req.tenantId) {
            return res.json({ success: true, tenants: [] });
        }
        const doc = await db.collection("tenants").doc(req.tenantId).get();
        if (doc.exists) {
            return res.json({ success: true, tenants: [{ id: doc.id, ...doc.data() }] });
        }
        return res.json({ success: true, tenants: [] });
    }

    const tenants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null
    }));

    res.json({ success: true, tenants });
  } catch (error) {
    console.error("[admin-service] Fetch tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

// POST /tenants
router.post("/tenants", verifyToken, verifyAdmin, requireSuperadmin, async (req, res) => {
  const { name, contactEmail, contactPerson } = req.body;
  if (!name) return res.status(400).json({ error: "Tenant name is required" });

  try {
    const tenantData = {
      name,
      contactEmail: contactEmail || "",
      contactPerson: contactPerson || "",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection("tenants").add(tenantData);
    res.json({ success: true, tenant: { id: docRef.id, ...tenantData } });
  } catch (error) {
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

// PUT /tenants/:id
router.put("/tenants/:id", verifyToken, verifyAdmin, requireSuperadmin, async (req, res) => {
  const { name, contactEmail, contactPerson } = req.body;
  try {
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) updateData.name = name;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;

    await db.collection("tenants").doc(req.params.id).update(updateData);
    res.json({ success: true, message: "Tenant updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

// GET /api/admin/me
// Returns current admin's profile data (role, tenantId)
router.get("/me", verifyToken, async (req, res) => {
  try {
    let adminDoc = await db.collection("adminUsers").doc(req.uid).get();
    let data;

    if (adminDoc.exists) {
      data = adminDoc.data();
    } else {
      // Check operators collection
      const operatorDoc = await db.collection("operators").doc(req.uid).get();
      if (operatorDoc.exists) {
        data = operatorDoc.data();
      } else {
        return res.status(404).json({ success: false, error: "Profile not found" });
      }
    }
    
    let tenantName = null;
    if (data.tenantId) {
        const tenantDoc = await db.collection("tenants").doc(data.tenantId).get();
        if (tenantDoc.exists) {
            tenantName = tenantDoc.data().name;
        }
    }

    res.json({ 
        success: true, 
        admin: { 
            uid: req.uid, 
            ...data,
            tenantName
        } 
    });
  } catch (error) {
    console.error("[admin-service] Get me error:", error.message);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// STATS ROUTE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats
// Returns dashboard-level counts, scoped by tenant for regular admins
router.get("/stats", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let usersSnap, stationsSnap, vehiclesSnap;
    
    if (req.adminRole === "superadmin") {
      [usersSnap, stationsSnap, vehiclesSnap] = await Promise.all([
        db.collection("users").get(),
        db.collection("stations").get(),
        db.collection("vehicles").get(),
      ]);
    } else {
      // For Tenant Admins
      if (!req.tenantId) {
          return res.json({ success: true, stats: { totalUsers: 0, totalStations: 0, activeStations: 0, totalVehicles: 0 } });
      }
      // Note: Users and Vehicles are global Platform-level metrics. 
      // Tenant Admins only see stats for their own stations.
      [stationsSnap] = await Promise.all([
        db.collection("stations").where("tenantId", "==", req.tenantId).get(),
      ]);
    }

    let activeStations = 0;
    let totalStations = stationsSnap ? stationsSnap.size : 0;

    if (stationsSnap) {
        stationsSnap.docs.forEach((doc) => {
          if (doc.data().isActive === true) activeStations++;
        });
    }

    res.json({
      success: true,
      stats: {
        totalUsers: usersSnap ? usersSnap.size : "—", // Hide global user count from tenant admins
        totalStations: totalStations,
        activeStations,
        totalVehicles: vehiclesSnap ? vehiclesSnap.size : "—",
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
// Add a user as admin by email (and password) — superadmin only
router.post("/team/add", verifyToken, verifyAdmin, async (req, res) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Superadmin only" });
  }

  const { email, password, tenantId, role } = req.body;
  const newRole = role === "superadmin" ? "superadmin" : "admin";
  
  if (!email || !email.trim()) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const emailLower = email.trim().toLowerCase();
    let uid;
    let userData = { email: emailLower, name: "Admin" };

    // Step 1: Check if user exists in Firebase Auth
    try {
      const userRecord = await admin.auth().getUserByEmail(emailLower);
      uid = userRecord.uid;
      userData.name = userRecord.displayName || "Admin";
      
      // Update password if one was provided in the UI
      if (password && password.trim().length >= 6) {
        await admin.auth().updateUser(uid, { password });
      }
    } catch (authErr) {
      if (authErr.code === "auth/user-not-found") {
        // User doesn't exist -> Create them!
        if (!password || password.trim().length < 6) {
          return res.status(400).json({ error: "User does not exist. A password of at least 6 characters is required to create a new admin." });
        }
        
        const newUser = await admin.auth().createUser({
          email: emailLower,
          password: password,
          displayName: "Admin"
        });
        uid = newUser.uid;
        
        // Add them to the public users/ collection so they formally exist
        await db.collection("users").doc(uid).set({
          name: "Admin",
          email: emailLower,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        throw authErr;
      }
    }

    // Step 2: Check if already an admin
    const existingAdmin = await db.collection("adminUsers").doc(uid).get();
    if (existingAdmin.exists) {
      // If we just provided a password, its updated. If we also provided a role, let's update it if needed.
      const existingData = existingAdmin.data();
      if (existingData.role !== newRole) {
         await db.collection("adminUsers").doc(uid).update({ role: newRole });
      }

      return res.json({ 
        success: true, 
        message: "Admin updated successfully",
        admin: { uid, email: userData.email, name: userData.name, role: newRole }
      });
    }

    // Step 3: Add to adminUsers/
    const now = admin.firestore.FieldValue.serverTimestamp();
    const adminData = {
      uid,
      email: userData.email,
      name: userData.name,
      role: newRole,
      tenantId: newRole === "superadmin" ? null : (tenantId || null),
      addedBy: req.uid,
      createdAt: now,
    };
    await db.collection("adminUsers").doc(uid).set(adminData);

    res.json({
      success: true,
      message: "Admin created and added successfully",
      admin: { uid, email: userData.email, name: userData.name, role: newRole },
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

    // Recalculate average rating
    await updateStationRating(stationId);

    res.json({ success: true, message: `Review ${status} successfully` });
  } catch (error) {
    console.error("[admin-service] Update review status error:", error.message);
    res.status(500).json({ error: "Failed to update review status" });
  }
});

// POST /api/admin/reviews/approve-all
// Bulk approve reviews
router.post("/reviews/approve-all", verifyToken, verifyAdmin, async (req, res) => {
  const { reviewIds } = req.body;
  
  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    return res.status(400).json({ error: "reviewIds array is required" });
  }

  try {
    const batch = db.batch();
    
    for (const item of reviewIds) {
      const { stationId, reviewId } = item;
      if (!stationId || !reviewId) continue;
      
      const reviewRef = db.collection("stations").doc(stationId).collection("reviews").doc(reviewId);
      batch.update(reviewRef, {
        status: "approved",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        moderatedBy: req.uid
      });
    }

    await batch.commit();

    // Recalculate ratings for all impacted stations (unique list)
    const impactedStations = [...new Set(reviewIds.map(item => item.stationId))];
    for (const sid of impactedStations) {
      if (sid) await updateStationRating(sid);
    }

    res.json({ success: true, message: `Successfully approved ${reviewIds.length} reviews` });
  } catch (error) {
    console.error("[admin-service] Bulk approve reviews error:", error.message);
    res.status(500).json({ error: "Failed to bulk approve reviews" });
  }
});

// POST /api/admin/reviews/reject-all
// Bulk reject reviews
router.post("/reviews/reject-all", verifyToken, verifyAdmin, async (req, res) => {
  const { reviewIds } = req.body;
  
  if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
    return res.status(400).json({ error: "reviewIds array is required" });
  }

  try {
    const batch = db.batch();
    
    for (const item of reviewIds) {
      const { stationId, reviewId } = item;
      if (!stationId || !reviewId) continue;
      
      const reviewRef = db.collection("stations").doc(stationId).collection("reviews").doc(reviewId);
      batch.update(reviewRef, {
        status: "rejected",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        moderatedBy: req.uid
      });
    }

    await batch.commit();

    // Recalculate ratings for all impacted stations
    const impactedStations = [...new Set(reviewIds.map(item => item.stationId))];
    for (const sid of impactedStations) {
      if (sid) await updateStationRating(sid);
    }

    res.json({ success: true, message: `Successfully rejected ${reviewIds.length} reviews` });
  } catch (error) {
    console.error("[admin-service] Bulk reject reviews error:", error.message);
    res.status(500).json({ error: "Failed to bulk reject reviews" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GREEN POINTS ADMIN ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/points/config
router.get("/points/config", verifyToken, verifyAdmin, async (req, res) => {
  try {
    const configDoc = await db.collection("pointsConfig").doc("settings").get();
    if (!configDoc.exists) {
      return res.status(404).json({ error: "Points configuration not found" });
    }
    res.json({ success: true, config: configDoc.data() });
  } catch (error) {
    console.error("[admin-service] Get points config error:", error.message);
    res.status(500).json({ error: "Failed to fetch points configuration" });
  }
});

// POST /api/admin/points/config
router.post("/points/config", verifyToken, verifyAdmin, requireSuperadmin, async (req, res) => {
  const { pointValueInRupees, minRedemptionPoints } = req.body;
  try {
    const updates = {
      updatedBy: req.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (pointValueInRupees !== undefined) updates.pointValueInRupees = Number(pointValueInRupees);
    if (minRedemptionPoints !== undefined) updates.minRedemptionPoints = Number(minRedemptionPoints);

    await db.collection("pointsConfig").doc("settings").update(updates);
    res.json({ success: true, message: "Points configuration updated" });
  } catch (error) {
    console.error("[admin-service] Update points config error:", error.message);
    res.status(500).json({ error: "Failed to update points configuration" });
  }
});

// GET /api/admin/points/station-requests
router.get("/points/station-requests", verifyToken, verifyAdmin, async (req, res) => {
  try {
    let query = db.collection("stationPointsRequests");

    if (req.adminRole === "operator") {
      query = query.where("operatorId", "==", req.uid);
    } else if (req.adminRole !== "superadmin") {
      if (!req.tenantId) return res.json({ success: true, requests: [] });
      query = query.where("tenantId", "==", req.tenantId);
    }

    const snapshot = await query.get();
    let requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      reviewedAt: doc.data().reviewedAt?.toDate?.().toISOString() || null,
    }));
    
    // In-memory sort to bypass missing composite index errors
    requests.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.json({ success: true, requests });
  } catch (error) {
    console.error("[admin-service] Get station requests error:", error.message);
    res.status(500).json({ error: "Failed to fetch station requests" });
  }
});

// PATCH /api/admin/points/station-requests/:id
router.patch("/points/station-requests/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, adminNote } = req.body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
  }

  try {
    const requestRef = db.collection("stationPointsRequests").doc(id);
    const requestDoc = await requestRef.get();

    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Station request not found" });
    }

    const requestData = requestDoc.data();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await requestRef.update({
      status,
      adminNote: adminNote || "",
      reviewedBy: req.uid,
      reviewedAt: now,
    });

    // If approved, update the station's approvedPointsPerHour
    if (status === "approved" && requestData.stationId) {
      await db.collection("stations").doc(requestData.stationId).update({
        approvedPointsPerHour: requestData.pointsPerHour,
        updatedAt: now,
      });
    }

    res.json({ success: true, message: `Request ${status}` });
  } catch (error) {
    console.error("[admin-service] Review station request error:", error.message);
    res.status(500).json({ error: "Failed to update request" });
  }
});

module.exports = router;
