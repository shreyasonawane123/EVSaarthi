// backend/admin-service/server.js
// EV Saarthi — Admin Service (port 5006)
// Manages stations CRUD and user/stats queries for admin panel

require("dotenv").config();
const express = require("express");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 5006;

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

// ── Health check (no auth required) ───────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status   : "ok",
    service  : "admin-service",
    port     : PORT,
    timestamp: new Date().toISOString(),
  });
});

// ── Admin routes ───────────────────────────────────────────────
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
app.use("/", adminRoutes); // Keep base mount for direct access safety

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found in admin-service", url: req.url });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Admin Service running on http://localhost:${PORT}`);
  console.log(`   GET    /api/admin/stations           → All stations`);
  console.log(`   POST   /api/admin/stations/add       → Add station + geocode`);
  console.log(`   PUT    /api/admin/stations/:id       → Edit station`);
  console.log(`   DELETE /api/admin/stations/:id       → Delete station`);
  console.log(`   PATCH  /api/admin/stations/:id/toggle → Toggle active`);
  console.log(`   PATCH  /api/admin/stations/:id/slots  → Update slots`);
  console.log(`   GET    /api/admin/users              → All users`);
  console.log(`   GET    /api/admin/stats              → Dashboard stats`);
});
