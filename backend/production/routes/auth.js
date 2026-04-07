// backend/production/routes/auth.js
const express = require("express");
const router = express.Router();
const { adminAuth } = require("../config/firebase");

// Middleware moved inline for production simplicity or imported from common
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    console.error("[Token Verification Error]:", error.message);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};

router.post("/session", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: "ID token required" });
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    res.json({ success: true, uid: decodedToken.uid, email: decodedToken.email });
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
});

router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", verifyToken, (req, res) => {
  res.json({ success: true, uid: req.uid, email: req.email });
});

module.exports = { router, verifyToken };
