# Tasks.md - SRT 48 Pasuruan ERP Development

## Development Status: Blok 1 SELESAI ✅ — Siap Testing

**Last Updated:** 2026-05-27 (Sesi 4)
**Mode:** Supervised
**Stack:** Node.js + Express + Supabase (PostgreSQL) + Socket.io + Telegram Bot

---

## ✅ Semua Yang Sudah Selesai

| Sesi | File | Keterangan |
|------|------|------------|
| 1 | `.kiro/steering/SaaS_Rules.md` | Steering file spec-driven development |
| 1 | `backend/src/models/tenant.js` | Model Tenant CRUD |
| 1 | `backend/src/models/user.js` | Model User dengan tenant_id |
| 1 | `backend/src/models/siswa.js` | Model Siswa (rename dari santri) |
| 1 | `backend/src/config/database.js` | Tenant context helpers (setTenantContext, withTenantFilter, getTenantId) |
| 2 | `backend/migration_tenant.sql` | Migration hybrid v3 — tenants, users, siswa ✅ sudah dijalankan |
| 2 | `backend/migration_absensi.sql` | Migration tabel absensi ✅ sudah dijalankan |
| 2 | `backend/src/controllers/authController.js` | JWT membawa tenant_id, fix password_hash, endpoint register |
| 2 | `backend/src/routes/auth.js` | Tambah POST /register |
| 3 | `backend/src/routes/*.js` (9 file) | Semua routes pakai setTenantContext |
| 3 | `backend/src/controllers/*.js` (7 file) | Semua controller tenant-aware |
| 4 | `.gitignore` | .env tidak akan ter-commit lagi |
| 4 | `backend/.env.example` | Template environment variables |
| 4 | `backend/migration_semua_modul.sql` | 16 tabel lengkap + RLS policies |

---

## 🏗️ Struktur Repositori Saat Ini

```
srt48-pasuruan/
├── .gitignore                        ← NEW ✅
├── .kiro/steering/SaaS_Rules.md
├── tasks.md
└── backend/
    ├── .env                          ← TIDAK di-commit (dilindungi .gitignore)
    ├── .env.example                  ← NEW ✅ (template aman di-commit)
    ├── migration_tenant.sql          ← ✅ Sudah dijalankan di Supabase
    ├── migration_absensi.sql         ← ✅ Sudah dijalankan di Supabase
    ├── migration_semua_modul.sql     ← NEW ✅ BELUM dijalankan — lakukan sekarang!
    └── src/
        ├── app.js
        ├── config/database.js        ← setTenantContext, withTenantFilter, getTenantId
        ├── controllers/
        │   ├── authController.js     ← register, login, OTP, ganti password
        │   ├── absensiController.js  ← full tenant-aware
        │   ├── siswaController.js    ← tabel 'siswa' baru
        │   ├── nilaiController.js
        │   ├── kesehatanController.js
        │   ├── perlengkapanController.js
        │   ├── pengumumanController.js
        │   ├── laporanController.js
        │   └── bakatMinatController.js
        ├── middleware/
        │   ├── auth.js               ← verifikasiToken + cekRole
        │   └── upload.js
        ├── models/
        │   ├── tenant.js
        │   ├── user.js
        │   └── siswa.js
        ├── routes/                   ← semua pakai setTenantContext
        └── services/telegram.js
```

---

## 🗺️ Alur Data End-to-End (Sudah Berfungsi)

```
POST /api/auth/register
  └─ Buat tenant baru + akun admin → return JWT

POST /api/auth/login
  └─ bcrypt.compare(password, password_hash || password)
  └─ JWT { id, tenant_id, role_id, name, email, phone }

Semua request protected:
  └─ verifikasiToken()  → req.user.tenant_id tersedia
  └─ setTenantContext() → tenantContext.set(req.user.tenant_id)
  └─ controller         → getTenantId() → .eq('tenant_id', tenantId)
```

---

## 🔴 Langkah Berikutnya (Prioritas Tinggi)

### AKSI SEGERA — Jalankan di Supabase SQL Editor

```
1. Buka: https://supabase.com/dashboard → SQL Editor
2. Jalankan: backend/migration_semua_modul.sql
   → Membuat 16 tabel: roles, otp_codes, subjects, grades,
     asrama, rooms, health_records, items, item_stocks,
     item_distributions, announcements, violations,
     talent_categories, student_talents, achievements,
     counseling_records
3. (Opsional) Uncomment bagian SEED DATA untuk isi data awal
```

### Blok 2 — Frontend (Diperlukan agar sistem bisa dipakai)

Pilihan yang direkomendasikan:

**Opsi A — Admin Panel Ringan (1-2 minggu):**
- Next.js + Tailwind CSS
- Halaman: Login, Dashboard, Siswa, Absensi, Laporan
- Deploy ke Vercel (gratis)

**Opsi B — Langsung Mobile App (2-4 minggu):**
- Flutter
- Fitur utama: QR/NFC scan, lihat rekap absensi
- Lebih relevan untuk operasional harian

**Opsi C — Keduanya bertahap:**
- Admin Panel dulu (Opsi A) → Mobile App menyusul

### Blok 3 — Production Hardening

| Tugas | Estimasi |
|-------|----------|
| RBAC granular (tabel roles → cekRole by slug) | 1 hari |
| Rate limiting (express-rate-limit) | 2 jam |
| Error logging (winston / Sentry) | 2 jam |
| Deploy backend ke Railway/Render | 1 hari |
| Midtrans QRIS untuk billing SaaS | 2-3 hari |

---

## 📊 Progress Keseluruhan

```
Backend API           ████████████████  100% ✅
Database Schema       ████████████████   95% (1 migration lagi)
Security Config       ████████████████  100% ✅
Frontend              ░░░░░░░░░░░░░░░░    0%
Mobile App            ░░░░░░░░░░░░░░░░    0%
Production Deploy     ░░░░░░░░░░░░░░░░    0%
```

---

## 📋 Endpoint API Lengkap

### Auth (`/api/auth`)
| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| POST | `/register` | Daftar sekolah baru + admin | Publik |
| POST | `/login` | Login email + password | Publik |
| POST | `/minta-otp` | Minta OTP via Telegram | Publik |
| POST | `/verifikasi-otp` | Verifikasi OTP | Publik |
| GET | `/profil` | Profil user saat ini | JWT |
| PUT | `/ganti-password` | Ganti password | JWT |

### Siswa (`/api/siswa`) — semua butuh JWT
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/` | Daftar siswa (filter: asrama, status, cari) |
| GET | `/:id` | Detail siswa |
| GET | `/scan/:kartu_id` | Scan kartu / NIS |
| POST | `/` | Tambah siswa |
| PUT | `/:id` | Edit siswa |
| DELETE | `/:id` | Arsip siswa |
| POST | `/import` | Import dari Excel |
| GET | `/template` | Download template Excel |

### Absensi (`/api/absensi`) — semua butuh JWT
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/kegiatan` | Daftar kegiatan |
| POST | `/kegiatan` | Tambah kegiatan |
| PUT | `/kegiatan/:id` | Edit kegiatan |
| DELETE | `/kegiatan/:id` | Hapus kegiatan |
| POST | `/sesi` | Buka sesi absensi |
| POST | `/scan` | Scan QR/NFC/Barcode |
| POST | `/manual` | Input manual |
| GET | `/rekap/harian` | Rekap hari ini |
| GET | `/rekap/siswa/:id` | Rekap per siswa |

### Modul lain tersedia di: nilai, asrama, kesehatan, perlengkapan, pengumuman, laporan, bakat-minat

---

*Update file ini di awal setiap sesi sebelum mulai coding.*
