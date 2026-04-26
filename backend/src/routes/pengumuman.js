const express = require('express');
const router = express.Router();
const {
  semuaPengumuman,
  tambahPengumuman,
  editPengumuman,
  hapusPengumuman,
  kirimBroadcast
} = require('../controllers/pengumumanController');
const { verifikasiToken, cekRole } = require('../middleware/auth');

router.use(verifikasiToken);
router.get('/', semuaPengumuman);
router.post('/', cekRole([1,2,3,4]), tambahPengumuman);
router.put('/:id', cekRole([1,2,3,4]), editPengumuman);
router.delete('/:id', cekRole([1,2,3]), hapusPengumuman);
router.post('/broadcast', cekRole([1,2]), kirimBroadcast);

module.exports = router;
