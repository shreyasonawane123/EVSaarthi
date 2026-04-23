// backend/booking-service/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 5004;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.startsWith("http://localhost")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS: " + origin));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", service: "booking-service" }));

// Routes
const bookingRoutes = require("./routes/booking");
// Mount both ways for Gateway compatibility
app.use("/", bookingRoutes);
app.use("/api/booking", bookingRoutes);

// 404 handler

// ── Auto-complete Logic ──────────────────────────────────────────
const { db, admin } = require("./config/firebase");

setInterval(async () => {
  try {
    const now = new Date();
    const snapshot = await db.collection("bookings").where("status", "==", "confirmed").get();

    for (const doc of snapshot.docs) {
      try {
        const booking = doc.data();
        if (!booking.slotDate || !booking.slotTime) continue;

        // Construct end time in IST (+05:30)
        const endTime = new Date(`${booking.slotDate}T${booking.slotTime}:00+05:30`);
        endTime.setMinutes(endTime.getMinutes() + (Number(booking.duration) || 0));

        if (now > endTime) {
          // 1. Update Booking
          await db.collection("bookings").doc(doc.id).update({
            status: "completed",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // 2. Update Station
          const stationRef = db.collection("stations").doc(booking.stationId);
          const stationDoc = await stationRef.get();
          
          if (stationDoc.exists) {
            const station = stationDoc.data();
            const newAvailable = (station.availableSlots || 0) + 1;
            
            let newStatus = "open";
            if (newAvailable === 0) newStatus = "full";
            else if (newAvailable <= 2) newStatus = "filling";

            await stationRef.update({
              availableSlots: newAvailable,
              status: newStatus,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`[booking-service] Booking ${doc.id} completed. Station ${booking.stationId} availableSlots → ${newAvailable}`);
          }
        }
      } catch (err) {
        console.error(`[booking-service] Error processing booking ${doc.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error("[booking-service] Auto-complete interval failed:", err.message);
  }
}, 5 * 60 * 1000); // 5 minutes

app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({
    error: "Route not found in booking-service",
    url: req.url,
    method: req.method
  });
});

app.listen(PORT, () => {
  console.log(`✅ Booking Service running on http://localhost:${PORT}`);
});
