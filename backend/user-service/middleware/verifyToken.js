// backend/user-service/middleware/verifyToken.js
// Verifies Firebase Bearer token — same logic as original verifySession.js

const { adminAuth } = require("../config/firebase");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    req.email = decodedToken.email;
    next();
  } catch (error) {
    console.error("[user-service] Token verification failed:", error.message);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = verifyToken;
