// routes/houses.js
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM houses').all();
    res.json(rows);  // <--- 這裡一定要直接傳 rows
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


module.exports = router;
