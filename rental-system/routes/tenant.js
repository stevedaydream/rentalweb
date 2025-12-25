// routes/tenant.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// 取得所有租客資料
router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM tenant').all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 取得單一房間目前有效租客（isActive=1），通常每房只會有一個
router.get('/:roomNo', (req, res) => {
  const { roomNo } = req.params;
  try {
    const row = db.prepare('SELECT * FROM tenant WHERE roomNo = ? AND isActive=1').get(roomNo);
    if (!row) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 新增租客（預設 isActive=1 表示入住，並自動設房間為不可租）
router.post('/', (req, res) => {
  const { roomNo, name, phone, email, rentStart, rentEnd, rentfee, deposit, note } = req.body;
  try {
    db.prepare(`
      INSERT INTO tenant (roomNo, name, phone, email, rentStart, rentEnd, rentfee, deposit, isActive, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(roomNo, name, phone, email, rentStart, rentEnd, rentfee, deposit, note || '');
    // 房間設為不可租
    db.prepare('UPDATE rooms SET isActive=0 WHERE roomNo=?').run(roomNo);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 更新租客（依 tenantId，支援修改 isActive 狀態。isActive=0 時房間狀態同步）
router.put('/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const { name, phone, email, rentStart, rentEnd, rentfee, deposit, isActive, note } = req.body;
  try {
    const oldTenant = db.prepare('SELECT roomNo FROM tenant WHERE tenantId=?').get(tenantId);

    const info = db.prepare(`
      UPDATE tenant SET name=?, phone=?, email=?, rentStart=?, rentEnd=?, rentfee=?, deposit=?, isActive=?, note=?
      WHERE tenantId=?
    `).run(name, phone, email, rentStart, rentEnd, rentfee, deposit, isActive, note, tenantId);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    // 根據 isActive 自動同步房間狀態
    if (oldTenant) {
      // 檢查該房間是否還有其他有效租客
      const activeCount = db.prepare('SELECT COUNT(*) as cnt FROM tenant WHERE roomNo=? AND isActive=1').get(oldTenant.roomNo).cnt;
      db.prepare('UPDATE rooms SET isActive=? WHERE roomNo=?').run(activeCount > 0 ? 0 : 1, oldTenant.roomNo);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 刪除租客（依 tenantId，刪除後同步房間狀態）
router.delete('/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  try {
    const oldTenant = db.prepare('SELECT roomNo FROM tenant WHERE tenantId=?').get(tenantId);

    const info = db.prepare('DELETE FROM tenant WHERE tenantId=?').run(tenantId);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    // 檢查刪除後該房間是否還有其他有效租客
    if (oldTenant) {
      const activeCount = db.prepare('SELECT COUNT(*) as cnt FROM tenant WHERE roomNo=? AND isActive=1').get(oldTenant.roomNo).cnt;
      db.prepare('UPDATE rooms SET isActive=? WHERE roomNo=?').run(activeCount > 0 ? 0 : 1, oldTenant.roomNo);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 標記租金為已繳
router.put('/pay/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  try {
    db.prepare('UPDATE tenant SET isPaid=1 WHERE tenantId=?').run(tenantId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
