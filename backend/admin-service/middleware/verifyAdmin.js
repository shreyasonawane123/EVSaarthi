// backend/admin-service/middleware/verifyAdmin.js
// Runs AFTER verifyToken — checks adminUsers/ collection in Firestore
// Only "admin" or "superadmin" role can proceed

const { db } = require("../config/firebase");

const verifyAdmin = async (req, res, next) => {
  try {
    let adminDoc = await db.collection("adminUsers").doc(req.uid).get();
    let data;

    if (adminDoc.exists) {
      data = adminDoc.data();
    } else {
      // Not in adminUsers, check operators collection
      const operatorDoc = await db.collection("operators").doc(req.uid).get();
      if (operatorDoc.exists) {
        data = operatorDoc.data();
      } else {
        return res.status(403).json({
          error: "Access denied. You are not authorized for this portal.",
        });
      }
    }

    if (data.role !== "admin" && data.role !== "superadmin" && data.role !== "operator") {
      return res.status(403).json({
        error: "Access denied. Insufficient role.",
      });
    }

    req.adminRole = data.role;
    req.adminName = data.name;
    req.tenantId = data.tenantId || null;
    req.stationId = data.stationId || null;
    next();
  } catch (error) {
    console.error("[admin-service] Admin verification failed:", error.message);
    res.status(500).json({ error: "Admin check failed" });
  }
};

module.exports = verifyAdmin;
