// backend/booking-service/routes/booking.js
// EV Saarthi — Booking Routes
// POST   /api/booking/create
// GET    /api/booking/my-bookings
// PATCH  /api/booking/cancel/:bookingId
// GET    /api/booking/:bookingId

const express     = require("express");
const router      = express.Router();
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/booking/create
// ─────────────────────────────────────────────────────────────────────────────
router.post("/create", verifyToken, async (req, res) => {
  const { stationId, slotDate, slotTime, duration } = req.body;

  // Validate
  if (!stationId || !slotDate || !slotTime || !duration) {
    return res.status(400).json({
      error: "Missing required fields: stationId, slotDate, slotTime, duration",
    });
  }

  const durationNum = Number(duration);
  if (![30, 60, 120].includes(durationNum)) {
    return res.status(400).json({ error: "duration must be 30, 60, or 120 minutes" });
  }

  try {
    // 1. Get station
    const stationRef = db.collection("stations").doc(stationId);
    const stationDoc = await stationRef.get();
    if (!stationDoc.exists) {
      return res.status(404).json({ error: "Station not found" });
    }
    const station = stationDoc.data();

    // 2. Check available slots
    if (!station.isActive) {
      return res.status(400).json({ error: "Station is not active" });
    }
    if (station.availableSlots <= 0) {
      return res.status(400).json({ error: "No slots available at this station" });
    }

    // 3. Check for conflicting booking at same station, date, time
    const conflictSnap = await db
      .collection("bookings")
      .where("stationId", "==", stationId)
      .where("slotDate", "==", slotDate)
      .where("slotTime", "==", slotTime)
      .where("status", "==", "confirmed")
      .get();

    if (!conflictSnap.empty) {
      return res.status(400).json({
        error: "That time slot is already booked. Please choose a different time.",
      });
    }

    // 4. Get user's vehicle info for the booking document
    let vehicleModel   = "";
    let connectorType  = "";
    let batteryCapacity = 40; // default fallback kWh

    const vehicleDoc = await db.collection("vehicles").doc(req.uid).get();
    if (vehicleDoc.exists) {
      const v = vehicleDoc.data();
      vehicleModel    = `${v.vehicleBrand || ""} ${v.vehicleModel || ""}`.trim();
      connectorType   = v.connectorType || "";
      batteryCapacity = v.batteryCapacity ? Number(v.batteryCapacity) : 40;
    }

    // 5. Calculate total cost
    // Formula: (duration / 60) * pricePerUnit * (batteryCapacity / 100)
    const pricePerUnit = Number(station.pricePerUnit) || 10;
    const totalCost    = parseFloat(
      ((durationNum / 60) * pricePerUnit * (batteryCapacity / 100)).toFixed(2)
    );

    // 6. Create booking document
    const now = admin.firestore.FieldValue.serverTimestamp();
    const bookingData = {
      userId        : req.uid,
      stationId     : stationId,
      stationName   : station.name   || "",
      stationAddress: station.address || "",
      stationCity   : station.city   || "",
      slotDate,
      slotTime,
      duration      : durationNum,
      status        : "confirmed",
      vehicleModel,
      connectorType,
      totalCost,
      createdAt     : now,
      updatedAt     : now,
    };

    const bookingRef = await db.collection("bookings").add(bookingData);

    // 7. Reduce station availableSlots by 1
    const newSlots = station.availableSlots - 1;
    const newStatus =
      newSlots === 0 ? "full" : newSlots <= 2 ? "filling" : "open";

    await stationRef.update({
      availableSlots: newSlots,
      status        : newStatus,
      updatedAt     : now,
    });

    return res.status(201).json({
      success  : true,
      bookingId: bookingRef.id,
      message  : "Slot booked successfully!",
      booking  : {
        bookingId: bookingRef.id,
        ...bookingData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[booking-service] Create booking error:", error.message);
    res.status(500).json({ error: "Failed to create booking", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/booking/my-bookings
// Returns all bookings for the current user, sorted by createdAt desc
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-bookings", verifyToken, async (req, res) => {
  try {
    const snapshot = await db
      .collection("bookings")
      .where("userId", "==", req.uid)
      .get();

    const bookings = snapshot.docs.map((doc) => ({
      bookingId: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.().toISOString() || null,
    }));
    
    // Sort in memory to avoid requiring a Firebase composite index
    bookings.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("[booking-service] Get my-bookings error:", error.message);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/booking/cancel/:bookingId
// Cancels a booking and restores the station slot
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/cancel/:bookingId", verifyToken, async (req, res) => {
  const { bookingId } = req.params;

  try {
    const bookingRef = db.collection("bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingDoc.data();

    // 1. Verify booking belongs to the requesting user
    if (booking.userId !== req.uid) {
      return res.status(403).json({ error: "Not authorised to cancel this booking" });
    }

    // 2. Check it's still confirmed
    if (booking.status !== "confirmed") {
      return res.status(400).json({
        error: `Cannot cancel a booking with status "${booking.status}"`,
      });
    }

    const now = admin.firestore.FieldValue.serverTimestamp();

    // 3. Update booking status
    await bookingRef.update({ status: "cancelled", updatedAt: now });

    // 4. Restore station slot
    const stationRef = db.collection("stations").doc(booking.stationId);
    const stationDoc = await stationRef.get();

    if (stationDoc.exists) {
      const station  = stationDoc.data();
      const newSlots = (station.availableSlots || 0) + 1;
      const newStatus =
        newSlots === 0 ? "full" : newSlots <= 2 ? "filling" : "open";

      await stationRef.update({
        availableSlots: newSlots,
        status        : newStatus,
        updatedAt     : now,
      });
    }

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("[booking-service] Cancel booking error:", error.message);
    res.status(500).json({ error: "Failed to cancel booking", details: error.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/booking/:bookingId
// Returns a single booking — must belong to the requesting user
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:bookingId", verifyToken, async (req, res) => {
  const { bookingId } = req.params;

  try {
    const bookingDoc = await db.collection("bookings").doc(bookingId).get();

    if (!bookingDoc.exists) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingDoc.data();

    if (booking.userId !== req.uid) {
      return res.status(403).json({ error: "Not authorised to view this booking" });
    }

    res.json({
      success: true,
      booking: {
        bookingId: bookingDoc.id,
        ...booking,
        createdAt: booking.createdAt?.toDate?.().toISOString() || null,
        updatedAt: booking.updatedAt?.toDate?.().toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[booking-service] Get booking error:", error.message);
    res.status(500).json({ error: "Failed to fetch booking" });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ status: "ok", service: "booking-service", port: process.env.PORT || 5004 });
});

module.exports = router;
