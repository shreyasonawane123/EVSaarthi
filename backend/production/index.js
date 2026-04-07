// backend/production/index.js
// EV Saarthi — Unified Production Backend
// This consolidates all microservices into one single app for easier deployment on Render/Railway.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 5000;

// ── Global Middlewares ───────────────────────────────────────────
app.use(morgan("dev"));
app.use(express.json());
app.use(cors({
    origin: "*", // Adjust for specific production frontend URL once ready
    credentials: true
}));

// ── Health Check ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ev-saarthi-production-backend",
        timestamp: new Date().toISOString()
    });
});

// ── Service Routers ───────────────────────────────────────────────
const { router: authRouter } = require("./routes/auth");
const userRouter = require("./routes/user");
const { router: stationRouter } = require("./routes/stations");
const bookingRouter = require("./routes/booking");
const vehicleRouter = require("./routes/vehicle");
const { router: adminRouter } = require("./routes/admin");

// ── Mount Routes ──────────────────────────────────────────────────
// These match the paths originally used by the API Gateway
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/stations", stationRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/vehicle", vehicleRouter);
app.use("/api/admin", adminRouter);

// ── 404 Handler ───────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: "Route not found in unified production backend" });
});

// ── Start Server ──────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 EV Saarthi Unified Backend running at http://localhost:${PORT}`);
    console.log(`   Unified Endpoints: /api/auth, /api/user, /api/stations, /api/booking, /api/vehicle, /api/admin`);
});
