const express = require('express');
const router = express.Router();
const {
  semuaBarang,
  tambahBarang,
  editBarang,
  stokMasuk,
  distribusiKesSiswa,
  riwayatSiswa,
  laporanDistribusi
} = require('../controllers/perlengkapanController');
const { verifikasiToken, cekRole } = require('../middleware/auth');

router.use(verifikasiToken);
router.get('/', semuaBarang);
router.post('/', cekRole([1,2,9]), tambahBarang);
router.put('/:id', cekRole([1,2,9]), editBarang);
router.post('/stok-masuk', cekRole([1,2,9]), stokMasuk);
router.post('/distribusi', cekRole([1,2,9]), distribusiKesSiswa);
router.get('/riwayat/:siswa_id', riwayatSiswa);
router.get('/laporan', cekRole([1,2,9]), laporanDistribusi);

module.exports = router;
