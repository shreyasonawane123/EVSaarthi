// backend/station-service/server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5003;

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

// Routes
const stationsRoutes = require("./routes/stations");
const operatorsRoutes = require("./routes/operators");

app.use("/api/operators", operatorsRoutes);
app.use("/api/stations", stationsRoutes);
// 404
app.use((req, res) => {
  console.log(`[404] ${req.method} ${req.url}`);
  res.status(404).json({ error: "Route not found in station-service", url: req.url });
});

// Start
app.listen(PORT, () => {
  console.log(`✅ Station Service running on http://localhost:${PORT}`);
  console.log(`   GET /api/stations/all    → Fetch active stations`);
  console.log(`   GET /api/stations/nearby → Fetch by lat/lng/radius`);
  console.log(`   GET /api/stations/:id    → Single station detail`);
  console.log(`   GET /api/stations/health → Health check`);
});
