// routes/room-join-tenant.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// left join rooms + tenant (僅抓有效租客)
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT 
        rooms.*,
        tenant.name AS tenantName,
        tenant.phone AS tenantPhone,
        tenant.rentStart,
        tenant.rentEnd,
        tenant.rentfee,
        tenant.deposit,
        tenant.isActive AS tenantIsActive,
        tenant.isPaid AS tenantIsPaid,
        tenant.note AS tenantNote
      FROM rooms
      LEFT JOIN tenant ON rooms.roomNo = tenant.roomNo AND tenant.isActive=1
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
