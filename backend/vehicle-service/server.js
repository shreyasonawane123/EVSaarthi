// backend/vehicle-service/server.js
// EV Saarthi — Vehicle Service (port 5007)
// Owns the vehicles/ Firestore collection

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5007;

// ── CORS ──────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from API gateway or any localhost origin
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

// ── Routes ─────────────────────────────────────────────────────
const vehicleRoutes = require("./routes/vehicle");
app.use("/", vehicleRoutes);

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found in vehicle-service", url: req.url });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Vehicle Service running on http://localhost:${PORT}`);
  console.log(`   POST /api/vehicle/save  → Firestore vehicles/{uid}`);
  console.log(`   GET  /api/vehicle/me    → Firestore vehicles/{uid}`);
});
