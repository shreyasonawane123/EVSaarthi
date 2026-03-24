// backend/auth-service/server.js
// EV Saarthi — Auth Service (port 5001)

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5001;

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:5000,http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed: " + origin));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
app.use("/", authRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found in auth-service" });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[auth-service] Error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ auth-service running on http://localhost:${PORT}`);
});
