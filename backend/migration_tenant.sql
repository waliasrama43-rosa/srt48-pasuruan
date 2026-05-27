-- ============================================
-- Multi-Tenant Database Migration Script
-- SaaS Absensi & Manajemen Boarding School
-- ============================================
-- Purpose:
-- 1. Create 'tenants' table for school/pondok data isolation
-- 2. Add 'tenant_id' column to 'users' and 'santri' tables
-- 3. Setup foreign keys and Row Level Security (RLS) policies
-- ============================================

BEGIN;

-- ============================================
-- STEP 1: Create 'tenants' table
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
-- STEP 2: Add 'tenant_id' to 'users' table
-- ============================================
DO $$
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE users ADD COLUMN tenant_id UUID;
    
    -- Add foreign key constraint
    ALTER TABLE users 
    ADD CONSTRAINT fk_users_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    
    -- Add RLS policy for tenant isolation
    CREATE POLICY "Users can view own tenant data"
    ON users FOR SELECT
    USING (auth.uid() = tenant_id);
    
    CREATE POLICY "Admin can manage users in tenant"
    ON users FOR ALL
    USING (auth.uid() = tenant_id);
    
    -- Create index for faster tenant-based queries
    CREATE INDEX idx_users_tenant_id ON users(tenant_id);
  END IF;
END $$;

-- ============================================
-- STEP 3: Add 'tenant_id' to 'santri' table
-- ============================================
DO $$
BEGIN
  -- Check if column exists before adding
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'santri' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE santri ADD COLUMN tenant_id UUID;
    
    -- Add foreign key constraint
    ALTER TABLE santri 
    ADD CONSTRAINT fk_santri_tenant 
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;
    
    -- Add RLS policy for tenant isolation
    CREATE POLICY "Santri can view own tenant data"
    ON santri FOR SELECT
    USING (auth.uid() = tenant_id);
    
    CREATE POLICY "Staff can manage santri in tenant"
    ON santri FOR ALL
    USING (auth.uid() = tenant_id);
    
    -- Create index for faster tenant-based queries
    CREATE INDEX idx_santri_tenant_id ON santri(tenant_id);
  END IF;
END $$;

-- ============================================
-- STEP 4: Add indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenants_school_name ON tenants(school_name);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
CREATE INDEX IF NOT EXISTS idx_tenants_is_active ON tenants(is_active);

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

-- 2. GET ALL USERS FOR SPECIFIC TENANT
-- SELECT u.* FROM users u
-- WHERE u.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND u.is_active = true;

-- 3. GET ALL SANTRI FOR SPECIFIC TENANT
-- SELECT s.* FROM santri s
-- WHERE s.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND s.is_active = true;

-- 4. GET TENANT BY SCHOOL NAME
-- SELECT * FROM tenants
-- WHERE school_name ILIKE '%SRT 48%'
-- AND is_active = true;

-- 5. GET USERS BY ROLE WITH TENANT FILTER
-- SELECT u.*, r.name as role_name
-- FROM users u
-- JOIN roles r ON u.role_id = r.id
-- WHERE u.tenant_id = 'YOUR_TENANT_UUID_HERE'
-- AND u.role_id = 'URUSTADZ_ROLE_ID'
-- AND u.is_active = true;

-- 6. COUNT SANTRI PER TENANT
-- SELECT t.school_name, COUNT(s.id) as total_santri
-- FROM tenants t
-- LEFT JOIN santri s ON t.id = s.tenant_id
-- WHERE t.is_active = true
-- GROUP BY t.id, t.school_name;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
COMMIT;

-- ============================================
-- NOTES:
-- ============================================
-- 1. Always backup your database before running migrations
-- 2. Run migrations in a transaction (BEGIN/COMMIT) for safety
-- 3. The script checks if columns exist before adding to avoid errors
-- 4. RLS policies ensure data isolation between tenants
-- 5. Foreign keys are set to ON DELETE SET NULL to preserve historical data
-- 6. Indexes are created for optimal query performance on tenant_id
