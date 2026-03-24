// backend/booking-service/server.js
// EV Saarthi — Booking Service (port 5004)
// Manages slot bookings for charging stations

require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 5004;

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Health check (no auth) ─────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status   : "ok",
    service  : "booking-service",
    port     : PORT,
    timestamp: new Date().toISOString(),
  });
});

// ── Booking routes ─────────────────────────────────────────────
const bookingRoutes = require("./routes/booking");
app.use("/", bookingRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found in booking-service", url: req.url });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[booking-service] Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Booking Service running on http://localhost:${PORT}`);
  console.log(`   POST  /api/booking/create           → Create booking`);
  console.log(`   GET   /api/booking/my-bookings      → User's bookings`);
  console.log(`   PATCH /api/booking/cancel/:id       → Cancel booking`);
  console.log(`   GET   /api/booking/:bookingId       → Single booking`);
});
