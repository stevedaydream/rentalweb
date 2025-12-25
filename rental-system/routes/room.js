// routes/room.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 取得所有房間資料
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM rooms').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 取得單一房間資料
router.get('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  try {
    const row = db.prepare('SELECT * FROM rooms WHERE roomNo = ?').get(roomNo);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新增房間
router.post('/', (req, res) => {
  const { roomNo, houseId, roomType, area, floor, defaultRentfee, isActive, description } = req.body;
  try {
    db.prepare(`
      INSERT INTO rooms (roomNo, houseId, roomType, area, floor, defaultRentfee, isActive, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomNo,
      houseId,
      roomType,
      area,
      floor,
      defaultRentfee,
      isActive ? 1 : 0,
      description
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新房間（依 roomNo）
router.put('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  const { houseId, roomType, area, floor, defaultRentfee, isActive, description } = req.body;
  try {
    const info = db.prepare(`
      UPDATE rooms SET
        houseId=?, roomType=?, area=?, floor=?, defaultRentfee=?, isActive=?, description=?
      WHERE roomNo=?
    `).run(
      houseId,
      roomType,
      area,
      floor,
      defaultRentfee,
      isActive ? 1 : 0,
      description,
      roomNo
    );
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除房間（依 roomNo）
router.delete('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  try {
    const info = db.prepare('DELETE FROM rooms WHERE roomNo=?').run(roomNo);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
