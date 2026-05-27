const express = require('express');
const router = express.Router();
const {
  semuaKegiatan,
  tambahKegiatan,
  editKegiatan,
  hapusKegiatan,
  buatSesi,
  scanAbsensi,
  inputManual,
  rekapHarian,
  rekapSiswa
} = require('../controllers/absensiController');
const { verifikasiToken, cekRole } = require('../middleware/auth');
const { setTenantContext } = require('../config/database');

// verifikasiToken terlebih dahulu agar req.user.tenant_id tersedia,
// lalu setTenantContext menyuntikkan tenant_id ke dalam tenantContext global.
router.use(verifikasiToken);
router.use(setTenantContext);

router.get('/kegiatan', semuaKegiatan);
router.post('/kegiatan', cekRole([1,2,3,4]), tambahKegiatan);
router.put('/kegiatan/:id', cekRole([1,2,3,4]), editKegiatan);
router.delete('/kegiatan/:id', cekRole([1,2,3]), hapusKegiatan);
router.post('/sesi', buatSesi);
router.post('/scan', scanAbsensi);
router.post('/manual', inputManual);
router.get('/rekap/harian', rekapHarian);
router.get('/rekap/siswa/:id', rekapSiswa);

module.exports = router;
