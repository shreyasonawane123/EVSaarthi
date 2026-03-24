// backend/admin-service/middleware/verifyAdmin.js
// Runs AFTER verifyToken — checks adminUsers/ collection in Firestore
// Only "admin" or "superadmin" role can proceed

const { db } = require("../config/firebase");

const verifyAdmin = async (req, res, next) => {
  try {
    const adminDoc = await db.collection("adminUsers").doc(req.uid).get();

    if (!adminDoc.exists) {
      return res.status(403).json({
        error: "Access denied. You are not an admin.",
      });
    }

    const data = adminDoc.data();
    if (data.role !== "admin" && data.role !== "superadmin") {
      return res.status(403).json({
        error: "Access denied. Insufficient role.",
      });
    }

    req.adminRole = data.role;
    req.adminName = data.name;
    next();
  } catch (error) {
    console.error("[admin-service] Admin verification failed:", error.message);
    res.status(500).json({ error: "Admin check failed" });
  }
};

module.exports = verifyAdmin;
