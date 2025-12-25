// routes/room-join-rentfee.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// left join rooms + rentfee
router.get('/', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT rooms.*, rentfee.tenantName, rentfee.rentStart, rentfee.rentEnd, rentfee.rentfee, rentfee.isPaid
      FROM rooms
      LEFT JOIN rentfee ON rooms.roomNo = rentfee.roomNo
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
