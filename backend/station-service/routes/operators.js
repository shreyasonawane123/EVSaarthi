// backend/station-service/routes/operators.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyOperator = require("../middleware/verifyOperator");

// GET /operators
// Get all operators (Superadmin sees all, Admin sees only their tenant's operators)
router.get("/", verifyToken, async (req, res) => {
  try {
    let finalTenantId = null;
    let creatorRole = "admin";

    // Lookup the caller to determine their role and tenant
    const adminDoc = await db.collection("adminUsers").doc(req.uid).get();
    if (adminDoc.exists) {
      const adData = adminDoc.data();
      creatorRole = adData.role;
      if (adData.role !== "superadmin") {
        finalTenantId = adData.tenantId || null;
      }
    }

    let snapshot;
    if (creatorRole === "superadmin") {
      snapshot = await db.collection("operators").get();
    } else {
      if (!finalTenantId) {
        return res.json({ success: true, operators: [] });
      }
      snapshot = await db.collection("operators").where("tenantId", "==", finalTenantId).get();
    }

    let operators = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || null,
    }));
    
    operators.sort((a, b) => {
      const ta = a.createdAt || "";
      const tb = b.createdAt || "";
      return tb.localeCompare(ta);
    });

    res.json({ success: true, operators });
  } catch (error) {
    console.error("[station-service] Get operators error:", error.message);
    res.status(500).json({ error: "Failed to fetch operators" });
  }
});

// POST /operators
// Create a new operator — passwordless, role-based (Google sign-in)
router.post("/", verifyToken, async (req, res) => {
  const { name, email, stationId, tenantId } = req.body;

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  try {
    const emailLower = email.trim().toLowerCase();

    // Fetch the admin making this request to inherit their tenantId
    let finalTenantId = tenantId || null;
    try {
      const adminDoc = await db.collection("adminUsers").doc(req.uid).get();
      if (adminDoc.exists) {
        const adData = adminDoc.data();
        if (adData.role !== "superadmin") {
          finalTenantId = adData.tenantId || null;
        }
      }
    } catch (err) {
      console.error("Failed to check admin tenant:", err);
    }

    const operatorData = {
      name: name || "",
      email: emailLower,
      stationId: stationId || null,
      tenantId: finalTenantId,
      role: "operator",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check if user already exists in Firebase Auth (e.g., signed in via Google before)
    let uid = null;
    try {
      const userRecord = await admin.auth().getUserByEmail(emailLower);
      uid = userRecord.uid;
      operatorData.name = userRecord.displayName || name || "";
    } catch (authErr) {
      if (authErr.code !== "auth/user-not-found") throw authErr;
    }

    if (uid) {
      // User exists in Auth — create operator record directly
      await db.collection("operators").doc(uid).set(operatorData);
      // Also add to adminUsers with operator role for /me endpoint detection
      await db.collection("adminUsers").doc(uid).set({
        uid,
        email: emailLower,
        name: operatorData.name,
        role: "operator",
        tenantId: finalTenantId,
        addedBy: req.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // User doesn't exist yet — store as pending so they're auto-activated on first Google sign-in
      await db.collection("pendingAdmins").doc(emailLower).set({
        email: emailLower,
        name: name || "Operator",
        role: "operator",
        tenantId: finalTenantId,
        stationId: stationId || null,
        addedBy: req.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    
    res.json({ success: true, message: "Operator created successfully", operator: operatorData });
  } catch (error) {
    console.error("[station-service] Create operator error:", error.message);
    res.status(500).json({ error: "Failed to create operator: " + error.message });
  }
});

// GET /operators/:id
// Get operator details
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("operators").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Operator not found" });
    }
    res.json({ success: true, operator: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("[station-service] Get operator error:", error.message);
    res.status(500).json({ error: "Failed to fetch operator" });
  }
});

// PUT /operators/:id
// Update stationId or details
router.put("/:id", verifyToken, async (req, res) => {
  const { name, stationId, tenantId } = req.body;

  try {
    const operatorRef = db.collection("operators").doc(req.params.id);
    const doc = await operatorRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: "Operator not found" });
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (name !== undefined) updates.name = name;
    if (stationId !== undefined) updates.stationId = stationId;
    if (tenantId !== undefined) updates.tenantId = tenantId;

    await operatorRef.update(updates);
    res.json({ success: true, message: "Operator updated successfully" });
  } catch (error) {
    console.error("[station-service] Update operator error:", error.message);
    res.status(500).json({ error: "Failed to update operator" });
  }
});

// DELETE /operators/:id
// Deletes operator from Firestore and Firebase Auth
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const operatorId = req.params.id;
    
    // 1. Delete from Firestore
    await db.collection("operators").doc(operatorId).delete();
    
    // 2. Delete from Firebase Auth
    try {
      await admin.auth().deleteUser(operatorId);
    } catch (authError) {
      console.warn("[station-service] Firebase Auth user already deleted or not found:", authError.message);
    }
    
    res.json({ success: true, message: "Operator deleted successfully" });
  } catch (error) {
    console.error("[station-service] Delete operator error:", error.message);
    res.status(500).json({ error: "Failed to delete operator" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/operators/points-request
// Operators submit a request for approvedPointsPerHour on their station.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/points-request", verifyToken, async (req, res) => {
  const { stationId, pointsPerHour } = req.body;

  if (!stationId || !pointsPerHour) {
    return res.status(400).json({ error: "stationId and pointsPerHour are required" });
  }

  try {
    // Verify that the operator owns this station
    const operatorDoc = await db.collection("operators").doc(req.uid).get();
    if (!operatorDoc.exists) {
      return res.status(403).json({ error: "Operator profile not found" });
    }

    const operatorData = operatorDoc.data();
    if (operatorData.stationId !== stationId) {
      return res.status(403).json({ error: "You do not manage this station" });
    }

    // Fetch station details for the request doc
    const stationDoc = await db.collection("stations").doc(stationId).get();
    if (!stationDoc.exists) {
      return res.status(404).json({ error: "Station not found" });
    }

    const station = stationDoc.data();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docRef = await db.collection("stationPointsRequests").add({
      stationId,
      stationName: station.name || "",
      operatorId: req.uid,
      tenantId: operatorData.tenantId || null,
      pointsPerHour: Number(pointsPerHour),
      status: "pending",
      adminNote: "",
      createdAt: now,
      reviewedAt: null,
      reviewedBy: null,
    });

    res.json({ success: true, requestId: docRef.id });
  } catch (error) {
    console.error("[station-service] Points request error:", error.message);
    res.status(500).json({ error: "Failed to submit points request", details: error.message });
  }
});

module.exports = router;

