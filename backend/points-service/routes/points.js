// backend/points-service/routes/points.js
// Core points routes: award, balance, history, redeem, config

const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyInternalSecret = require("../middleware/verifyInternalSecret");
const { calculateTier } = require("../utils/tierCalculator");
const { generateCode } = require("../utils/referralGenerator");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/award
// Called by other microservices via internal secret. Awards points to a user.
// Idempotent via checkDuplicate flag.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/award", verifyInternalSecret, async (req, res) => {
  const { userId, reason, points, referenceId, checkDuplicate, duplicateKey, tenantId, stationId } = req.body;

  if (!userId || !reason || !points) {
    return res.status(400).json({ error: "userId, reason, and points are required" });
  }

  try {
    // ── Tenant green points enabled check ───────────────────────
    if (tenantId) {
      const tenantDoc = await db.collection("tenants").doc(tenantId).get();
      if (tenantDoc.exists && tenantDoc.data().greenPointsEnabled === false) {
        return res.json({
          success: true,
          skipped: true,
          reason: "tenant_points_disabled",
          message: "Green points are disabled for this tenant"
        });
      }
    }

    // ── Idempotency check ───────────────────────────────────────
    if (checkDuplicate && duplicateKey) {
      const dupSnap = await db
        .collection("pointsLedger")
        .where("userId", "==", userId)
        .where("referenceId", "==", duplicateKey)
        .where("reason", "==", reason)
        .limit(1)
        .get();

      if (!dupSnap.empty) {
        return res.json({
          success: true,
          skipped: true,
          reason: "already_awarded",
        });
      }
    }

    // ── Read current user totals ────────────────────────────────
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const userData = userDoc.data();
    const currentTotal = userData.totalPoints || 0;
    const currentLifetime = userData.lifetimePoints || 0;

    const newTotal = currentTotal + Number(points);
    const newLifetime = currentLifetime + Number(points);
    const newTier = calculateTier(newLifetime);

    // ── Atomic transaction ──────────────────────────────────────
    const ledgerRef = db.collection("pointsLedger").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Compute expiry date from config (default 365 days)
    let expiryDays = 365;
    try {
      const cfgDoc = await db.collection("pointsConfig").doc("settings").get();
      if (cfgDoc.exists && cfgDoc.data().pointsExpiryDays) {
        expiryDays = Number(cfgDoc.data().pointsExpiryDays);
      }
    } catch (_) { /* use default */ }
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    await db.runTransaction(async (transaction) => {
      // Write ledger entry
      transaction.set(ledgerRef, {
        userId,
        type: "earn",
        points: Number(points),
        reason,
        referenceId: referenceId || null,
        tenantId: tenantId || null,
        stationId: stationId || null,
        balanceAfter: newTotal,
        expiresAt,
        createdAt: now,
      });

      // Update user document
      transaction.update(userRef, {
        totalPoints: newTotal,
        lifetimePoints: newLifetime,
        tier: newTier,
      });

      // If session_completed, mark booking as pointsAwarded
      if (reason === "session_completed" && referenceId) {
        const bookingRef = db.collection("bookings").doc(referenceId);
        transaction.update(bookingRef, { pointsAwarded: true });
      }
    });

    console.log(`[points-service] Awarded ${points} pts to ${userId} for ${reason}`);
    return res.json({
      success: true,
      pointsAwarded: Number(points),
      newBalance: newTotal,
      tier: newTier,
    });
  } catch (error) {
    console.error("[points-service] Award error:", error.message);
    res.status(500).json({ error: "Failed to award points", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/points/balance
// Returns the calling user's current balance, lifetime points, tier, referralCode.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/balance", verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection("users").doc(req.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const data = userDoc.data();
    let referralCode = data.referralCode || null;

    // Lazily backfill referral code for existing users
    if (!referralCode) {
      referralCode = await generateCode();
      const now = admin.firestore.FieldValue.serverTimestamp();
      await db.collection("referralCodes").doc(referralCode).set({
        code: referralCode,
        ownerId: req.uid,
        usedBy: [],
        createdAt: now,
      });
      await db.collection("users").doc(req.uid).update({ referralCode });
      console.log(`[points-service] Lazily generated referral code ${referralCode} for user ${req.uid}`);
    }

    return res.json({
      success: true,
      balance: data.totalPoints || 0,
      lifetimePoints: data.lifetimePoints || 0,
      tier: data.tier || "bronze",
      referralCode: referralCode,
    });
  } catch (error) {
    console.error("[points-service] Balance error:", error.message);
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/points/history
// Returns paginated points history for the calling user.
// Query params: limit (default 20), startAfter (document ID for pagination)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/history", verifyToken, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const startAfterDocId = req.query.startAfter || null;

  try {
    let query = db
      .collection("pointsLedger")
      .where("userId", "==", req.uid)
      .limit(100); // Fetch up to 100 recent to sort in memory (avoids requiring Firebase composite index)

    if (startAfterDocId) {
      const cursorDoc = await db.collection("pointsLedger").doc(startAfterDocId).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    let docs = snapshot.docs;

    // Sort in memory by createdAt descending to bypass Firebase composite index requirements
    docs.sort((a, b) => {
      const timeA = a.data().createdAt?.toDate()?.getTime() || 0;
      const timeB = b.data().createdAt?.toDate()?.getTime() || 0;
      return timeB - timeA;
    });

    const hasMore = docs.length > limit;
    const slicedDocs = hasMore ? docs.slice(0, limit) : docs;

    const history = slicedDocs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        type: d.type,
        points: d.points,
        reason: d.reason,
        referenceId: d.referenceId || null,
        balanceAfter: d.balanceAfter,
        expiresAt: d.expiresAt || null,
        createdAt: d.createdAt?.toDate?.().toISOString() || null,
      };
    });

    return res.json({ success: true, history, hasMore });
  } catch (error) {
    console.error("[points-service] History error:", error.message);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/redeem
// Deducts points from the user's balance. Validates minimum redemption amount.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/redeem", verifyToken, async (req, res) => {
  const { pointsToRedeem, redemptionType, referenceId, tenantId, stationId } = req.body;

  if (!pointsToRedeem || !redemptionType) {
    return res.status(400).json({ error: "pointsToRedeem and redemptionType are required" });
  }

  const pts = Number(pointsToRedeem);

  try {
    // ── Read config ─────────────────────────────────────────────
    const configDoc = await db.collection("pointsConfig").doc("settings").get();
    if (!configDoc.exists) {
      return res.status(503).json({ error: "Points configuration not available" });
    }
    const config = configDoc.data();
    const minRedemption = config.minRedemptionPoints || 500;
    const pointValue = config.pointValueInRupees || 0.10;

    // ── Validations ─────────────────────────────────────────────
    if (pts < minRedemption) {
      return res.status(400).json({
        error: `Minimum redemption is ${minRedemption} points (₹${(minRedemption * pointValue).toFixed(0)} discount)`,
      });
    }

    const userRef = db.collection("users").doc(req.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const currentTotal = userDoc.data().totalPoints || 0;

    if (currentTotal < pts) {
      return res.status(400).json({ error: "Insufficient points balance" });
    }

    const newBalance = currentTotal - pts;
    const discountAmount = parseFloat((pts * pointValue).toFixed(2));
    const now = admin.firestore.FieldValue.serverTimestamp();
    const ledgerRef = db.collection("pointsLedger").doc();

    // ── Atomic transaction ──────────────────────────────────────
    await db.runTransaction(async (transaction) => {
      transaction.set(ledgerRef, {
        userId: req.uid,
        type: "redeem",
        points: -pts,
        reason: redemptionType,
        referenceId: referenceId || null,
        tenantId: tenantId || null,
        stationId: stationId || null,
        balanceAfter: newBalance,
        createdAt: now,
      });

      transaction.update(userRef, { totalPoints: newBalance });
    });

    console.log(`[points-service] Redeemed ${pts} pts for ${req.uid} (${redemptionType})`);
    return res.json({
      success: true,
      pointsRedeemed: pts,
      discountAmount,
      newBalance,
    });
  } catch (error) {
    console.error("[points-service] Redeem error:", error.message);
    res.status(500).json({ error: "Failed to redeem points", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/points/config
// Public route — returns pointsConfig/settings for frontend display.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/config", async (req, res) => {
  try {
    const configDoc = await db.collection("pointsConfig").doc("settings").get();
    if (!configDoc.exists) {
      return res.status(404).json({ error: "Configuration not found" });
    }
    return res.json({ success: true, ...configDoc.data() });
  } catch (error) {
    console.error("[points-service] Config error:", error.message);
    res.status(500).json({ error: "Failed to fetch configuration" });
  }
});

module.exports = router;
