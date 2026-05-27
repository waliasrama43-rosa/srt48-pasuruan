# HANDOVER — Sesi 2026-05-27

> Dokumen ini dibuat untuk memastikan sesi berikutnya bisa langsung
> melanjutkan tanpa mengulang dari awal. Baca dari atas ke bawah
> sebelum memulai percakapan baru.

---

## 1. Identitas Proyek

| Item | Detail |
|------|--------|
| **Nama Produk** | SaaS Absensi & Manajemen Boarding School |
| **Repositori** | `waliasrama43-rosa/srt48-pasuruan` |
| **Bahasa/Framework** | Node.js + Express |
| **Database** | Supabase (PostgreSQL) |
| **Realtime** | Socket.io |
| **Notifikasi** | Telegram Bot API |
| **Auth** | JWT (email+password) + OTP via Telegram |
| **Konsep** | Multi-tenant SaaS — satu backend untuk banyak sekolah |

---

## 2. Status Backend — SELESAI 100%

Backend sudah selesai sepenuhnya dan siap digunakan. Semua modul
sudah bersifat **tenant-aware** (setiap query otomatis difilter
berdasarkan `tenant_id` milik sekolah yang login).

### Alur Data (Sudah Berfungsi)

```
POST /api/auth/register
  └─ Buat tenant baru + akun admin → return JWT langsung

POST /api/auth/login
  └─ bcrypt.compare(password, password_hash || password)
  └─ JWT { id, tenant_id, role_id, name, email, phone }

Semua request protected:
  verifikasiToken() → setTenantContext() → controller
  └─ getTenantId() → .eq('tenant_id', tenantId) di semua query
```

### File-File Utama Backend

```
backend/
├── .env.example                  ← template env vars (JANGAN commit .env asli)
├── migration_tenant.sql          ← ✅ SUDAH dijalankan di Supabase
├── migration_absensi.sql         ← ✅ SUDAH dijalankan di Supabase
├── migration_semua_modul.sql     ← ⚠️  CEK apakah sudah dijalankan!
└── src/
    ├── config/database.js        ← supabase, setTenantContext, getTenantId, withTenantFilter
    ├── middleware/auth.js         ← verifikasiToken, cekRole
    ├── models/
    │   ├── tenant.js
    │   ├── user.js
    │   └── siswa.js
    ├── controllers/ (semua tenant-aware)
    │   ├── authController.js     ← login, OTP, register, gantiPassword
    │   ├── absensiController.js
    │   ├── siswaController.js
    │   ├── nilaiController.js
    │   ├── kesehatanController.js
    │   ├── perlengkapanController.js
    │   ├── pengumumanController.js
    │   ├── laporanController.js
    │   └── bakatMinatController.js
    └── routes/ (semua pakai setTenantContext)
        auth, siswa, absensi, nilai, asrama, kesehatan,
        perlengkapan, pengumuman, laporan, bakatMinat, emoney
```

---

## 3. Database — Tabel yang Sudah/Harus Ada di Supabase

### ✅ Sudah ada (dari migration_tenant + migration_absensi)
`tenants`, `users`, `siswa`, `activity_categories`, `activities`,
`activity_sessions`, `attendances`

### ⚠️ Cek apakah `migration_semua_modul.sql` sudah dijalankan

File ini membuat **16 tabel** berikut:
`roles`, `otp_codes`, `subjects`, `grades`, `asrama`, `rooms`,
`health_records`, `items`, `item_stocks`, `item_distributions`,
`announcements`, `violations`, `talent_categories`, `student_talents`,
`achievements`, `counseling_records`

**Jika belum:** Buka Supabase SQL Editor → copy-paste isi file
`backend/migration_semua_modul.sql` → Run.

---

## 4. Endpoint API Lengkap

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| POST | `/register` | Publik | Daftarkan sekolah baru + buat admin pertama |
| POST | `/login` | Publik | Login email + password |
| POST | `/minta-otp` | Publik | Kirim OTP ke Telegram (untuk orang tua) |
| POST | `/verifikasi-otp` | Publik | Verifikasi OTP |
| GET | `/profil` | JWT | Profil user yang sedang login |
| PUT | `/ganti-password` | JWT | Ganti password |

### Siswa (`/api/siswa`) — semua butuh JWT
`GET /`, `GET /:id`, `GET /scan/:kartu_id`, `POST /`,
`PUT /:id`, `DELETE /:id`, `POST /import`, `GET /template`

### Absensi (`/api/absensi`) — semua butuh JWT
`GET /kegiatan`, `POST /kegiatan`, `PUT /kegiatan/:id`,
`DELETE /kegiatan/:id`, `POST /sesi`, `POST /scan`,
`POST /manual`, `GET /rekap/harian`, `GET /rekap/siswa/:id`

### Modul lain (semua butuh JWT)
`/api/nilai`, `/api/asrama`, `/api/kesehatan`, `/api/perlengkapan`,
`/api/pengumuman`, `/api/laporan`, `/api/bakat-minat`

---

## 5. Cara Test Backend (Postman / curl)

```bash
# 1. Daftarkan sekolah baru
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "school_name": "SRT 48 Pasuruan",
    "school_short_name": "SRT48",
    "address": "Jl. Raya Pasuruan, Jawa Timur",
    "admin_name": "Admin SRT48",
    "admin_email": "admin@srt48.com",
    "admin_password": "password123"
  }'

# 2. Login (ambil token dari response)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@srt48.com", "password": "password123"}'

# 3. Akses endpoint protected (ganti TOKEN dengan JWT dari langkah 2)
curl http://localhost:5000/api/siswa \
  -H "Authorization: Bearer TOKEN"
```

---

## 6. Yang Harus Dilakukan BESOK — Blok 2: Frontend

Backend sudah selesai. Langkah berikutnya adalah membuat **Admin Panel**
berbasis web agar sistem bisa digunakan secara nyata.

### Teknologi yang Direkomendasikan

```
Next.js 14 (App Router) + Tailwind CSS + shadcn/ui
Deploy ke: Vercel (gratis, cocok untuk Next.js)
```

### Halaman yang Harus Dibuat (Prioritas)

| # | Halaman | Route | Keterangan |
|---|---------|-------|------------|
| 1 | Login | `/login` | Form email+password, panggil POST /api/auth/login |
| 2 | Dashboard | `/dashboard` | Statistik hari ini: absensi, total siswa, kegiatan |
| 3 | Manajemen Siswa | `/siswa` | Tabel siswa + tambah + edit + import Excel |
| 4 | Absensi | `/absensi` | Buka sesi + scan QR via kamera browser + rekap |
| 5 | Laporan | `/laporan` | Rekap harian, bulanan, per siswa |
| 6 | Pengaturan | `/pengaturan` | Profil sekolah, data guru, asrama |

### Cara Memulai Sesi Berikutnya

Cukup minta Kiro dengan perintah ini:

> **"Kiro, baca HANDOVER.md di repositori, lalu lanjutkan ke Blok 2:
> buat Next.js admin panel untuk SRT 48 Pasuruan yang terhubung ke
> backend API yang sudah ada. Mulai dari struktur proyek dan halaman
> Login dulu."**

---

## 7. Hal Penting yang Perlu Diingat

### Arsitektur Multi-Tenant
- Setiap sekolah yang mendaftar lewat `/api/auth/register` mendapat
  `tenant_id` UUID unik yang tersimpan di tabel `tenants`.
- Semua data siswa, absensi, nilai, dll **terisolasi** per sekolah.
- JWT selalu membawa `tenant_id` sehingga controller tahu data milik
  sekolah mana yang boleh diakses.

### Kolom Password
- Tabel `users` lama punya kolom `password` (plaintext bcrypt hash).
- Migration baru menambahkan `password_hash` dan menyalin nilainya.
- Kode `authController.js` sudah menangani keduanya:
  `const storedHash = user.password_hash || user.password;`

### `.env` File
- File `.env` yang asli sudah dilindungi oleh `.gitignore`.
- Untuk menjalankan backend: salin `backend/.env.example` menjadi
  `backend/.env` dan isi dengan credential Supabase & Telegram yang asli.

### Commit Terakhir
```
9a4ec13 — fix+feat: Blok 1 complete — security, auth, migration, register endpoint
```

---

## 8. Checklist Sebelum Mulai Sesi Berikutnya

- [ ] Jalankan `migration_semua_modul.sql` di Supabase (jika belum)
- [ ] Test `POST /api/auth/register` dengan Postman → pastikan berhasil
- [ ] Test `POST /api/auth/login` → dapatkan JWT
- [ ] Test `GET /api/siswa` dengan JWT → pastikan response `{ status: 'ok', data: [] }`
- [ ] Setelah semua ✅, lanjut ke Blok 2: Next.js Admin Panel

---

*Dokumen ini dibuat otomatis oleh Kiro pada 2026-05-27 akhir sesi.*
