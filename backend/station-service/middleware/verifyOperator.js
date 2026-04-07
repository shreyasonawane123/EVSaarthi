// backend/station-service/middleware/verifyOperator.js
const { db } = require("../config/firebase");

const verifyOperator = async (req, res, next) => {
  try {
    const operatorDoc = await db.collection("operators").doc(req.uid).get();
    
    if (!operatorDoc.exists) {
      return res.status(403).json({ error: "Access denied. Operator role required." });
    }

    const operatorData = operatorDoc.data();
    req.operator = {
      id: req.uid,
      ...operatorData,
    };
    
    // Fallback if assignedStations is missing
    req.operator.assignedStations = req.operator.assignedStations || [];

    next();
  } catch (error) {
    console.error("[station-service] verifyOperator error:", error.message);
    res.status(500).json({ error: "Failed to verify operator access" });
  }
};

module.exports = verifyOperator;
