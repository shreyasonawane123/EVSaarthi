// backend/points-service/utils/tierCalculator.js
// Calculates the user tier based on lifetime points earned.

/**
 * Returns the tier string for a given lifetime points total.
 * @param {number} lifetimePoints
 * @returns {"gold" | "silver" | "bronze"}
 */
function calculateTier(lifetimePoints) {
  if (lifetimePoints >= 2000) return "gold";
  if (lifetimePoints >= 500) return "silver";
  return "bronze";
}

module.exports = { calculateTier };
