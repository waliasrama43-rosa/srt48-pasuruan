const { supabase } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Buat token JWT — tenant_id wajib ada agar setTenantContext berfungsi
const buatToken = (user) => {
  return jwt.sign(
    {
      id:        user.id,
      tenant_id: user.tenant_id,   // ← CRITICAL: multi-tenant isolation
      role_id:   user.role_id,
      name:      user.name,
      email:     user.email,
      phone:     user.phone
    },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
};

// Login Admin & Guru
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        pesan: 'Email dan password harus diisi'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(401).json({
        status: 'error',
        pesan: 'Email tidak ditemukan'
      });
    }

    const passwordValid = await bcrypt.compare(
      password, user.password
    );

    if (!passwordValid) {
      return res.status(401).json({
        status: 'error',
        pesan: 'Password salah'
      });
    }

    await supabase
      .from('users')
      .update({ last_login: new Date() })
      .eq('id', user.id);

    const token = buatToken(user);

    res.json({
      status: 'ok',
      pesan: `Selamat datang, ${user.name}!`,
      token,
      user: {
        id:        user.id,
        tenant_id: user.tenant_id,
        name:      user.name,
        email:     user.email,
        role_id:   user.role_id,
        photo:     user.photo
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Minta OTP untuk Orang Tua
exports.mintaOTP = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        status: 'error',
        pesan: 'Nomor HP harus diisi'
      });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (error || !user) {
      return res.status(404).json({
        status: 'error',
        pesan: 'Nomor HP tidak terdaftar'
      });
    }

    const kodeOTP = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const expiredAt = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await supabase.from('otp_codes').insert({
      user_id: user.id,
      phone,
      code: kodeOTP,
      type: 'login',
      expired_at: expiredAt
    });

    if (user.telegram_chat_id) {
      const { bot } = require('../services/telegram');
      await bot.sendMessage(
        user.telegram_chat_id,
        `🔐 *KODE OTP SRT 48 PASURUAN*\n\n` +
        `Kode OTP kamu: *${kodeOTP}*\n\n` +
        `Berlaku 5 menit.\n` +
        `Jangan berikan ke siapapun!`,
        { parse_mode: 'Markdown' }
      );
    }

    res.json({
      status: 'ok',
      pesan: 'Kode OTP dikirim ke Telegram kamu'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Verifikasi OTP
exports.verifikasiOTP = async (req, res) => {
  try {
    const { phone, kode } = req.body;

    const { data: otp, error } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('phone', phone)
      .eq('code', kode)
      .eq('is_used', false)
      .gt('expired_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !otp) {
      return res.status(401).json({
        status: 'error',
        pesan: 'Kode OTP salah atau sudah expired'
      });
    }

    await supabase
      .from('otp_codes')
      .update({ is_used: true })
      .eq('id', otp.id);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', otp.user_id)
      .single();

    const token = buatToken(user);

    res.json({
      status: 'ok',
      pesan: `Selamat datang, ${user.name}!`,
      token,
      user: {
        id:        user.id,
        tenant_id: user.tenant_id,
        name:      user.name,
        phone:     user.phone,
        role_id:   user.role_id,
        photo:     user.photo
      }
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Profil Saya
exports.profilSaya = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, role_id, tenant_id, photo, last_login')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    res.json({ status: 'ok', data });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};

// Ganti Password
exports.gantiPassword = async (req, res) => {
  try {
    const { password_lama, password_baru } = req.body;

    const { data: user } = await supabase
      .from('users')
      .select('password')
      .eq('id', req.user.id)
      .single();

    const valid = await bcrypt.compare(
      password_lama, user.password
    );

    if (!valid) {
      return res.status(400).json({
        status: 'error',
        pesan: 'Password lama salah'
      });
    }

    const hash = await bcrypt.hash(password_baru, 10);

    await supabase
      .from('users')
      .update({ password: hash })
      .eq('id', req.user.id);

    res.json({
      status: 'ok',
      pesan: 'Password berhasil diubah'
    });

  } catch (err) {
    res.status(500).json({
      status: 'error',
      pesan: err.message
    });
  }
};
