-- ============================================
-- Multi-Tenant Database Migration Script
-- SaaS Absensi & Manajemen Boarding School
-- ============================================
-- Purpose:
-- 1. Create 'tenants' table for school/pondok data isolation
-- 2. Create 'users' table with tenant_id field for role-based access
-- 3. Create 'santri' table with tenant_id for student data isolation
-- 4. Setup foreign keys and Row Level Security (RLS) policies
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create 'tenants' table (School/Pondok Data)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name VARCHAR(255) NOT NULL UNIQUE,
  school_short_name VARCHAR(50) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  website VARCHAR(255),
  logo_url TEXT,
  
  -- Subscription/Status Fields
  subscription_status VARCHAR(50) DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'suspended')),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ended_at TIMESTAMP WITH TIME ZONE,
  max_students INTEGER DEFAULT 100,
  current_students_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Soft Delete
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- STEP 2: Create 'users' table (Admin, Ustadz, Security, Parents)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- User Identity
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role_id UUID,
  photo TEXT,
  
  -- Login Tracking
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status & Soft Delete
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- STEP 3: Create 'santri' table (Student Data)
-- ============================================
CREATE TABLE IF NOT EXISTS santri (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  
  -- Student Identity
  nis VARCHAR(50) UNIQUE,  -- Nomor Induk Santri
  nisn VARCHAR(20),
  nama VARCHAR(255) NOT NULL,
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(10) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
  
  -- Admission Data
  no_pendaftaran VARCHAR(100) UNIQUE,
  tanggal_daftar DATE DEFAULT CURRENT_DATE,
  status_santri VARCHAR(50) DEFAULT 'aktif' CHECK (status_santri IN ('aktif', 'lulus', 'keluar', 'cuti')),
  
  -- Contact & Guardian
  alamat TEXT,
  no_wali VARCHAR(20),
  nama_wali VARCHAR(255),
  
  -- Asrama (Dormitory) - Optional
  asrama_id UUID,
  
  -- Photos & Documents
  foto_santri TEXT,
  foto_ktp_wali TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status & Soft Delete
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================
-- STEP 4: Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenants_school_name ON tenants(school_name);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_santri_tenant_id ON santri(tenant_id);
CREATE INDEX IF NOT EXISTS idx_santri_nis ON santri(nis);
CREATE INDEX IF NOT EXISTS idx_santri_nisn ON santri(nisn);
CREATE INDEX IF NOT EXISTS idx_santri_no_pendaftaran ON santri(no_pendaftaran);
CREATE INDEX IF NOT EXISTS idx_santri_is_active ON santri(is_active);

-- ============================================
-- STEP 5: Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE santri ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 6: Create RLS Policies
-- ============================================

-- Tenants RLS Policies
DROP POLICY IF EXISTS "Users can view own tenant data" ON tenants;
CREATE POLICY "Users can view own tenant data"
ON tenants FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Admin can manage tenants"
ON tenants FOR ALL
USING (auth.uid() = id);

-- Users RLS Policies
DROP POLICY IF EXISTS "Users can view own tenant users" ON users;
CREATE POLICY "Users can view own tenant users"
ON users FOR SELECT
USING (tenant_id = auth.uid() OR auth.uid() IN (SELECT tenant_id FROM tenants WHERE id = users.tenant_id));

CREATE POLICY "Admin can manage users in tenant"
ON users FOR ALL
USING (tenant_id = auth.uid() OR auth.uid() IN (SELECT tenant_id FROM tenants WHERE id = users.tenant_id));

-- Santri RLS Policies
DROP POLICY IF EXISTS "Users can view own tenant santri" ON santri;
CREATE POLICY "Users can view own tenant santri"
ON santri FOR SELECT
USING (tenant_id = auth.uid() OR auth.uid() IN (SELECT tenant_id FROM tenants WHERE id = santri.tenant_id));

CREATE POLICY "Admin can manage santri in tenant"
ON santri FOR ALL
USING (tenant_id = auth.uid() OR auth.uid() IN (SELECT tenant_id FROM tenants WHERE id = santri.tenant_id));

-- ============================================
-- SEED DATA (Optional - for testing)
-- ============================================
-- Uncomment below if you want to insert sample tenant data

-- INSERT INTO tenants (school_name, school_short_name, address, phone, email, subscription_status)
-- VALUES (
--   'Pondok Pesantren SRT 48 Pasuruan',
--   'SRT 48',
--   'Jl. Raya Pasuruan KM 12,6, Tongas, Pasuruan, Jawa Timur',
--   '0812-3456-7890',
--   'info@srt48pasuruan.sch.id',
--   'active'
-- ) ON CONFLICT (school_name) DO NOTHING;

-- ============================================
-- EXAMPLE QUERIES (Usage Documentation)
-- ============================================
-- Uncomment the queries below one by one to test after migration

-- 1. CREATE NEW TENANT (Register new school/pondok)
-- INSERT INTO tenants (school_name, school_short_name, address, phone, email, subscription_status)
-- VALUES ('Pondok Pesantren X', 'Ponpes X', 'Jl. contoh no 1', '081234567890', 'admin@ponpesx.com', 'active')
-- RETURNING id, school_name;

-- 2. CREATE NEW USER
-- INSERT INTO users (tenant_id, email, name, password_hash, role_id, phone)
-- VALUES ('TENANT_UUID_HERE', 'admin@pondok.com', 'Admin Pondok', '$2a$10$...', 'ROLE_UUID_HERE', '081234567890')
-- RETURNING id, name;

-- 3. CREATE NEW SANTRI
-- INSERT INTO santri (tenant_id, nis, nisn, nama, tempat_lahir, tanggal_lahir, jenis_kelamin, no_pendaftaran)
-- VALUES ('TENANT_UUID_HERE', '2024001', '20240012345', 'Ahmad Santri', 'Pasuruan', '2010-05-15', 'Laki-laki', '2024/001')
-- RETURNING id, nama;

-- 4. GET ALL USERS FOR SPECIFIC TENANT
-- SELECT u.* FROM users u
-- WHERE u.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND u.is_active = true;

-- 5. GET ALL SANTRI FOR SPECIFIC TENANT
-- SELECT s.* FROM santri s
-- WHERE s.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND s.is_active = true;

-- 6. GET SANTRI BY TENANT AND ASRAMA
-- SELECT s.* FROM santri s
-- WHERE s.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND s.asrama_id = 'ASRAMA_UUID_HERE'
-- AND s.is_active = true;

-- 7. SEARCH SANTRI BY NAME (within tenant)
-- SELECT s.* FROM santri s
-- WHERE s.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND s.nama ILIKE '%AHMAD%'
-- AND s.is_active = true;

-- 8. COUNT SANTRI PER TENANT
-- SELECT t.school_name, COUNT(s.id) as total_santri
-- FROM tenants t
-- LEFT JOIN santri s ON t.id = s.tenant_id AND s.is_active = true
-- WHERE t.is_active = true
-- GROUP BY t.id, t.school_name
-- ORDER BY total_santri DESC;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
COMMIT;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Always backup your database before running migrations
-- 2. Run migrations in a transaction (BEGIN/COMMIT) for safety
-- 3. All tables include tenant_id with foreign key to tenants(id)
-- 4. RLS policies ensure data isolation between tenants
-- 5. Foreign keys are set to ON DELETE SET NULL to preserve historical data
-- 6. Indexes are created for optimal query performance on tenant_id
-- 7. Soft delete (is_active, deleted_at) implemented on all tables
-- 8. All tables support Row Level Security (RLS) enabled
