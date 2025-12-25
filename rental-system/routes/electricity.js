// routes/electricity.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 取得所有電費紀錄（可選擇查詢全部或依條件篩選）
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM electricity').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 取得單筆電費紀錄
router.get('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const row = db.prepare('SELECT * FROM electricity WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新增一筆電費紀錄
router.post('/', (req, res) => {
  const { roomNo, meterStart, meterEnd, usage, unitPrice, amount, period, isPaid } = req.body;
  try {
    db.prepare(`
      INSERT INTO electricity (roomNo, meterStart, meterEnd, usage, unitPrice, amount, period, isPaid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      roomNo,
      meterStart,
      meterEnd,
      usage,
      unitPrice,
      amount,
      period,
      isPaid ? 1 : 0
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新一筆電費紀錄
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { roomNo, meterStart, meterEnd, usage, unitPrice, amount, period, isPaid } = req.body;
  try {
    const info = db.prepare(`
      UPDATE electricity SET
        roomNo=?, meterStart=?, meterEnd=?, usage=?, unitPrice=?, amount=?, period=?, isPaid=?
      WHERE id=?
    `).run(
      roomNo,
      meterStart,
      meterEnd,
      usage,
      unitPrice,
      amount,
      period,
      isPaid ? 1 : 0,
      id
    );
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除一筆電費紀錄
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  try {
    const info = db.prepare('DELETE FROM electricity WHERE id=?').run(id);
    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
// 標記電費為已繳
router.put('/pay/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('UPDATE electricity SET isPaid=1 WHERE id=?').run(id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
