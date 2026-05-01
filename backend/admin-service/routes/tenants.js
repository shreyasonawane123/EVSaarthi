// backend/admin-service/routes/tenants.js
const express = require("express");
const router = express.Router();
const { db, admin } = require("../config/firebase");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin");

// Apply middlewares to all tenant routes
router.use(verifyToken);
router.use(verifyAdmin);

// Require superadmin for all tenant creations/deletions
const requireSuperadmin = (req, res, next) => {
  if (req.adminRole !== "superadmin") {
    return res.status(403).json({ error: "Access denied. Action strictly requires superadmin privileges." });
  }
  next();
};

// GET /api/tenants
router.get("/", async (req, res) => {
  try {
    let snapshot;
    if (req.adminRole === "superadmin") {
        snapshot = await db.collection("tenants").orderBy("createdAt", "desc").get();
    } else {
        // Normal admins should strictly only be able to view their own tenant info
        if (!req.tenantId) {
            return res.json({ success: true, tenants: [] });
        }
        const doc = await db.collection("tenants").doc(req.tenantId).get();
        if (doc.exists) {
            return res.json({ success: true, tenants: [{ id: doc.id, ...doc.data() }] });
        }
        return res.json({ success: true, tenants: [] });
    }

    const tenants = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null
    }));

    res.json({ success: true, tenants });
  } catch (error) {
    console.error("[admin-service] Fetch tenants error:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

// POST /api/tenants
router.post("/", requireSuperadmin, async (req, res) => {
  const { name, contactEmail, contactPerson, contactPhone, password, greenPointsEnabled } = req.body;
  if (!name) return res.status(400).json({ error: "Tenant name is required" });

  try {
    const tenantData = {
      name,
      contactEmail: contactEmail || "",
      contactPerson: contactPerson || "",
      contactPhone: contactPhone || "",
      password: password || "",
      greenPointsEnabled: greenPointsEnabled !== false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Auto-generate ID via add()
    const docRef = await db.collection("tenants").add(tenantData);
    
    res.json({ success: true, tenant: { id: docRef.id, ...tenantData } });
  } catch (error) {
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

// PUT /api/tenants/:id
router.put("/:id", requireSuperadmin, async (req, res) => {
  const { name, contactEmail, contactPerson, contactPhone, password, greenPointsEnabled } = req.body;
  
  try {
    const updateData = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
    if (name !== undefined) updateData.name = name;
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
    if (contactPerson !== undefined) updateData.contactPerson = contactPerson;
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
    if (password !== undefined) updateData.password = password;
    if (greenPointsEnabled !== undefined) updateData.greenPointsEnabled = greenPointsEnabled;

    await db.collection("tenants").doc(req.params.id).update(updateData);
    res.json({ success: true, message: "Tenant updated" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

module.exports = router;
