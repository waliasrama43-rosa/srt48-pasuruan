const express = require('express');
const router = express.Router();
const {
  cekSaldo,
  riwayatTransaksi,
  bayar,
  topUp,
  approveTopUp,
  setLimit,
  laporanHarian,
  laporanSiswa
} = require('../controllers/emoneyController');
const { verifikasiToken, cekRole } = require('../middleware/auth');
const { setTenantContext } = require('../config/database');

router.use(verifikasiToken);
router.use(setTenantContext);
router.get('/saldo/:siswa_id', cekSaldo);
router.get('/riwayat/:siswa_id', riwayatTransaksi);
router.post('/bayar', cekRole([1,2,9]), bayar);
router.post('/topup', topUp);
router.put('/topup/:id/approve', cekRole([1,2,9]), approveTopUp);
router.post('/limit', setLimit);
router.get('/laporan/harian', cekRole([1,2,9]), laporanHarian);
router.get('/laporan/siswa/:id', laporanSiswa);

module.exports = router;
