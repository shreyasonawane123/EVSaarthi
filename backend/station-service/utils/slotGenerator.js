const { db, admin } = require("../config/firebase");

/**
 * Generate slots for the next 7 days based on the station's schedule
 */
async function generateSlotsForStation(stationId) {
  try {
    const stationRef = db.collection("stations").doc(stationId);
    const scheduleSnapshot = await stationRef.collection("schedule").get();
    
    if (scheduleSnapshot.empty) {
      throw new Error("No schedule found for this station");
    }

    // Load schedule into memory
    const scheduleByDay = {};
    scheduleSnapshot.forEach(doc => {
      scheduleByDay[doc.id] = doc.data(); // doc.id should be "Monday", "Tuesday", etc.
    });

    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    
    const today = new Date();
    // We'll declare these once and reuse them properly throughout the function
    let batch = db.batch();
    let batchCount = 0;

    // STEP 1: CLEANUP Phase
    // Wipe all future "available" slots to handle schedule changes (e.g. closing a day)
    // Booked slots stay untouched.
    const datesToClear = [];
    for(let i=0; i<7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const dayStr = String(d.getDate()).padStart(2, '0');
      datesToClear.push(`${year}-${month}-${dayStr}`);
    }

    const existingAvailableSlots = await stationRef.collection("slots")
      .where("status", "==", "available")
      .where("date", "in", datesToClear)
      .get();

    if (!existingAvailableSlots.empty) {
      let cleanupBatch = db.batch();
      let cleanupCount = 0;
      
      for (const doc of existingAvailableSlots.docs) {
        cleanupBatch.delete(doc.ref);
        cleanupCount++;
        
        if (cleanupCount >= 400) {
          await cleanupBatch.commit();
          cleanupBatch = db.batch();
          cleanupCount = 0;
        }
      }
      
      if (cleanupCount > 0) {
        await cleanupBatch.commit();
      }
    }

    // STEP 2: GENERATION Phase
    // The current batch and batchCount are already reset to 0/empty from the cleanup commit above.
    // If cleanup was empty, it's still clean. If it was used, it was reset after commit.

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      
      const dayName = daysOfWeek[targetDate.getDay()];
      const daySchedule = scheduleByDay[dayName];

      if (!daySchedule || !daySchedule.isOpen) {
        continue; // Station is closed on this day
      }

      const { openTime, closeTime, slotDuration } = daySchedule;
      if (!openTime || !closeTime || !slotDuration) continue;

      // Parse open and close times (e.g., "09:00", "22:00")
      const [openHour, openMin] = openTime.split(":").map(Number);
      const [closeHour, closeMin] = closeTime.split(":").map(Number);
      
      const startDateTime = new Date(targetDate);
      startDateTime.setHours(openHour, openMin, 0, 0);
      
      const endDateTime = new Date(targetDate);
      endDateTime.setHours(closeHour, closeMin, 0, 0);

      const year = targetDate.getFullYear();
      const month = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dayStr = String(targetDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${dayStr}`;

      let currentDateTime = startDateTime;
      
      // Calculate individual slots
      while (currentDateTime < endDateTime) {
        const timeString = currentDateTime.toTimeString().substring(0, 5); // "HH:MM"
        const nextDateTime = new Date(currentDateTime.getTime() + slotDuration * 60000);
        
        if (nextDateTime > endDateTime) break; // Don't overflow beyond close time

        const slotId = `${dateString}_${timeString}`;
        const slotRef = stationRef.collection("slots").doc(slotId);
        
        // We need to ONLY create if it doesn't exist, to avoid overwriting booked slots.
        // We can use a trick with update vs set, or just use .get() in a loop to check. 
        // For accurate tracking without overwriting, we read first.
        const slotDoc = await slotRef.get();
        if (!slotDoc.exists) {
            const slotData = {
                date: dateString,
                time: timeString,
                duration: slotDuration,
                status: "available",
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            };
            batch.set(slotRef, slotData);
            batchCount++;
            
            if (batchCount >= 500) {
              await batch.commit();
              batchCount = 0;
            }
        }
        
        currentDateTime = nextDateTime;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return { success: true, message: "Slots generated successfully" };
  } catch (error) {
    console.error("[station-service] Slot generation error:", error.message);
    throw error;
  }
}

module.exports = {
  generateSlotsForStation
};
