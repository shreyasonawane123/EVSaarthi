// backend/points-service/routes/referral.js
// Referral code management: generate and validate referral codes

const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const verifyInternalSecret = require("../middleware/verifyInternalSecret");
const { generateCode } = require("../utils/referralGenerator");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/referral/generate
// Called internally (from user-service) on new user profile creation.
// Creates a referral code and links it to the user.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/referral/generate", verifyInternalSecret, async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  try {
    // Check if user already has a referral code
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const existingCode = userDoc.data().referralCode;
    if (existingCode) {
      return res.json({ success: true, code: existingCode, skipped: true });
    }

    // Generate a unique code
    const code = await generateCode();
    const now = admin.firestore.FieldValue.serverTimestamp();

    // Create referralCodes document
    await db.collection("referralCodes").doc(code).set({
      code,
      ownerId: userId,
      usedBy: [],
      createdAt: now,
    });

    // Update user with referral code
    await db.collection("users").doc(userId).update({ referralCode: code });

    console.log(`[points-service] Generated referral code ${code} for user ${userId}`);
    return res.json({ success: true, code });
  } catch (error) {
    console.error("[points-service] Referral generate error:", error.message);
    res.status(500).json({ error: "Failed to generate referral code", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/points/referral/validate
// Called internally (from user-service) when a new user enters a referral code.
// Validates the code, updates the referralCodes doc, and fires award to code owner.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/referral/validate", verifyInternalSecret, async (req, res) => {
  const { referralCode, newUserId } = req.body;

  if (!referralCode || !newUserId) {
    return res.status(400).json({ error: "referralCode and newUserId are required" });
  }

  try {
    const codeDoc = await db.collection("referralCodes").doc(referralCode).get();

    if (!codeDoc.exists) {
      return res.json({ success: false, error: "Invalid referral code" });
    }

    const codeData = codeDoc.data();

    // Cannot use your own referral code
    if (codeData.ownerId === newUserId) {
      return res.json({ success: false, error: "Cannot use your own referral code" });
    }

    // Cannot use a code already used by this user
    if (Array.isArray(codeData.usedBy) && codeData.usedBy.includes(newUserId)) {
      return res.json({ success: false, error: "Referral code already used" });
    }

    // Add newUserId to usedBy array atomically
    await db.collection("referralCodes").doc(referralCode).update({
      usedBy: admin.firestore.FieldValue.arrayUnion(newUserId),
    });

    // Fire-and-forget: give the code owner their referral_bonus points
    const axios = require("axios");
    axios.post(
      `${process.env.POINTS_SERVICE_URL}/api/points/award`,
      {
        userId: codeData.ownerId,
        reason: "referral_bonus",
        points: 200,
        referenceId: newUserId,
        checkDuplicate: true,
        duplicateKey: `referral_bonus_${codeData.ownerId}_${newUserId}`,
      },
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
    ).catch((err) =>
      console.error("[points-service] Referral bonus award failed:", err.message)
    );

    console.log(`[points-service] Referral ${referralCode} validated for new user ${newUserId}`);
    return res.json({ success: true, message: "Referral applied successfully" });
  } catch (error) {
    console.error("[points-service] Referral validate error:", error.message);
    res.status(500).json({ error: "Failed to validate referral code", details: error.message });
  }
});

module.exports = router;
