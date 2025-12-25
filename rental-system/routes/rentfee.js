// routes/rentfee.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 取得全部租金資料
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM rentfee').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 取得單一房間的租金資料
router.get('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  try {
    const row = db.prepare('SELECT * FROM rentfee WHERE roomNo = ?').get(roomNo);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新增租金紀錄
router.post('/', (req, res) => {
  const { roomNo, tenantName, rentStart, rentEnd, rentfee, isPaid } = req.body;
  try {
    db.prepare(`
      INSERT INTO rentfee (roomNo, tenantName, rentStart, rentEnd, rentfee, isPaid)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(roomNo, tenantName, rentStart, rentEnd, rentfee, isPaid ? 1 : 0);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新租金紀錄（依 roomNo）
router.put('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  const { tenantName, rentStart, rentEnd, rentfee, isPaid } = req.body;
  try {
    const info = db.prepare(`
      UPDATE rentfee SET tenantName=?, rentStart=?, rentEnd=?, rentfee=?, isPaid=?
      WHERE roomNo=?
    `).run(tenantName, rentStart, rentEnd, rentfee, isPaid ? 1 : 0, roomNo);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除租金紀錄（依 roomNo）
router.delete('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  try {
    const info = db.prepare('DELETE FROM rentfee WHERE roomNo=?').run(roomNo);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
