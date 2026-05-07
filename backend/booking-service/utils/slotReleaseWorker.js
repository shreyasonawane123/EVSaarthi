const { db, admin } = require("../config/firebase");

/**
 * Background worker that checks for expired bookings and releases slots.
 * It marks bookings as "completed" and increments the station's availableSlots.
 */
async function releaseExpiredSlots() {
  try {
    const now = new Date();
    
    // 1. Fetch all confirmed bookings
    const bookingsSnapshot = await db.collection("bookings")
      .where("status", "==", "confirmed")
      .get();

    if (bookingsSnapshot.empty) return;

    console.log(`[slot-worker] Checking ${bookingsSnapshot.size} active bookings...`);

    for (const doc of bookingsSnapshot.docs) {
      const booking = doc.data();
      const { slotDate, slotTime, duration, stationId } = booking;

      if (!slotDate || !slotTime || !duration) {
        console.log(`[slot-worker] Skipping booking ${doc.id} due to missing fields.`);
        continue;
      }

      // Ensure slotTime is HH:MM format (add leading zero if needed like "9:00" -> "09:00")
      let formattedTime = slotTime;
      if (slotTime.length === 4 && slotTime.includes(":")) {
        formattedTime = "0" + slotTime;
      }

      // Create a Date object for the slot end time (IST +05:30)
      const endDateTime = new Date(`${slotDate}T${formattedTime}:00+05:30`);
      
      if (isNaN(endDateTime.getTime())) {
        console.warn(`[slot-worker] Invalid date generated for booking ${doc.id}: ${slotDate}T${formattedTime}`);
        continue;
      }

      endDateTime.setMinutes(endDateTime.getMinutes() + (Number(duration) || 0));

      const isExpired = now > endDateTime;
      
      console.log(`[slot-worker] Booking ${doc.id}: EndTime=${endDateTime.toLocaleTimeString()} | Now=${now.toLocaleTimeString()} | Expired=${isExpired}`);

      // 2. Check if the booking has expired
      if (isExpired) {
        console.log(`[slot-worker] 🚀 Releasing expired booking ${doc.id} for station ${stationId}`);

        try {
          await db.runTransaction(async (transaction) => {
            const bookingRef = doc.ref;
            const stationRef = db.collection("stations").doc(stationId);
            const stationDoc = await transaction.get(stationRef);

            if (!stationDoc.exists) {
              console.warn(`[slot-worker] Station ${stationId} not found, marking booking as completed anyway.`);
              transaction.update(bookingRef, { status: "completed", updatedAt: admin.firestore.FieldValue.serverTimestamp() });
              return;
            }

            const station = stationDoc.data();
            const currentSlots = station.availableSlots || 0;
            const totalSlots = station.totalSlots || 5;
            const newAvailable = Math.min(totalSlots, currentSlots + 1);

            // Update booking status
            transaction.update(bookingRef, { 
              status: "completed", 
              updatedAt: admin.firestore.FieldValue.serverTimestamp() 
            });

            // Increment station's available slots
            transaction.update(stationRef, { 
              availableSlots: newAvailable,
              updatedAt: admin.firestore.FieldValue.serverTimestamp() 
            });
            
            console.log(`[slot-worker] ✅ Successfully released. Station slots: ${currentSlots} -> ${newAvailable}`);
          });
        } catch (txError) {
          console.error(`[slot-worker] Transaction failed for ${doc.id}:`, txError.message);
        }
      }
    }
  } catch (error) {
    console.error("[slot-worker] Error in slot release worker:", error.message);
  }
}

/**
 * Start the background worker
 * @param {number} intervalMs - How often to run the check (default 1 minute)
 */
function startSlotReleaseWorker(intervalMs = 60000) {
  console.log(`[slot-worker] Starting background worker every ${intervalMs / 1000}s...`);
  
  // Run immediately on start
  releaseExpiredSlots();
  
  // Then run on interval
  setInterval(releaseExpiredSlots, intervalMs);
}

module.exports = { startSlotReleaseWorker };
