// backend/points-service/routes/accessories.js
// Accessories catalog and purchase routes

const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/points/accessories
// Public — returns all active accessories for the catalog.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/accessories", async (req, res) => {
  try {
    const snapshot = await db
      .collection("accessories")
      .where("isActive", "==", true)
      .get();

    const accessories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    }));

    return res.json({ success: true, accessories });
  } catch (error) {
    console.error("[points-service] Get accessories error:", error.message);
    res.status(500).json({ error: "Failed to fetch accessories" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/accessories
// Admin — creates a new accessory in the catalog.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accessories", verifyToken, async (req, res) => {
  const { name, description, imageUrl, pointsRequired, stockCount } = req.body;

  if (!name || !pointsRequired) {
    return res.status(400).json({ error: "name and pointsRequired are required" });
  }

  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const docRef = await db.collection("accessories").add({
      name: name.trim(),
      description: description || "",
      imageUrl: imageUrl || "",
      pointsRequired: Number(pointsRequired),
      stockCount: stockCount !== undefined ? Number(stockCount) : -1,
      isActive: true,
      addedBy: req.uid,
      createdAt: now,
    });

    return res.json({ success: true, accessoryId: docRef.id });
  } catch (error) {
    console.error("[points-service] Create accessory error:", error.message);
    res.status(500).json({ error: "Failed to create accessory" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/points/accessories/:id
// Admin — updates an existing accessory.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/accessories/:id", verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const accRef = db.collection("accessories").doc(id);
    const accDoc = await accRef.get();

    if (!accDoc.exists) {
      return res.status(404).json({ error: "Accessory not found" });
    }

    const updates = {};
    const allowed = ["name", "description", "imageUrl", "pointsRequired", "stockCount", "isActive"];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    await accRef.update(updates);
    return res.json({ success: true });
  } catch (error) {
    console.error("[points-service] Update accessory error:", error.message);
    res.status(500).json({ error: "Failed to update accessory" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/accessories/purchase
// Protected — purchases an accessory using the user's points.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/accessories/purchase", verifyToken, async (req, res) => {
  const { accessoryId } = req.body;

  if (!accessoryId) {
    return res.status(400).json({ error: "accessoryId is required" });
  }

  try {
    const accRef = db.collection("accessories").doc(accessoryId);
    const accDoc = await accRef.get();

    if (!accDoc.exists || !accDoc.data().isActive) {
      return res.status(404).json({ error: "Accessory not found or unavailable" });
    }

    const acc = accDoc.data();

    if (acc.stockCount === 0) {
      return res.status(400).json({ error: "Out of stock" });
    }

    const userRef = db.collection("users").doc(req.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentTotal = userDoc.data().totalPoints || 0;

    if (currentTotal < acc.pointsRequired) {
      return res.status(400).json({
        error: `Insufficient points. You need ${acc.pointsRequired} pts but have ${currentTotal} pts.`,
      });
    }

    const newBalance = currentTotal - acc.pointsRequired;
    const now = admin.firestore.FieldValue.serverTimestamp();
    const orderRef = db.collection("accessoryOrders").doc();
    const ledgerRef = db.collection("pointsLedger").doc();

    await db.runTransaction(async (transaction) => {
      // Create order
      transaction.set(orderRef, {
        userId: req.uid,
        accessoryId,
        accessoryName: acc.name,
        pointsSpent: acc.pointsRequired,
        status: "placed",
        createdAt: now,
      });

      // Ledger entry for redemption
      transaction.set(ledgerRef, {
        userId: req.uid,
        type: "redeem",
        points: -acc.pointsRequired,
        reason: "accessory_purchase",
        referenceId: orderRef.id,
        balanceAfter: newBalance,
        createdAt: now,
      });

      // Deduct points from user
      transaction.update(userRef, { totalPoints: newBalance });

      // Decrement stock if not unlimited
      if (acc.stockCount !== -1) {
        transaction.update(accRef, { stockCount: acc.stockCount - 1 });
      }
    });

    console.log(`[points-service] Accessory ${accessoryId} purchased by ${req.uid}`);
    return res.json({
      success: true,
      orderId: orderRef.id,
      pointsSpent: acc.pointsRequired,
    });
  } catch (error) {
    console.error("[points-service] Purchase error:", error.message);
    res.status(500).json({ error: "Failed to complete purchase", details: error.message });
  }
});

module.exports = router;
