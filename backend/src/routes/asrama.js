const express = require('express');
const router = express.Router();
const { verifikasiToken, cekRole } = require('../middleware/auth');
const { setTenantContext } = require('../config/database');

router.use(verifikasiToken);
router.use(setTenantContext);
router.get('/', (req, res) => {
  res.json({ status: 'ok', pesan: 'Modul asrama aktif' });
});

module.exports = router;
