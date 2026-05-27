# Tasks.md - SRT 48 Pasuruan ERP Development

## Development Status: Database Migration Phase (Error Logged)

**Last Updated:** 2026-05-27 (Evening Session)  
**Mode:** Supervised (Manual Confirmation Required)  
**Priority:** Token-Efficient, Incremental Development

---

## 🚨 URGENT - Migration Error (Must Fix Tomorrow)

**ERROR:** `column 'tenant_id' does not exist` (Supabase Error Code: 42703)

**Root Cause:** 
- Tables `users` and `santri` already exist in Supabase from previous project
- `CREATE TABLE IF NOT EXISTS` skipped creation
- `tenant_id` column was never added to existing tables
- RLS policies tried to reference non-existent `tenant_id` column

**Solution for Next Session:**
Use **hybrid migration approach**:
1. First, run `ALTER TABLE ... ADD COLUMN IF NOT EXISTS tenant_id UUID`
2. Then, add foreign key constraints
3. Finally, create RLS policies that reference tenant_id

**File to Update:** `backend/migration_tenant.sql`

---

---

## Current State Analysis

### Tech Stack Detected
- **Backend Framework:** Node.js + Express
- **Database:** Supabase (PostgreSQL)
- **Authentication:** JWT + OTP (via Telegram)
- **Real-time:** Socket.io
- **File Upload:** Multer
- **Notifications:** Telegram Bot API
- **QR Code:** qrcode package
- **Excel:** xlsx package

### Existing Modules in Backend
1. `auth` - Login System (Admin/Guru/Wali Santri)
2. `siswa` - Student Management
3. `absensi` - Attendance Tracking
4. `nilai` - Grades/Grading System
5. `asrama` - Dormitory Management
6. `kesehatan` - Health Record System
7. `perlengkapan` - Equipment/Supply Management
8. `pengumuman` - Announcements
9. `laporan` - Reports
10. `bakatMinat` - Talent & Interest Tracking

### Current Repository Structure
```
srt48-pasuruan/
├── .kiro/steering/SaaS_Rules.md  ← NEW: Steering Configuration
├── backend/
│   ├── src/
│   │   ├── controllers/          [10 modules]
│   │   ├── routes/               [10 modules]
│   │   ├── config/               [database.js]
│   │   ├── middleware/           [auth, upload]
│   │   └── services/             [telegram.js]
│   └── package.json
└── README.md
```

---

## Completed (Sesi 1 & 2)

✅ Created `.kiro/steering/SaaS_Rules.md` - Steering file for multi-tenant development  
✅ Created `backend/src/models/tenant.js` - Tenant model with CRUD operations  
✅ Created `backend/src/models/user.js` - User model with tenant_id field  
✅ Renamed `santri.js` → `siswa.js` - Universal naming for SaaS product  
✅ Updated `backend/src/config/database.js` - Tenant context helpers (setTenantContext, withTenantFilter)  
✅ Fixed `backend/migration_tenant.sql` v3 - Hybrid CREATE+ALTER, ran successfully in Supabase  
✅ Updated `backend/src/routes/absensi.js` - Added setTenantContext middleware  
✅ Rewrote `backend/src/controllers/absensiController.js` - Full multi-tenant aware (withTenantFilter on all queries)

---

## Pending Tasks

### Phase 1: Multi-Tenancy Foundation

1. [✅ SELESAI] **TASK-A1:** Database Migration - Hybrid script berhasil di Supabase
2. [✅ SELESAI] **TASK-A1b:** Rename santri → siswa (universal SaaS naming)
3. [✅ SELESAI] **TASK-Absensi:** Routes & Controller absensi — multi-tenant aware

4. [🔴 NEXT] **TASK-A2:** Middleware Development
   - [ ] Update `auth.js` — tambah `tenant_id` ke JWT payload saat login
   - [ ] Test end-to-end: login → setTenantContext → query absensi dengan filter tenant

5. [ ] **TASK-A3:** Buat tabel SQL pendukung absensi di Supabase
   - [ ] Tabel `activities` (dengan kolom `tenant_id`)
   - [ ] Tabel `activity_sessions` (dengan kolom `tenant_id`)
   - [ ] Tabel `attendances` (dengan kolom `tenant_id` dan `siswa_id`)

---

### Phase 2: Role-Based Access Control (RBAC) Enhancement

**Current:** Basic role_id in users table  
**Target:** Granular permission system (Super Admin, Tenant Admin, Staff, Security, Parents)

**Tasks:**
4. [ ] **TASK-B1:** Role Permissions Table
   - [ ] Create `roles` table with permission matrix
   - [ ] Create `role_permissions` junction table
   - [ ] Add permission check middleware

5. [ ] **TASK-B2:** Permission-Scoped Endpoints
   - [ ] Audit all existing endpoints for permission requirements
   - [ ] Update middleware to enforce role-based access
   - [ ] Document permission matrix for each module

---

### Phase 3: Code Quality & Testability

**Tasks:**
6. [ ] **TASK-C1:** Backend Test Suite
   - [ ] Setup Jest/Vitest for unit testing
   - [ ] Write tests for auth controller (login, OTP)
   - [ ] Write tests for database RLS policies

7. [ ] **TASK-C2:** CI/CD Configuration
   - [ ] Add GitHub Actions workflow for automated testing
   - [ ] Configure environment variable validation

---

### Phase 4: Future Integrations (Spec-Driven)

**Tasks:**
8. [ ] **TASK-D1:** Telegram Bot Enhancements
   - [ ] Create spec for automated parent notifications (attendance reminder, violations)
   - [ ] Add webhook support instead of polling
   
9. [ ] **TASK-D2:** Midtrans QRIS Integration
   - [ ] Create spec for SaaS subscription payment flow
   - [ ] Implement midtrans-client integration
   
10. [ ] **TASK-D3:** Mobile Apps (Flutter/Android)
    - [ ] Create spec for QR Code scanning app
    - [ ] Create spec for NFC hardware integration

---

## Tomorrow's Focus (Next Session Priority)

**MUST DO FIRST:**
1. Tambah `tenant_id` ke JWT payload di `authController.js` (login)
2. Buat tabel SQL: `activities`, `activity_sessions`, `attendances` (dengan `tenant_id`)
3. Test end-to-end absensi API dengan Postman / REST client

**THEN PROCEED TO:**
- Update controller lain (nilai, asrama, dll) dengan pola yang sama
- Tambah validasi role untuk endpoint absensi

---

## Session Notes (2026-05-27 Evening)

**What Worked:**
- Model structure is clean and well-documented
- Helper functions for tenant context are ready
- Steering rules established for team guidance

**What Needs Fixing:**
- Migration script assumes clean database
- Need hybrid approach (CREATE + ALTER) for real-world scenario
- RLS policies must be created AFTER columns exist

**Lesson Learned:**
Always check if tables exist before assuming clean slate. Production migrations need idempotent scripts that handle both new and existing schemas.

---

## Notes & Context

1. **Steering Rules:** See `.kiro/steering/SaaS_Rules.md` for architecture guidelines
2. **Development Philosophy:** Token-efficient, spec-driven, supervised mode
3. **Multi-Tenancy is CRITICAL:** Data isolation must be implemented before new features
4. **No Auto-Pilot:** All major changes require user confirmation

---

*This file should be updated whenever significant new tasks are identified*
