const express = require('express');
const router = express.Router();
const {
  nilaiSiswa,
  inputNilai,
  editNilai,
  hapusNilai,
  raporSiswa,
  rankingKelas,
  importNilai
} = require('../controllers/nilaiController');
const { verifikasiToken, cekRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(verifikasiToken);
router.get('/siswa/:id', nilaiSiswa);
router.get('/rapor/:id', raporSiswa);
router.get('/ranking/:kelas_id', rankingKelas);
router.post('/', cekRole([1,2,3,5,6]), inputNilai);
router.put('/:id', cekRole([1,2,3,5,6]), editNilai);
router.delete('/:id', cekRole([1,2,3]), hapusNilai);
router.post('/import', cekRole([1,2,3,5,6]), upload.single('file'), importNilai);

module.exports = router;
