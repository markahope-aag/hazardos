-- Fix missing tables that were skipped during partial migration

-- Job materials table (from 20260201000010_jobs_system.sql)
CREATE TABLE IF NOT EXISTS job_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100),
  quantity_estimated DECIMAL(10, 2),
  quantity_used DECIMAL(10, 2),
  unit VARCHAR(50),
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job disposal table
CREATE TABLE IF NOT EXISTS job_disposal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  hazard_type VARCHAR(50) NOT NULL,
  disposal_type VARCHAR(100),
  waste_manifest_number VARCHAR(100),
  disposal_facility VARCHAR(255),
  quantity DECIMAL(10, 2),
  unit VARCHAR(50),
  cost DECIMAL(10, 2),
  disposal_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job equipment table
CREATE TABLE IF NOT EXISTS job_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  equipment_name VARCHAR(255) NOT NULL,
  equipment_type VARCHAR(100),
  rental_days INTEGER,
  daily_rate DECIMAL(10, 2),
  total_cost DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns to jobs if needed
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'customer_id') THEN
    ALTER TABLE jobs ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_materials_job ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_job_disposal_job ON job_disposal(job_id);
CREATE INDEX IF NOT EXISTS idx_job_equipment_job ON job_equipment(job_id);

-- Enable RLS
ALTER TABLE job_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_disposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_equipment ENABLE ROW LEVEL SECURITY;
