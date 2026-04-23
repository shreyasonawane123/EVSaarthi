// backend/points-service/utils/referralGenerator.js
// Generates unique referral codes in the format EV-XXXXXX

const { db } = require("../config/firebase");

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomCode() {
  let code = "EV-";
  for (let i = 0; i < 6; i++) {
    code += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  return code;
}

/**
 * Generates a unique referral code by checking Firestore for collisions.
 * Retries up to 10 times before throwing.
 * @returns {Promise<string>} e.g. "EV-X7K2P9"
 */
async function generateCode() {
  let attempts = 0;
  while (attempts < 10) {
    const code = randomCode();
    const doc = await db.collection("referralCodes").doc(code).get();
    if (!doc.exists) {
      return code;
    }
    attempts++;
  }
  throw new Error("Failed to generate a unique referral code after 10 attempts.");
}

module.exports = { generateCode };
