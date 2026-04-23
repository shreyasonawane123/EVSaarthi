// backend/points-service/middleware/verifyInternalSecret.js
// Protects internal-only routes called by other microservices.
// Checks the x-internal-secret header against process.env.INTERNAL_SECRET.

const verifyInternalSecret = (req, res, next) => {
  const secret = req.headers["x-internal-secret"];

  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    console.warn("[points-service] Forbidden: invalid or missing internal secret.");
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};

module.exports = verifyInternalSecret;
