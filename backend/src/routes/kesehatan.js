const express = require('express');
const router = express.Router();
const {
  riwayatKesehatan,
  tambahCatatanKesehatan,
  editCatatanKesehatan,
  kunjunganUKS,
  tambahKunjungan,
  updateKunjungan
} = require('../controllers/kesehatanController');
const { verifikasiToken, cekRole } = require('../middleware/auth');
const { setTenantContext } = require('../config/database');

router.use(verifikasiToken);
router.use(setTenantContext);
router.get('/siswa/:id', riwayatKesehatan);
router.post('/siswa/:id', cekRole([1,2,8]), tambahCatatanKesehatan);
router.put('/siswa/:id', cekRole([1,2,8]), editCatatanKesehatan);
router.get('/uks', kunjunganUKS);
router.post('/uks', cekRole([1,2,8]), tambahKunjungan);
router.put('/uks/:id', cekRole([1,2,8]), updateKunjungan);

module.exports = router;
