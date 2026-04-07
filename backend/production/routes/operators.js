// backend/production/routes/operators.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const { verifyToken } = require("./auth");

// POST /api/operators
// Create a new operator. Expected to be called by an Admin.
router.post("/", verifyToken, async (req, res) => {
  const { name, email, password, assignedStations } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  try {
    // 1. Create the Firebase Auth user automatically
    const authUser = await admin.auth().createUser({
      email: email.trim().toLowerCase(),
      password: password,
      displayName: name || "",
    });

    const operatorData = {
      name: name || "",
      email: email.trim().toLowerCase(),
      assignedStations: Array.isArray(assignedStations) ? assignedStations : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 2. Save into operators collection using the generated UID
    await db.collection("operators").doc(authUser.uid).set(operatorData);
    
    // 3. (Optional) Set custom claims if needed later.
    
    res.json({ success: true, message: "Operator created successfully", operator: operatorData });
  } catch (error) {
    console.error("[production-backend] Create operator error:", error.message);
    res.status(500).json({ error: "Failed to create operator: " + error.message });
  }
});

// GET /api/operators/:id
// Get operator details
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("operators").doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Operator not found" });
    }
    res.json({ success: true, operator: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("[production-backend] Get operator error:", error.message);
    res.status(500).json({ error: "Failed to fetch operator" });
  }
});

// PUT /api/operators/:id
// Update assigned stations or details
router.put("/:id", verifyToken, async (req, res) => {
  const { name, assignedStations } = req.body;

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
    if (assignedStations !== undefined) {
      updates.assignedStations = Array.isArray(assignedStations) ? assignedStations : [];
    }

    await operatorRef.update(updates);
    res.json({ success: true, message: "Operator updated successfully" });
  } catch (error) {
    console.error("[production-backend] Update operator error:", error.message);
    res.status(500).json({ error: "Failed to update operator" });
  }
});

module.exports = router;
