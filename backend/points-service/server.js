// backend/points-service/server.js
// EV Saarthi — Green Points Service (port 5008)

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5008;

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));

app.use(express.json());

// ── Routes ─────────────────────────────────────────────────────
const pointsRouter = require("./routes/points");
const referralRouter = require("./routes/referral");
const accessoriesRouter = require("./routes/accessories");

app.use("/api/points", pointsRouter);
app.use("/api/points", referralRouter);
app.use("/api/points", accessoriesRouter);

// ── Health check ───────────────────────────────────────────────
app.get("/api/points/health", (req, res) => {
  res.json({ status: "ok", service: "points-service", port: PORT });
});

// ── 404 ────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`[points-service] 404 on ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found in points-service", url: req.originalUrl });
});

// ── Global error handler ───────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[points-service] Unhandled error:", err.message, err.stack);
  res.status(500).json({ error: "Internal server error", details: err.message, stack: err.stack });
});

// ── Bootstrap: initialize pointsConfig/settings if missing ─────
async function initializePointsConfig() {
  try {
    const { db, admin } = require("./config/firebase");
    const configRef = db.collection("pointsConfig").doc("settings");
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      console.log("[points-service] pointsConfig/settings not found — initializing defaults...");
      await configRef.set({
        pointValueInRupees: 0.10,
        minRedemptionPoints: 500,
        onboardingBonus: 100,
        sessionCompletionBonus: 50,
        reviewBonus: 20,
        referralBonus: 200,
        purchasePricePerPoint: 0.50,
        minPointsPurchase: 1000,
        pointsExpiryDays: 365,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: "system",
      });
      console.log("[points-service] ✅ pointsConfig/settings initialized with defaults.");
    } else {
      console.log("[points-service] pointsConfig/settings found — skipping initialization.");
    }
  } catch (err) {
    console.error("[points-service] Failed to initialize pointsConfig:", err.message);
    // Non-fatal — service continues running
  }
}

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ points-service running on http://localhost:${PORT}`);
  await initializePointsConfig();
});
