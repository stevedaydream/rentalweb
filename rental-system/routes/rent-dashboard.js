const express = require('express');
const router = express.Router();
const db = require('../db');

// 取得本月所有未繳租金或電費的租客
router.get('/', (req, res) => {
  const { month } = req.query; // 例如 '2024-07'
  try {
    const rows = db.prepare(`
      SELECT 
        rooms.roomNo,
        rooms.description AS roomDesc,
        tenant.tenantId,
        tenant.name AS tenantName,
        tenant.phone,
        tenant.rentfee,
        tenant.isPaid AS rentPaid,
        electricity.id AS elecId,
        electricity.amount AS elecAmount,
        electricity.isPaid AS elecPaid
      FROM rooms
      LEFT JOIN tenant ON rooms.roomNo = tenant.roomNo AND tenant.isActive=1
      LEFT JOIN electricity ON rooms.roomNo = electricity.roomNo AND electricity.period = ?
      WHERE (tenant.isPaid=0 OR electricity.isPaid=0)
    `).all(month);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
