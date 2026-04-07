// backend/production/utils/slotGenerator.js
// Logic from station-service/utils/slotGenerator.js
const { db, admin } = require("../config/firebase");

async function generateSlotsForStation(stationId) {
    console.log(`[Production] Generating 7-day slots for station: ${stationId}`);
    try {
        const scheduleSnapshot = await db.collection("stations").doc(stationId).collection("schedule").get();
        if (scheduleSnapshot.empty) {
            console.warn(`[Production] No schedule found for station ${stationId}. Defaulting to Closed.`);
            return { success: false, message: "No schedule found" };
        }

        const schedules = {};
        scheduleSnapshot.forEach(doc => {
            schedules[doc.id] = doc.data();
        });

        const batch = db.batch();
        const now = new Date();
        const slotsCollection = db.collection("stations").doc(stationId).collection("slots");

        for (let i = 0; i < 7; i++) {
            const currentDay = new Date();
            currentDay.setDate(now.getDate() + i);
            const dateStr = currentDay.toISOString().split('T')[0];
            const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'long' });

            const dayConfig = schedules[dayName];
            if (!dayConfig || !dayConfig.isOpen || !dayConfig.openTime || !dayConfig.closeTime) continue;

            const [openH, openM] = dayConfig.openTime.split(':').map(Number);
            const [closeH, closeM] = dayConfig.closeTime.split(':').map(Number);
            const duration = dayConfig.slotDuration || 30;

            let cursor = new Date(currentDay);
            cursor.setHours(openH, openM, 0, 0);
            
            const endTime = new Date(currentDay);
            endTime.setHours(closeH, closeM, 0, 0);

            while (cursor < endTime) {
                const timeStr = cursor.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                const slotId = `${dateStr}_${timeStr.replace(':', '')}`;
                
                const slotRef = slotsCollection.doc(slotId);
                batch.set(slotRef, {
                    date: dateStr,
                    time: timeStr,
                    status: "available",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                cursor.setMinutes(cursor.getMinutes() + duration);
            }
        }

        await batch.commit();
        return { success: true, message: "7-day slots generated successfully" };
    } catch (error) {
        console.error(`[Production] Slot generation failed for ${stationId}:`, error.message);
        throw error;
    }
}

module.exports = { generateSlotsForStation };
