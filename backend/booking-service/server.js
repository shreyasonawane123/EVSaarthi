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
