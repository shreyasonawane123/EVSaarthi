// backend/auth-service/routes/auth.js
// Auth routes — POST /api/auth/session, POST /api/auth/logout
// Migrated from evsaarthi-backend/routes/auth.js

const express = require("express");
const router = express.Router();
const { adminAuth } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// POST /api/auth/session
// Verifies Firebase ID token from client — returns uid and email
router.post("/session", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token required" });

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    res.json({
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name,
      picture: decodedToken.picture,
    });
  } catch (error) {
    console.error("[auth-service] Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /api/auth/logout
// Client-side logout — Firebase auth is stateless (tokens expire naturally)
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// GET /api/auth/me
// Returns decoded user info from the Bearer token (protected route)
router.get("/me", verifyToken, (req, res) => {
  res.json({
    success: true,
    uid: req.uid,
    email: req.email,
  });
});

// GET /api/auth/health
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "auth-service", port: process.env.PORT || 5001 });
});

module.exports = router;
