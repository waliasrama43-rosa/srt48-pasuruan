const express = require('express');
const router = express.Router();
const {
  login,
  mintaOTP,
  verifikasiOTP,
  profilSaya,
  gantiPassword,
  registerTenant
} = require('../controllers/authController');
const { verifikasiToken } = require('../middleware/auth');

router.post('/login', login);
router.post('/minta-otp', mintaOTP);
router.post('/verifikasi-otp', verifikasiOTP);
router.get('/profil', verifikasiToken, profilSaya);
router.put('/ganti-password', verifikasiToken, gantiPassword);

// Onboarding: daftarkan sekolah baru + buat akun admin pertama
router.post('/register', registerTenant);

module.exports = router;
