// backend/api-gateway/server.js
// EV Saarthi — API Gateway (port 5000)
// Proxies all /api/* requests to the correct microservice

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    credentials: true,
  })
);

// ── Downstream service URLs ────────────────────────────────────
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:5001";
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5002";
const STATION_SERVICE_URL = process.env.STATION_SERVICE_URL || "http://localhost:5003";
const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || "http://localhost:5004";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL || "http://localhost:5005";
const VEHICLE_SERVICE_URL = process.env.VEHICLE_SERVICE_URL || "http://localhost:5007";
const ADMIN_SERVICE_URL   = process.env.ADMIN_SERVICE_URL   || "http://localhost:5006";

// ── Proxy helpers ─────────────────────────────────────────────
const makeProxy = (target) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    on: {
      error: (err, req, res) => {
        console.error(`[Gateway] Proxy error → ${target}:`, err.message);
        res.status(502).json({
          error: "Service unavailable",
          service: target,
        });
      },
    },
  });

// ── Route → Service mappings ───────────────────────────────────
app.use("/api/auth", makeProxy(AUTH_SERVICE_URL));
app.use("/api/user", makeProxy(USER_SERVICE_URL));
app.use("/api/vehicle", makeProxy(VEHICLE_SERVICE_URL));
app.use("/api/stations", makeProxy(STATION_SERVICE_URL));
app.use("/api/booking", makeProxy(BOOKING_SERVICE_URL));
app.use("/api/analytics", makeProxy(ANALYTICS_SERVICE_URL));
app.use("/api/admin",     makeProxy(ADMIN_SERVICE_URL));

// ── Gateway health check ────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    port: PORT,
    timestamp: new Date().toISOString(),
    routes: {
      "/api/auth": AUTH_SERVICE_URL,
      "/api/user": USER_SERVICE_URL,
      "/api/vehicle": VEHICLE_SERVICE_URL,
      "/api/stations": STATION_SERVICE_URL,
      "/api/booking": BOOKING_SERVICE_URL,
      "/api/analytics": ANALYTICS_SERVICE_URL,
      "/api/admin":     ADMIN_SERVICE_URL,
    },
  });
});

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found in gateway" });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ API Gateway running on http://localhost:${PORT}`);
  console.log(`   /api/auth      → ${AUTH_SERVICE_URL}`);
  console.log(`   /api/user      → ${USER_SERVICE_URL}`);
  console.log(`   /api/vehicle   → ${VEHICLE_SERVICE_URL}`);
  console.log(`   /api/stations  → ${STATION_SERVICE_URL} (Week 3)`);
  console.log(`   /api/booking   → ${BOOKING_SERVICE_URL} (Week 4)`);
  console.log(`   /api/analytics → ${ANALYTICS_SERVICE_URL} (Week 5)`);
  console.log(`   /api/admin     → ${ADMIN_SERVICE_URL}`);
});
