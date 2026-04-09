// backend/production/routes/booking.js
const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { db, admin } = require("../config/firebase");
const { verifyToken } = require("./auth");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_SXwCfEf5EfAy8k",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "CyzezCv4toXmNUofZi5QmvO4",
});

router.post("/payment/order", verifyToken, async (req, res) => {
  try {
    const { stationId, duration, recaptchaToken } = req.body;
    if (!recaptchaToken) return res.status(400).json({ error: "reCAPTCHA verification required" });
    const stationDoc = await db.collection("stations").doc(stationId).get();
    if (!stationDoc.exists) return res.status(404).json({ error: "Station not found" });
    const station = stationDoc.data();
    if (station.availableSlots <= 0) return res.status(400).json({ error: "No slots" });
    const totalCost = parseFloat(((Number(duration) / 60) * (Number(station.pricePerUnit) || 10)).toFixed(2));
    const order = await razorpay.orders.create({ amount: Math.round(totalCost * 100), currency: "INR", receipt: `rcpt_${Date.now()}` });
    res.json({ success: true, orderId: order.id, amount: order.amount, currency: order.currency, totalCost });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
        duration: Number(duration), status: "confirmed", totalCost, razorpay_order_id, razorpay_payment_id, createdAt: now, updatedAt: now,
      };
      transaction.set(bookingRef, bookingData);
      transaction.update(stationRef, { availableSlots: station.availableSlots - 1, updatedAt: now });
      return { bookingId: bookingRef.id };
    });
    res.status(201).json({ success: true, booking: result });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const snapshot = await db.collection("bookings").where("userId", "==", req.uid).get();
    const bookings = snapshot.docs.map(doc => ({ bookingId: doc.id, ...doc.data() }));
    bookings.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    res.json({ success: true, bookings });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch("/cancel/:bookingId", verifyToken, async (req, res) => {
  try {
    const br = db.collection("bookings").doc(req.params.bookingId);
    const bd = await br.get(); if (!bd.exists) return res.status(404).json({ error: "Booking not found" });
    const now = admin.firestore.FieldValue.serverTimestamp();
    await br.update({ status: "cancelled", updatedAt: now });
    const sr = db.collection("stations").doc(bd.data().stationId);
    const sd = await sr.get(); if (sd.exists) await sr.update({ availableSlots: (sd.data().availableSlots || 0) + 1, updatedAt: now });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get("/:bookingId", verifyToken, async (req, res) => {
  try {
    const doc = await db.collection("bookings").doc(req.params.bookingId).get();
    if (!doc.exists) return res.status(404).json({ error: "Not found" });
    res.json({ success: true, booking: { bookingId: doc.id, ...doc.data() } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { router };
