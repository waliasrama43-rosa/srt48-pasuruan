const express = require('express');
const router = express.Router();
const {
  semuaSiswa,
  detailSiswa,
  tambahSiswa,
  editSiswa,
  arsipSiswa,
  scanKartu,
  importExcel,
  downloadTemplate
} = require('../controllers/siswaController');
const { verifikasiToken, cekRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(verifikasiToken);
router.get('/', semuaSiswa);
router.get('/scan/:kartu_id', scanKartu);
router.get('/template', downloadTemplate);
router.get('/:id', detailSiswa);
router.post('/', cekRole([1,2,3,4]), tambahSiswa);
router.put('/:id', cekRole([1,2,3,4]), editSiswa);
router.delete('/:id', cekRole([1,2,3]), arsipSiswa);
router.post('/import', cekRole([1,2,3,4]), upload.single('file'), importExcel);

module.exports = router;
