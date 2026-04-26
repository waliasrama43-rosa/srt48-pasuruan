const express = require('express');
const router = express.Router();
const { verifikasiToken, cekRole } = require('../middleware/auth');

router.use(verifikasiToken);
router.get('/', (req, res) => {
  res.json({ status: 'ok', pesan: 'Modul asrama aktif' });
});

module.exports = router;
