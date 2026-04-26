const express = require('express');
const router = express.Router();
const {
  semuaBakat,
  tambahBakat,
  editBakat,
  hapusBakat,
  penjurusanSiswa,
  tambahPenjurusan,
  prestasiSiswa,
  tambahPrestasi,
  konselingSiswa,
  tambahKonseling,
  rekomendasiJurusan
} = require('../controllers/bakatMinatController');
const { verifikasiToken, cekRole } = require('../middleware/auth');

router.use(verifikasiToken);
router.get('/bakat/:siswa_id', semuaBakat);
router.post('/bakat', cekRole([1,2,3,4,5,6]), tambahBakat);
router.put('/bakat/:id', cekRole([1,2,3,4,5,6]), editBakat);
router.delete('/bakat/:id', cekRole([1,2,3]), hapusBakat);
router.get('/jurusan/:siswa_id', penjurusanSiswa);
router.post('/jurusan', cekRole([1,2,3,4]), tambahPenjurusan);
router.get('/rekomendasi/:siswa_id', rekomendasiJurusan);
router.get('/prestasi/:siswa_id', prestasiSiswa);
router.post('/prestasi', cekRole([1,2,3,4,5,6]), tambahPrestasi);
router.get('/konseling/:siswa_id', cekRole([1,2,3,4]), konselingSiswa);
router.post('/konseling', cekRole([1,2,3,4]), tambahKonseling);

module.exports = router;
