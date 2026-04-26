const express = require('express');
const router = express.Router();
const {
  dashboardAdmin,
  laporanAbsensi,
  laporanNilai,
  laporanKesehatan,
  laporanPerlengkapan,
  laporanDisiplin,
  dashboardOrangTua
} = require('../controllers/laporanController');
const { verifikasiToken, cekRole } = require('../middleware/auth');

router.use(verifikasiToken);
router.get('/dashboard', dashboardAdmin);
router.get('/absensi', laporanAbsensi);
router.get('/nilai', laporanNilai);
router.get('/kesehatan', laporanKesehatan);
router.get('/perlengkapan', laporanPerlengkapan);
router.get('/disiplin', laporanDisiplin);
router.get('/ortu/:siswa_id', dashboardOrangTua);

module.exports = router;
