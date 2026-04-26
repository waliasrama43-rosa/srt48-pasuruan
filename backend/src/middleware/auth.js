const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifikasi Token
exports.verifikasiToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        pesan: 'Token tidak ada. Silakan login.'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();

  } catch (err) {
    return res.status(401).json({
      status: 'error',
      pesan: 'Token tidak valid. Silakan login ulang.'
    });
  }
};

// Cek Role
exports.cekRole = (rolesDiizinkan) => {
  return (req, res, next) => {
    if (!rolesDiizinkan.includes(req.user.role_id)) {
      return res.status(403).json({
        status: 'error',
        pesan: 'Akses ditolak. Anda tidak punya izin.'
      });
    }
    next();
  };
};
