require("dotenv").config();
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const axios = require("axios");
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// ── Razorpay Setup ───────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SXwCfEf5EfAy8k",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "CyzezCv4toXmNUofZi5QmvO4",
});

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// POST /payment/order
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/order", verifyToken, async (req, res) => {
  try {
    const { stationId, duration, recaptchaToken } = req.body;
    
    // Basic reCAPTCHA check (boolean check as per instructions)
    if (!recaptchaToken) {
      return res.status(400).json({ error: "reCAPTCHA verification required" });
    }

    const stationDoc = await db.collection("stations").doc(stationId).get();
    if (!stationDoc.exists) return res.status(404).json({ error: "Station not found" });
    const station = stationDoc.data();
    
    if (station.availableSlots <= 0) return res.status(400).json({ error: "No slots" });

    // ── Points discount (optional) ────────────────────────────
    const baseCost = parseFloat(
      ((Number(duration) / 60) * (Number(station.pricePerUnit) || 10)).toFixed(2)
    );

    let discount = 0;
    const { pointsToRedeem } = req.body;

    if (pointsToRedeem && Number(pointsToRedeem) > 0) {
      try {
        const configRes = await axios.get(
          `${process.env.POINTS_SERVICE_URL}/api/points/config`
        );
        const config = configRes.data;
        const balanceRes = await axios.get(
          `${process.env.POINTS_SERVICE_URL}/api/points/balance`,
          { headers: { Authorization: req.headers.authorization } }
        );
        const userBalance = balanceRes.data.balance || 0;
        const pts = Number(pointsToRedeem);

        if (
          pts >= config.minRedemptionPoints &&
          userBalance >= pts
        ) {
          discount = parseFloat((pts * config.pointValueInRupees).toFixed(2));
        }
      } catch (err) {
        console.error("[booking] Points discount check failed:", err.message);
        // Continue without discount if points-service is down
      }
    }

    const totalCost = parseFloat(Math.max(0, baseCost - discount).toFixed(2));

    const order = await razorpay.orders.create({
      amount: Math.round(totalCost * 100),
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    });

    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, totalCost, discount });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /payment/verify
// ─────────────────────────────────────────────────────────────────────────────
router.post("/payment/verify", verifyToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, stationId, slotDate, slotTime, duration } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "CyzezCv4toXmNUofZi5QmvO4").update(body).digest("hex");

    if (expected !== razorpay_signature) return res.status(400).json({ error: "Invalid signature" });

    const result = await db.runTransaction(async (transaction) => {
      const stationRef = db.collection("stations").doc(stationId);
      const stationDoc = await transaction.get(stationRef);
      const station = stationDoc.data();

      if (station.availableSlots <= 0) throw new Error("Station is full");

      const bookingRef = db.collection("bookings").doc();
      const now = admin.firestore.FieldValue.serverTimestamp();
      const totalCost = parseFloat(((Number(duration) / 60) * (Number(station.pricePerUnit) || 10)).toFixed(2));

      const bookingData = {
        userId: req.uid, stationId, stationName: station.name || "", slotDate, slotTime,
        duration: Number(duration), status: "confirmed", totalCost, razorpay_order_id, razorpay_payment_id,
        pointsAwarded: false,
        createdAt: now, updatedAt: now,
      };

      transaction.set(bookingRef, bookingData);
      transaction.update(stationRef, { availableSlots: station.availableSlots - 1, updatedAt: now });

      // ── NEW: Mark specific slot as booked ──
      const slotId = `${slotDate}_${slotTime}`;
      const slotRef = db.collection("stations").doc(stationId).collection("slots").doc(slotId);
      transaction.update(slotRef, { status: "booked", updatedAt: now });

      return { bookingId: bookingRef.id, station };
    });

    const { bookingId, station } = result;

    // Calculate points: (duration_min / 60) * points_per_hour
    // Handle cases where approvedPointsPerHour might be a string (e.g. "25 pts/hr")
    const rawRate = station.approvedPointsPerHour;
    const hourlyRate = (typeof rawRate === 'string') 
      ? (parseInt(rawRate.replace(/[^0-9]/g, '')) || 50)
      : (Number(rawRate) || 50);
      
    const sessionPoints = Math.round((Number(duration) / 60) * hourlyRate);

    // Fire-and-forget: award session completion points
    axios.post(
      `${process.env.POINTS_SERVICE_URL}/api/points/award`,
      {
        userId: req.uid,
        reason: "session_completed",
        points: sessionPoints,
        referenceId: bookingId,
        checkDuplicate: true,
        duplicateKey: bookingId,
      },
      { headers: { "x-internal-secret": process.env.INTERNAL_SECRET } }
    ).catch((err) => console.error("[booking-service] Session points failed:", err.message));

    // Deduct redeemed points if used
    const { pointsToRedeem } = req.body;
    if (pointsToRedeem && Number(pointsToRedeem) > 0) {
      axios.post(
        `${process.env.POINTS_SERVICE_URL}/api/points/redeem`,
        {
          pointsToRedeem: Number(pointsToRedeem),
          redemptionType: "charging_discount",
          referenceId: bookingId,
        },
        { headers: { Authorization: req.headers.authorization } }
      ).catch((err) => console.error("[booking] Points deduction failed:", err.message));
    }

    res.status(201).json({ success: true, booking: { bookingId } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Existing Routes
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").where("userId", "==", req.uid).get();
    const bookings = snapshot.docs.map(doc => ({ bookingId: doc.id, ...doc.data() }));
    // Sort manually if index is missing
    bookings.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    res.json({ success: true, bookings });
  } catch (e) { 
    console.error("[my-bookings] Error:", e.message);
    res.status(500).json({ error: e.message }); 
  }
});


router.get("/:bookingId", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("bookings").doc(req.params.bookingId).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, booking: { bookingId: doc.id, ...doc.data() } });
  } catch (e) { 
    console.error("[get-booking] Error:", e.message);
    res.status(500).json({ error: e.message }); 
  }
});

router.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = router;
