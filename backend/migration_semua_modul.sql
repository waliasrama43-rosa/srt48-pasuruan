-- ================================================================
-- Migration: Semua Tabel Modul — SaaS Boarding School
-- ================================================================
-- Jalankan SETELAH migration_tenant.sql dan migration_absensi.sql
-- Urutan: roles → otp_codes → subjects → grades → asrama →
--         rooms → health_records → items → item_stocks →
--         item_distributions → announcements → violations →
--         student_talents → achievements → counseling_records
-- Strategi: CREATE IF NOT EXISTS + ALTER ADD COLUMN IF NOT EXISTS
-- ================================================================

BEGIN;

-- ================================================================
-- 1. ROLES & PERMISSIONS (RBAC)
-- ================================================================
CREATE TABLE IF NOT EXISTS roles (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50)  NOT NULL,  -- 'super_admin','tenant_admin','guru','keamanan','ortu'
  permissions JSONB        DEFAULT '[]',
  is_system   BOOLEAN      DEFAULT false, -- true = tidak bisa dihapus
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed role standar (tanpa tenant_id = global/system roles)
INSERT INTO roles (name, slug, is_system) VALUES
  ('Super Admin',    'super_admin',   true),
  ('Tenant Admin',   'tenant_admin',  true),
  ('Guru/Ustadz',    'guru',          true),
  ('Keamanan',       'keamanan',      true),
  ('Orang Tua',      'ortu',          true)
ON CONFLICT DO NOTHING;

-- Tambah foreign key role_id di users ke tabel roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role_slug'
  ) THEN
    ALTER TABLE users ADD COLUMN role_slug VARCHAR(50) DEFAULT 'guru';
  END IF;
END $$;

-- ================================================================
-- 2. OTP CODES
-- ================================================================
CREATE TABLE IF NOT EXISTS otp_codes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES users(id) ON DELETE CASCADE,
  phone       VARCHAR(20),
  code        VARCHAR(10) NOT NULL,
  type        VARCHAR(30) DEFAULT 'login',
  is_used     BOOLEAN     DEFAULT false,
  expired_at  TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone     ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_otp_user      ON otp_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_expired   ON otp_codes(expired_at);

-- ================================================================
-- 3. MATA PELAJARAN / SUBJECTS
-- ================================================================
CREATE TABLE IF NOT EXISTS subjects (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(20),
  category    VARCHAR(50), -- 'agama','umum','muatan_lokal'
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_tenant ON subjects(tenant_id);

-- ================================================================
-- 4. NILAI / GRADES
-- ================================================================
CREATE TABLE IF NOT EXISTS grades (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  student_id    UUID        REFERENCES siswa(id)   ON DELETE CASCADE,
  subject_id    UUID        REFERENCES subjects(id) ON DELETE SET NULL,
  semester      INTEGER     NOT NULL CHECK (semester IN (1, 2)),
  year          VARCHAR(9)  NOT NULL, -- e.g. '2024/2025'
  daily_score   NUMERIC(5,2),
  mid_score     NUMERIC(5,2),
  final_score   NUMERIC(5,2),
  final_grade   NUMERIC(5,2),
  grade_letter  VARCHAR(2),
  catatan       TEXT,
  is_archived   BOOLEAN     DEFAULT false,
  created_by    UUID,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE (tenant_id, student_id, subject_id, semester, year)
);

CREATE INDEX IF NOT EXISTS idx_grades_tenant    ON grades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_grades_student   ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject   ON grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_year      ON grades(year, semester);

-- ================================================================
-- 5. ASRAMA / DORMITORIES
-- ================================================================
CREATE TABLE IF NOT EXISTS asrama (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(150) NOT NULL,
  capacity    INTEGER      DEFAULT 0,
  gender      VARCHAR(15)  CHECK (gender IN ('Laki-laki','Perempuan','Campuran')),
  supervisor_id UUID,      -- user_id pengurus asrama
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asrama_tenant ON asrama(tenant_id);

-- Tambah FK asrama_id di tabel siswa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_siswa_asrama' AND table_name = 'siswa'
  ) THEN
    ALTER TABLE siswa
      ADD CONSTRAINT fk_siswa_asrama
      FOREIGN KEY (asrama_id) REFERENCES asrama(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- 6. KAMAR / ROOMS
-- ================================================================
CREATE TABLE IF NOT EXISTS rooms (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  asrama_id   UUID         REFERENCES asrama(id)  ON DELETE CASCADE,
  name        VARCHAR(50)  NOT NULL,
  capacity    INTEGER      DEFAULT 4,
  is_active   BOOLEAN      DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rooms_asrama ON rooms(asrama_id);

-- ================================================================
-- 7. CATATAN KESEHATAN / HEALTH RECORDS
-- ================================================================
CREATE TABLE IF NOT EXISTS health_records (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID        REFERENCES siswa(id)   ON DELETE CASCADE,
  visit_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  visit_time      TIME,
  keluhan         TEXT        NOT NULL,
  suhu_tubuh      NUMERIC(4,1),
  tindakan        TEXT,
  obat_diberikan  TEXT,
  need_rest       BOOLEAN     DEFAULT false,
  is_referred     BOOLEAN     DEFAULT false,
  referred_to     VARCHAR(200),
  notes           TEXT,
  officer_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_tenant   ON health_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_student  ON health_records(student_id);
CREATE INDEX IF NOT EXISTS idx_health_date     ON health_records(visit_date);

-- ================================================================
-- 8. PERLENGKAPAN / ITEMS
-- ================================================================
CREATE TABLE IF NOT EXISTS items (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  code        VARCHAR(50),
  category    VARCHAR(100),
  unit        VARCHAR(30)  DEFAULT 'pcs',
  stock       INTEGER      DEFAULT 0,
  description TEXT,
  created_by  UUID,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);

-- ================================================================
-- 9. STOK MASUK / ITEM STOCKS
-- ================================================================
CREATE TABLE IF NOT EXISTS item_stocks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  item_id     UUID        REFERENCES items(id)   ON DELETE CASCADE,
  type        VARCHAR(10) DEFAULT 'masuk' CHECK (type IN ('masuk','keluar')),
  jumlah      INTEGER     NOT NULL,
  keterangan  TEXT,
  tanggal     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by  UUID
);

CREATE INDEX IF NOT EXISTS idx_item_stocks_tenant ON item_stocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_item_stocks_item   ON item_stocks(item_id);

-- ================================================================
-- 10. DISTRIBUSI PERLENGKAPAN / ITEM DISTRIBUTIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS item_distributions (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  student_id      UUID        REFERENCES siswa(id)   ON DELETE CASCADE,
  item_id         UUID        REFERENCES items(id)   ON DELETE CASCADE,
  jumlah          INTEGER     NOT NULL,
  ukuran          VARCHAR(20),
  keterangan      TEXT,
  tanggal         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status          VARCHAR(20) DEFAULT 'diterima',
  distributed_by  UUID
);

CREATE INDEX IF NOT EXISTS idx_dist_tenant  ON item_distributions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dist_student ON item_distributions(student_id);
CREATE INDEX IF NOT EXISTS idx_dist_item    ON item_distributions(item_id);

-- ================================================================
-- 11. PENGUMUMAN / ANNOUNCEMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id    UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  content      TEXT        NOT NULL,
  target       VARCHAR(50) DEFAULT 'semua',
  is_broadcast BOOLEAN     DEFAULT false,
  is_active    BOOLEAN     DEFAULT true,
  created_by   UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announce_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announce_active ON announcements(is_active);

-- ================================================================
-- 12. PELANGGARAN / VIOLATIONS
-- ================================================================
CREATE TABLE IF NOT EXISTS violations (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  UUID        REFERENCES siswa(id)   ON DELETE CASCADE,
  type        VARCHAR(100),
  description TEXT        NOT NULL,
  points      INTEGER     DEFAULT 0,
  action      TEXT,
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  officer_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_violations_tenant  ON violations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_violations_student ON violations(student_id);
CREATE INDEX IF NOT EXISTS idx_violations_date    ON violations(date);

-- ================================================================
-- 13. BAKAT MINAT / STUDENT TALENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS talent_categories (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  icon       VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_talents (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  student_id       UUID         REFERENCES siswa(id)   ON DELETE CASCADE,
  category_id      UUID         REFERENCES talent_categories(id) ON DELETE SET NULL,
  talent_name      VARCHAR(200) NOT NULL,
  level            VARCHAR(50)  DEFAULT 'Pemula',
  description      TEXT,
  discovered_by    UUID,
  discovered_date  DATE,
  is_active        BOOLEAN      DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_talents_tenant  ON student_talents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_talents_student ON student_talents(student_id);

-- ================================================================
-- 14. PRESTASI / ACHIEVEMENTS
-- ================================================================
CREATE TABLE IF NOT EXISTS achievements (
  id          UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID         REFERENCES tenants(id) ON DELETE CASCADE,
  student_id  UUID         REFERENCES siswa(id)   ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(100) DEFAULT 'Umum',
  level       VARCHAR(50)  DEFAULT 'Sekolah',
  rank        VARCHAR(50),
  event_name  VARCHAR(255),
  event_date  DATE,
  organizer   VARCHAR(255),
  notes       TEXT,
  verified_by UUID,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_achieve_tenant  ON achievements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_achieve_student ON achievements(student_id);

-- ================================================================
-- 15. KONSELING / COUNSELING RECORDS
-- ================================================================
CREATE TABLE IF NOT EXISTS counseling_records (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        UUID        REFERENCES tenants(id) ON DELETE CASCADE,
  student_id       UUID        REFERENCES siswa(id)   ON DELETE CASCADE,
  counselor_id     UUID        REFERENCES users(id)   ON DELETE SET NULL,
  topic            VARCHAR(255) NOT NULL,
  type             VARCHAR(50) DEFAULT 'Umum',
  notes            TEXT,
  follow_up        TEXT,
  next_session     DATE,
  session_date     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_confidential  BOOLEAN     DEFAULT true,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_counsel_tenant  ON counseling_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_counsel_student ON counseling_records(student_id);

-- ================================================================
-- 16. KOLOM TAMBAHAN — hybrid alter untuk kolom yang mungkin kurang
-- ================================================================
DO $$
BEGIN
  -- users: tambah password_hash jika belum ada (kompatibel dgn kolom 'password' lama)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users ADD COLUMN password_hash TEXT;
    -- Salin nilai dari kolom lama jika ada
    UPDATE users SET password_hash = password WHERE password_hash IS NULL;
  END IF;

  -- siswa: tambah room_id jika belum ada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'siswa' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE siswa ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================================================
-- 17. ROW LEVEL SECURITY — aktifkan untuk semua tabel baru
-- ================================================================
ALTER TABLE roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades             ENABLE ROW LEVEL SECURITY;
ALTER TABLE asrama             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms              ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_stocks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE talent_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_talents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE counseling_records ENABLE ROW LEVEL SECURITY;

-- Macro: semua tabel bertenant hanya bisa diakses user dgn tenant_id yang sama
-- (Policies di-drop dulu agar idempotent)

DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'subjects','grades','asrama','rooms','health_records',
    'items','item_stocks','item_distributions','announcements',
    'violations','talent_categories','student_talents',
    'achievements','counseling_records'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON %I', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_all_%s"    ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON %I FOR SELECT USING (tenant_id = auth.uid())',
      tbl, tbl
    );
    EXECUTE format(
      'CREATE POLICY "tenant_all_%s"    ON %I FOR ALL    USING (tenant_id = auth.uid())',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ================================================================
-- MIGRATION SELESAI
-- ================================================================
COMMIT;

-- ================================================================
-- SEED DATA OPSIONAL (uncomment sesuai kebutuhan)
-- ================================================================

-- Daftarkan SRT 48 sebagai tenant pertama:
-- INSERT INTO tenants (school_name, school_short_name, address, phone, email, subscription_status)
-- VALUES ('Pondok Pesantren SRT 48 Pasuruan', 'SRT 48',
--         'Jl. Raya Pasuruan, Jawa Timur', '0812-3456-7890',
--         'info@srt48.sch.id', 'active')
-- ON CONFLICT (school_name) DO NOTHING
-- RETURNING id;

-- Tambah mata pelajaran dasar (ganti TENANT_UUID):
-- INSERT INTO subjects (tenant_id, name, code, category) VALUES
--   ('TENANT_UUID', 'Al-Quran',          'QRN', 'agama'),
--   ('TENANT_UUID', 'Fiqih',             'FQH', 'agama'),
--   ('TENANT_UUID', 'Bahasa Indonesia',  'BIN', 'umum'),
--   ('TENANT_UUID', 'Matematika',        'MTK', 'umum'),
--   ('TENANT_UUID', 'Bahasa Inggris',    'BIG', 'umum'),
--   ('TENANT_UUID', 'IPA',               'IPA', 'umum')
-- ON CONFLICT DO NOTHING;

-- Tambah asrama default (ganti TENANT_UUID):
-- INSERT INTO asrama (tenant_id, name, capacity, gender) VALUES
--   ('TENANT_UUID', 'Asrama Putra Al-Amin',  60, 'Laki-laki'),
--   ('TENANT_UUID', 'Asrama Putri Ar-Rahma', 60, 'Perempuan')
-- ON CONFLICT DO NOTHING;
