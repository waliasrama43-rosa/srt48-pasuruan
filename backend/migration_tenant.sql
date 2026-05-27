-- ================================================================
-- HYBRID Migration Script v3 - Multi-Tenant SaaS Boarding School
-- ================================================================
-- Strategi: CREATE TABLE IF NOT EXISTS (untuk database baru)
--           + ALTER TABLE ADD COLUMN IF NOT EXISTS (untuk tabel lama)
-- Urutan: tenants DULU (parent FK), baru users & siswa (child FK)
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: CREATE tabel 'tenants' (parent, harus dibuat paling awal)
-- ================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name             VARCHAR(255) NOT NULL UNIQUE,
  school_short_name       VARCHAR(50)  NOT NULL,
  address                 TEXT,
  phone                   VARCHAR(20),
  email                   VARCHAR(100),
  website                 VARCHAR(255),
  logo_url                TEXT,

  -- Subscription
  subscription_status     VARCHAR(50)  DEFAULT 'trial'
                          CHECK (subscription_status IN ('trial','active','expired','suspended')),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ended_at   TIMESTAMP WITH TIME ZONE,
  max_students            INTEGER      DEFAULT 100,
  current_students_count  INTEGER      DEFAULT 0,

  -- Timestamps & soft-delete
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active               BOOLEAN      DEFAULT true,
  deleted_at              TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- STEP 2: CREATE tabel 'users' (jika belum ada)
-- ================================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  email         VARCHAR(100) UNIQUE,
  phone         VARCHAR(20),
  name          VARCHAR(255) NOT NULL,
  password_hash TEXT         NOT NULL,
  role_id       UUID,
  photo         TEXT,
  telegram_chat_id TEXT,
  last_login    TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active     BOOLEAN      DEFAULT true,
  deleted_at    TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- STEP 3: CREATE tabel 'siswa' (jika belum ada)
--         Nama universal: 'siswa' (menggantikan istilah 'santri')
-- ================================================================
CREATE TABLE IF NOT EXISTS siswa (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        REFERENCES tenants(id) ON DELETE SET NULL,

  -- Identitas siswa
  nis              VARCHAR(50)  UNIQUE,   -- Nomor Induk Siswa
  nisn             VARCHAR(20),           -- Nomor Induk Siswa Nasional
  nama             VARCHAR(255) NOT NULL,
  tempat_lahir     VARCHAR(100),
  tanggal_lahir    DATE,
  jenis_kelamin    VARCHAR(10)
                   CHECK (jenis_kelamin IN ('Laki-laki','Perempuan')),

  -- Data penerimaan
  no_pendaftaran   VARCHAR(100) UNIQUE,
  tanggal_daftar   DATE         DEFAULT CURRENT_DATE,
  status_siswa     VARCHAR(50)  DEFAULT 'aktif'
                   CHECK (status_siswa IN ('aktif','lulus','keluar','cuti')),

  -- Kontak & wali
  alamat           TEXT,
  no_wali          VARCHAR(20),
  nama_wali        VARCHAR(255),

  -- Asrama (opsional)
  asrama_id        UUID,

  -- Foto & dokumen
  foto_siswa       TEXT,
  foto_ktp_wali    TEXT,

  -- Timestamps & soft-delete
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active        BOOLEAN      DEFAULT true,
  deleted_at       TIMESTAMP WITH TIME ZONE
);

-- ================================================================
-- STEP 4: HYBRID ALTER — tambah tenant_id ke tabel LAMA jika ada
--         (Aman dijalankan berkali-kali: IF NOT EXISTS)
-- ================================================================

-- Untuk tabel 'users' lama
DO $$
BEGIN
  -- Tambah kolom tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID;
  END IF;

  -- Tambah foreign key (skip jika sudah ada)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_users_tenant' AND table_name = 'users'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_users_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;

  -- Tambah kolom telegram_chat_id (fitur OTP Telegram)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'telegram_chat_id'
  ) THEN
    ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
  END IF;
END $$;

-- Untuk tabel 'siswa' lama (jika ada tabel bernama 'siswa' dari proyek lama)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'siswa' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE siswa ADD COLUMN tenant_id UUID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_siswa_tenant' AND table_name = 'siswa'
  ) THEN
    ALTER TABLE siswa
      ADD CONSTRAINT fk_siswa_tenant
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- STEP 5: INDEX untuk performa query berbasis tenant_id
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_school_name         ON tenants(school_name);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active           ON tenants(is_active);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id             ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email                 ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone                 ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_active             ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_siswa_tenant_id             ON siswa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_siswa_nis                   ON siswa(nis);
CREATE INDEX IF NOT EXISTS idx_siswa_nisn                  ON siswa(nisn);
CREATE INDEX IF NOT EXISTS idx_siswa_no_pendaftaran        ON siswa(no_pendaftaran);
CREATE INDEX IF NOT EXISTS idx_siswa_is_active             ON siswa(is_active);

-- ================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ================================================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE siswa   ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 7: RLS Policies
--         DROP dulu agar aman dijalankan ulang (idempotent)
-- ================================================================

-- tenants
DROP POLICY IF EXISTS "Tenant owner can view own tenant"    ON tenants;
DROP POLICY IF EXISTS "Tenant owner can manage own tenant"  ON tenants;
CREATE POLICY "Tenant owner can view own tenant"
  ON tenants FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Tenant owner can manage own tenant"
  ON tenants FOR ALL   USING (auth.uid() = id);

-- users (setelah kolom tenant_id PASTI ada)
DROP POLICY IF EXISTS "Users can view users in same tenant" ON users;
DROP POLICY IF EXISTS "Admin can manage users in tenant"    ON users;
CREATE POLICY "Users can view users in same tenant"
  ON users FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE id = users.tenant_id));
CREATE POLICY "Admin can manage users in tenant"
  ON users FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE id = users.tenant_id));

-- siswa (setelah kolom tenant_id PASTI ada)
DROP POLICY IF EXISTS "Users can view siswa in same tenant" ON siswa;
DROP POLICY IF EXISTS "Staff can manage siswa in tenant"    ON siswa;
CREATE POLICY "Users can view siswa in same tenant"
  ON siswa FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE id = siswa.tenant_id));
CREATE POLICY "Staff can manage siswa in tenant"
  ON siswa FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE id = siswa.tenant_id));

-- ================================================================
-- MIGRATION COMPLETE
-- ================================================================
COMMIT;

-- ================================================================
-- CONTOH QUERY (jalankan satu per satu SETELAH migrasi berhasil)
-- ================================================================

-- 1. Daftarkan sekolah/pondok baru sebagai Tenant
-- INSERT INTO tenants (school_name, school_short_name, address, phone, email, subscription_status)
-- VALUES ('Pondok Pesantren SRT 48 Pasuruan', 'SRT 48',
--         'Jl. Raya Pasuruan KM 12,6, Tongas, Pasuruan', '0812-3456-7890',
--         'info@srt48pasuruan.sch.id', 'active')
-- ON CONFLICT (school_name) DO NOTHING
-- RETURNING id, school_name;

-- 2. Tambah user baru dengan tenant_id
-- INSERT INTO users (tenant_id, email, name, password_hash, phone)
-- VALUES ('TENANT_UUID', 'admin@srt48.com', 'Admin SRT 48', '$2a$10$...', '081234567890')
-- RETURNING id, name;

-- 3. Tambah siswa baru dengan tenant_id
-- INSERT INTO siswa (tenant_id, nis, nisn, nama, jenis_kelamin, no_pendaftaran)
-- VALUES ('TENANT_UUID', '2024001', '0012345678', 'Ahmad Fauzi', 'Laki-laki', '2024/001')
-- RETURNING id, nama;

-- 4. Ambil semua siswa milik satu tenant
-- SELECT * FROM siswa
-- WHERE tenant_id = 'TENANT_UUID' AND is_active = true
-- ORDER BY nama;

-- 5. Hitung siswa per tenant
-- SELECT t.school_name, COUNT(s.id) AS total_siswa
-- FROM tenants t
-- LEFT JOIN siswa s ON t.id = s.tenant_id AND s.is_active = true
-- WHERE t.is_active = true
-- GROUP BY t.id, t.school_name
-- ORDER BY total_siswa DESC;
