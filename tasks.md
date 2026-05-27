# Tasks.md - SRT 48 Pasuruan ERP Development

## Development Status: Multi-Tenant Backend — Core Auth & Absensi SELESAI ✅

**Last Updated:** 2026-05-27 (Sesi 3)
**Mode:** Supervised (Manual Confirmation Required)
**Priority:** Token-Efficient, Incremental Development

---

## ✅ Selesai Dikerjakan (Semua Sesi)

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Steering file SaaS rules | `.kiro/steering/SaaS_Rules.md` | ✅ |
| 2 | Model Tenant | `backend/src/models/tenant.js` | ✅ |
| 3 | Model User (tenant-aware) | `backend/src/models/user.js` | ✅ |
| 4 | Rename santri → siswa | `backend/src/models/siswa.js` | ✅ |
| 5 | Tenant context helpers | `backend/src/config/database.js` | ✅ |
| 6 | Migration multi-tenant (hybrid) | `backend/migration_tenant.sql` | ✅ Berhasil di Supabase |
| 7 | Absensi routes + setTenantContext | `backend/src/routes/absensi.js` | ✅ |
| 8 | Absensi controller (tenant-aware) | `backend/src/controllers/absensiController.js` | ✅ |
| 9 | **JWT payload + tenant_id** | `backend/src/controllers/authController.js` | ✅ **BARU** |
| 10 | **Fix import {supabase}** | `backend/src/models/user.js` | ✅ **BARU** |
| 11 | **Migration tabel absensi** | `backend/migration_absensi.sql` | ✅ **BARU — siap dijalankan** |

---

## 🗺️ Alur Data Saat Ini (End-to-End)

```
[Login POST /api/auth/login]
  └─ authController.login()
       └─ buatToken(user)  ← tenant_id kini ada di JWT ✅
            └─ JWT { id, tenant_id, role_id, name, email, phone }

[Request ke endpoint protected, e.g. GET /api/absensi/rekap/harian]
  └─ verifikasiToken()     ← decode JWT → req.user.tenant_id tersedia ✅
  └─ setTenantContext()    ← tenantContext.set(req.user.tenant_id) ✅
  └─ rekapHarian()
       └─ getTenantId()    ← ambil tenant_id dari context ✅
       └─ supabase.from('attendances').eq('tenant_id', tenantId) ✅
```

---

## 🔴 TASK BERIKUTNYA (Prioritas Tinggi)

### TASK-SQL-1: Jalankan `migration_absensi.sql` di Supabase
- File: `backend/migration_absensi.sql`
- Tabel yang dibuat: `activity_categories`, `activities`, `activity_sessions`, `attendances`
- **Aksi:** Copy-paste ke Supabase SQL Editor → Run

### TASK-SQL-2: Jalankan seed data kategori kegiatan (opsional)
- Uncomment bagian SEED DATA di `migration_absensi.sql`
- Isi `TENANT_UUID` dengan UUID sekolah SRT 48 dari tabel `tenants`

### TASK-B1: Update `authController` — tambah tenant_id saat register user baru
- Saat ini belum ada endpoint register, hanya login
- Perlu dibuat endpoint `POST /api/auth/register` untuk onboarding tenant baru

### TASK-B2: RBAC — Tabel `roles` dan `role_permissions`
- Buat tabel `roles` dengan kolom: id, tenant_id, name, permissions (jsonb)
- Update `cekRole()` di middleware agar cek ke tabel, bukan hardcode angka
- Role yang dibutuhkan: Super Admin, Tenant Admin, Guru/Ustadz, Keamanan, Wali Siswa

### TASK-C1: Update controller lain agar tenant-aware
Controller berikut belum menggunakan `withTenantFilter`:
- [ ] `nilaiController.js`
- [ ] `asramaController.js` (route: `asrama.js`)
- [ ] `kesehatanController.js`
- [ ] `perlengkapanController.js`
- [ ] `pengumumanController.js`
- [ ] `laporanController.js`
- [ ] `bakatMinatController.js`
- [ ] `siswaController.js`

### TASK-C2: Update semua routes agar pakai `setTenantContext`
Sama seperti `absensi.js`, semua routes perlu:
```js
router.use(verifikasiToken);
router.use(setTenantContext); // ← tambahkan ini
```

---

## 📋 Backlog (Sesi Mendatang)

| Prioritas | Task | Estimasi |
|-----------|------|----------|
| 🔴 Tinggi | Jalankan migration_absensi.sql di Supabase | 5 menit |
| 🔴 Tinggi | Test end-to-end login → absensi dengan Postman | 30 menit |
| 🟠 Sedang | Update 7 controller lain jadi tenant-aware | 2 sesi |
| 🟠 Sedang | Buat tabel `roles` + endpoint register tenant | 1 sesi |
| 🟡 Rendah | Telegram Bot: notifikasi otomatis ke wali siswa | 2 sesi |
| 🟡 Rendah | Midtrans QRIS: pembayaran langganan SaaS | 2 sesi |
| 🟡 Rendah | Flutter app: QR/NFC scanner | 3 sesi |

---

## 🏗️ Struktur Repositori Saat Ini

```
srt48-pasuruan/
├── .kiro/
│   └── steering/SaaS_Rules.md
├── backend/
│   ├── migration_tenant.sql      ← ✅ sudah dijalankan di Supabase
│   ├── migration_absensi.sql     ← 🔴 BELUM dijalankan — lakukan sekarang!
│   └── src/
│       ├── app.js
│       ├── config/
│       │   └── database.js       ← setTenantContext, withTenantFilter, getTenantId
│       ├── controllers/
│       │   ├── authController.js ← ✅ JWT sekarang membawa tenant_id
│       │   ├── absensiController.js ← ✅ full tenant-aware
│       │   └── [7 controller lain — belum tenant-aware]
│       ├── middleware/
│       │   └── auth.js           ← ✅ verifikasiToken + cekRole
│       ├── models/
│       │   ├── tenant.js
│       │   ├── user.js           ← ✅ fix import {supabase}
│       │   └── siswa.js
│       └── routes/
│           ├── absensi.js        ← ✅ pakai setTenantContext
│           └── [9 routes lain — belum pakai setTenantContext]
└── tasks.md                      ← file ini
```

---

## 📝 Catatan Arsitektur

1. **tenant_id flow:** JWT → `req.user.tenant_id` → `tenantContext` → semua query
2. **Tidak ada global state race condition** saat ini karena Node.js single-threaded, tapi perlu diupgrade ke `AsyncLocalStorage` jika traffic tinggi (multi-worker)
3. **RLS Supabase** adalah lapisan keamanan kedua — meski backend bocor, database tetap aman
4. **Soft delete** diterapkan di semua tabel (`is_active`, `deleted_at`)
5. **Idempotent migration** — semua script SQL aman dijalankan ulang

---

*Update file ini setiap sesi sebelum mulai coding.*
