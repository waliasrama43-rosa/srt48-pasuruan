-- ================================================================
-- Migration: Tabel Pendukung Absensi — SaaS Boarding School
-- ================================================================
-- Jalankan SETELAH migration_tenant.sql berhasil.
-- Urutan: activity_categories → activities → activity_sessions → attendances
-- Strategi: Hybrid (CREATE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS)
-- ================================================================

BEGIN;

-- ================================================================
-- STEP 1: Tabel kategori kegiatan (Sholat, Belajar, Olahraga, dll)
-- ================================================================
CREATE TABLE IF NOT EXISTS activity_categories (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(50),                   -- emoji atau nama icon
  color       VARCHAR(20),                   -- hex color, e.g. #3B82F6
  description TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active   BOOLEAN      DEFAULT true
);

-- ================================================================
-- STEP 2: Tabel kegiatan / aktivitas (jadwal rutin sekolah)
-- ================================================================
CREATE TABLE IF NOT EXISTS activities (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  category_id         UUID         REFERENCES activity_categories(id) ON DELETE SET NULL,
  name                VARCHAR(150) NOT NULL,
  code                VARCHAR(20),           -- kode singkat, e.g. "SHOLAT-SUBUH"
  default_time_start  TIME,                  -- jam mulai default, e.g. "05:00"
  late_tolerance      INTEGER      DEFAULT 0, -- toleransi terlambat (menit)
  schedule_days       TEXT[],                -- ['Senin','Selasa',...] atau NULL = setiap hari
  description         TEXT,
  created_by          UUID,                  -- user_id yang membuat
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active           BOOLEAN      DEFAULT true
);

-- ================================================================
-- STEP 3: Tabel sesi kegiatan (instance per hari per kegiatan)
-- ================================================================
CREATE TABLE IF NOT EXISTS activity_sessions (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  activity_id  UUID        REFERENCES activities(id) ON DELETE CASCADE,
  date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  time_start   TIME        NOT NULL,
  time_end     TIME,
  location     VARCHAR(150),
  officer_id   UUID,                         -- user_id petugas absensi
  status       VARCHAR(20) DEFAULT 'berlangsung'
               CHECK (status IN ('berlangsung','selesai','dibatalkan')),
  notes        TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Satu kegiatan hanya boleh punya 1 sesi aktif per hari
  UNIQUE (tenant_id, activity_id, date)
);

-- ================================================================
-- STEP 4: Tabel rekap absensi siswa per sesi
-- ================================================================
CREATE TABLE IF NOT EXISTS attendances (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  session_id   UUID        REFERENCES activity_sessions(id) ON DELETE CASCADE,
  siswa_id     UUID        REFERENCES siswa(id) ON DELETE CASCADE,
  scan_time    TIMESTAMP WITH TIME ZONE,
  scan_method  VARCHAR(20) DEFAULT 'manual'
               CHECK (scan_method IN ('nfc','qr','barcode','manual')),
  status       VARCHAR(20) NOT NULL DEFAULT 'alpha'
               CHECK (status IN ('hadir','terlambat','alpha','sakit','izin')),
  late_minutes INTEGER     DEFAULT 0,
  notes        TEXT,
  recorded_by  UUID,                         -- user_id yang mencatat
  recorded_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Satu siswa hanya boleh punya 1 record absensi per sesi
  UNIQUE (session_id, siswa_id)
);

-- ================================================================
-- STEP 5: Hybrid ALTER — tambah tenant_id ke tabel lama jika ada
-- ================================================================
DO $$
BEGIN
  -- activity_categories
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_categories' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE activity_categories ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  -- activities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activities' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE activities ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  -- activity_sessions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_sessions' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE activity_sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  -- attendances — tambah tenant_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendances' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE attendances ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;

  -- attendances — ganti student_id lama → siswa_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendances' AND column_name = 'student_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendances' AND column_name = 'siswa_id'
  ) THEN
    ALTER TABLE attendances RENAME COLUMN student_id TO siswa_id;
  END IF;
END $$;

-- ================================================================
-- STEP 6: Index performa
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_act_cat_tenant    ON activity_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_tenant ON activities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activities_cat    ON activities(category_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant   ON activity_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_activity ON activity_sessions(activity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date     ON activity_sessions(date);
CREATE INDEX IF NOT EXISTS idx_attend_tenant     ON attendances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attend_session    ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attend_siswa      ON attendances(siswa_id);
CREATE INDEX IF NOT EXISTS idx_attend_status     ON attendances(status);
CREATE INDEX IF NOT EXISTS idx_attend_recorded   ON attendances(recorded_at);

-- ================================================================
-- STEP 7: Row Level Security
-- ================================================================
ALTER TABLE activity_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances         ENABLE ROW LEVEL SECURITY;

-- activity_categories
DROP POLICY IF EXISTS "Tenant dapat lihat kategori sendiri"  ON activity_categories;
DROP POLICY IF EXISTS "Tenant dapat kelola kategori sendiri" ON activity_categories;
CREATE POLICY "Tenant dapat lihat kategori sendiri"
  ON activity_categories FOR SELECT
  USING (tenant_id = auth.uid());
CREATE POLICY "Tenant dapat kelola kategori sendiri"
  ON activity_categories FOR ALL
  USING (tenant_id = auth.uid());

-- activities
DROP POLICY IF EXISTS "Tenant dapat lihat kegiatan sendiri"  ON activities;
DROP POLICY IF EXISTS "Tenant dapat kelola kegiatan sendiri" ON activities;
CREATE POLICY "Tenant dapat lihat kegiatan sendiri"
  ON activities FOR SELECT
  USING (tenant_id = auth.uid());
CREATE POLICY "Tenant dapat kelola kegiatan sendiri"
  ON activities FOR ALL
  USING (tenant_id = auth.uid());

-- activity_sessions
DROP POLICY IF EXISTS "Tenant dapat lihat sesi sendiri"  ON activity_sessions;
DROP POLICY IF EXISTS "Tenant dapat kelola sesi sendiri" ON activity_sessions;
CREATE POLICY "Tenant dapat lihat sesi sendiri"
  ON activity_sessions FOR SELECT
  USING (tenant_id = auth.uid());
CREATE POLICY "Tenant dapat kelola sesi sendiri"
  ON activity_sessions FOR ALL
  USING (tenant_id = auth.uid());

-- attendances
DROP POLICY IF EXISTS "Tenant dapat lihat absensi sendiri"  ON attendances;
DROP POLICY IF EXISTS "Tenant dapat kelola absensi sendiri" ON attendances;
CREATE POLICY "Tenant dapat lihat absensi sendiri"
  ON attendances FOR SELECT
  USING (tenant_id = auth.uid());
CREATE POLICY "Tenant dapat kelola absensi sendiri"
  ON attendances FOR ALL
  USING (tenant_id = auth.uid());

-- ================================================================
-- STEP 8: Seed data default kategori (opsional, uncomment jika perlu)
-- ================================================================
-- INSERT INTO activity_categories (tenant_id, name, icon, color) VALUES
--   ('TENANT_UUID', 'Sholat',    '🕌', '#10B981'),
--   ('TENANT_UUID', 'Belajar',   '📚', '#3B82F6'),
--   ('TENANT_UUID', 'Olahraga',  '⚽', '#F59E0B'),
--   ('TENANT_UUID', 'Makan',     '🍽️', '#EF4444'),
--   ('TENANT_UUID', 'Tidur',     '😴', '#8B5CF6'),
--   ('TENANT_UUID', 'Ekstrakurikuler', '🎨', '#EC4899')
-- ON CONFLICT DO NOTHING;

-- ================================================================
-- MIGRATION ABSENSI SELESAI
-- ================================================================
COMMIT;

-- ================================================================
-- CONTOH QUERY (jalankan satu per satu setelah migrasi berhasil)
-- ================================================================

-- 1. Buat kategori kegiatan baru
-- INSERT INTO activity_categories (tenant_id, name, icon, color)
-- VALUES ('TENANT_UUID', 'Sholat Subuh', '🕌', '#10B981')
-- RETURNING id, name;

-- 2. Buat kegiatan terjadwal
-- INSERT INTO activities (tenant_id, category_id, name, code, default_time_start, late_tolerance)
-- VALUES ('TENANT_UUID', 'CAT_UUID', 'Sholat Subuh Berjamaah', 'SUBUH', '05:00', 10)
-- RETURNING id, name;

-- 3. Buka sesi absensi hari ini
-- INSERT INTO activity_sessions (tenant_id, activity_id, date, time_start, officer_id, status)
-- VALUES ('TENANT_UUID', 'ACT_UUID', CURRENT_DATE, '05:00', 'USER_UUID', 'berlangsung')
-- RETURNING id, date, status;

-- 4. Catat absensi siswa (hadir)
-- INSERT INTO attendances (tenant_id, session_id, siswa_id, scan_method, status, recorded_by)
-- VALUES ('TENANT_UUID', 'SESSION_UUID', 'SISWA_UUID', 'qr', 'hadir', 'USER_UUID')
-- ON CONFLICT (session_id, siswa_id) DO NOTHING
-- RETURNING id, status;

-- 5. Rekap absensi hari ini untuk satu tenant
-- SELECT
--   s.nama, s.nis,
--   a.status, a.scan_method, a.late_minutes,
--   a.recorded_at
-- FROM attendances a
-- JOIN siswa s ON a.siswa_id = s.id
-- WHERE a.tenant_id = 'TENANT_UUID'
--   AND DATE(a.recorded_at) = CURRENT_DATE
-- ORDER BY a.recorded_at DESC;

-- 6. Statistik kehadiran per siswa bulan ini
-- SELECT
--   s.nama, s.nis,
--   COUNT(*) FILTER (WHERE a.status = 'hadir')     AS hadir,
--   COUNT(*) FILTER (WHERE a.status = 'terlambat') AS terlambat,
--   COUNT(*) FILTER (WHERE a.status = 'alpha')     AS alpha,
--   COUNT(*) FILTER (WHERE a.status = 'sakit')     AS sakit,
--   COUNT(*) FILTER (WHERE a.status = 'izin')      AS izin,
--   COUNT(*)                                        AS total
-- FROM attendances a
-- JOIN siswa s ON a.siswa_id = s.id
-- WHERE a.tenant_id = 'TENANT_UUID'
--   AND DATE_TRUNC('month', a.recorded_at) = DATE_TRUNC('month', CURRENT_DATE)
-- GROUP BY s.id, s.nama, s.nis
-- ORDER BY s.nama;
