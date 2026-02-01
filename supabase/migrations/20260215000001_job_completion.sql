-- ============================================
-- JOB COMPLETION SYSTEM
-- Phase 4: Job completion tracking with detailed time, materials, photos, and checklists
-- ============================================

-- ============================================
-- JOB TIME ENTRIES
-- Track detailed crew time per job (separate from job_crew clock in/out)
-- ============================================
CREATE TABLE IF NOT EXISTS job_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Time entry details
  work_date DATE NOT NULL,
  hours DECIMAL(5, 2) NOT NULL,
  work_type VARCHAR(100) NOT NULL DEFAULT 'regular',
  -- 'regular', 'overtime', 'travel', 'setup', 'cleanup', 'supervision'

  -- Billing info
  hourly_rate DECIMAL(10, 2),
  billable BOOLEAN DEFAULT TRUE,

  -- Notes
  description TEXT,
  notes TEXT,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB MATERIAL USAGE
-- Track actual materials used vs estimated (links to job_materials for comparison)
-- ============================================
CREATE TABLE IF NOT EXISTS job_material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  job_material_id UUID REFERENCES job_materials(id) ON DELETE SET NULL,

  -- Material details
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100),

  -- Quantities
  quantity_estimated DECIMAL(10, 2),
  quantity_used DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),

  -- Costs
  unit_cost DECIMAL(10, 2),
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (
    CASE WHEN unit_cost IS NOT NULL THEN quantity_used * unit_cost ELSE NULL END
  ) STORED,

  -- Variance tracking
  variance_quantity DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity_estimated IS NOT NULL THEN quantity_used - quantity_estimated ELSE NULL END
  ) STORED,
  variance_percent DECIMAL(5, 2) GENERATED ALWAYS AS (
    CASE WHEN quantity_estimated IS NOT NULL AND quantity_estimated > 0
      THEN ((quantity_used - quantity_estimated) / quantity_estimated * 100)
      ELSE NULL END
  ) STORED,

  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETION PHOTOS
-- Before/during/after photos with metadata
-- ============================================
CREATE TABLE IF NOT EXISTS job_completion_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Photo details
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  storage_path TEXT NOT NULL,

  -- Classification
  photo_type VARCHAR(50) NOT NULL DEFAULT 'during',
  -- 'before', 'during', 'after', 'issue', 'documentation'

  -- Metadata
  caption TEXT,
  taken_at TIMESTAMPTZ,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),

  -- EXIF data
  camera_make VARCHAR(100),
  camera_model VARCHAR(100),
  image_width INTEGER,
  image_height INTEGER,

  -- File info
  file_name VARCHAR(255),
  file_size INTEGER,
  mime_type VARCHAR(100),

  -- Audit
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETION CHECKLISTS
-- Safety, quality, cleanup, documentation checklists
-- ============================================
CREATE TABLE IF NOT EXISTS job_completion_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Checklist item details
  category VARCHAR(50) NOT NULL,
  -- 'safety', 'quality', 'cleanup', 'documentation', 'custom'

  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  sort_order INTEGER DEFAULT 0,

  -- Completion
  is_required BOOLEAN DEFAULT TRUE,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  completion_notes TEXT,

  -- Photos/evidence
  evidence_photo_ids UUID[] DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- JOB COMPLETIONS
-- Summary record with variance calculations
-- ============================================
CREATE TABLE IF NOT EXISTS job_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- 'draft', 'submitted', 'approved', 'rejected'

  -- Estimated values (copied from job/estimate for comparison)
  estimated_hours DECIMAL(8, 2),
  estimated_material_cost DECIMAL(12, 2),
  estimated_total DECIMAL(12, 2),

  -- Actual values (calculated from entries)
  actual_hours DECIMAL(8, 2),
  actual_material_cost DECIMAL(12, 2),
  actual_labor_cost DECIMAL(12, 2),
  actual_total DECIMAL(12, 2),

  -- Variance summary
  hours_variance DECIMAL(8, 2),
  hours_variance_percent DECIMAL(5, 2),
  cost_variance DECIMAL(12, 2),
  cost_variance_percent DECIMAL(5, 2),

  -- Completion details
  field_notes TEXT,
  issues_encountered TEXT,
  recommendations TEXT,

  -- Submission
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES profiles(id),

  -- Review
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  rejection_reason TEXT,

  -- Customer sign-off
  customer_signed BOOLEAN DEFAULT FALSE,
  customer_signed_at TIMESTAMPTZ,
  customer_signature_name VARCHAR(255),
  customer_signature_data TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(job_id)
);

-- ============================================
-- ALTER JOBS TABLE
-- Add completion tracking fields
-- ============================================
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS completion_id UUID REFERENCES job_completions(id),
  ADD COLUMN IF NOT EXISTS actual_start_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_duration_days INTEGER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job ON job_time_entries(job_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_profile ON job_time_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_job_time_entries_date ON job_time_entries(work_date);

CREATE INDEX IF NOT EXISTS idx_job_material_usage_job ON job_material_usage(job_id);
CREATE INDEX IF NOT EXISTS idx_job_material_usage_material ON job_material_usage(job_material_id);

CREATE INDEX IF NOT EXISTS idx_job_completion_photos_job ON job_completion_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completion_photos_type ON job_completion_photos(photo_type);

CREATE INDEX IF NOT EXISTS idx_job_completion_checklists_job ON job_completion_checklists(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completion_checklists_category ON job_completion_checklists(category);

CREATE INDEX IF NOT EXISTS idx_job_completions_job ON job_completions(job_id);
CREATE INDEX IF NOT EXISTS idx_job_completions_status ON job_completions(status);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE job_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completion_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completion_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_completions ENABLE ROW LEVEL SECURITY;

-- Time entries
DROP POLICY IF EXISTS "Users can manage time entries for their org jobs" ON job_time_entries;
CREATE POLICY "Users can manage time entries for their org jobs"
  ON job_time_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_time_entries.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Material usage
DROP POLICY IF EXISTS "Users can manage material usage for their org jobs" ON job_material_usage;
CREATE POLICY "Users can manage material usage for their org jobs"
  ON job_material_usage FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_material_usage.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Completion photos
DROP POLICY IF EXISTS "Users can manage completion photos for their org jobs" ON job_completion_photos;
CREATE POLICY "Users can manage completion photos for their org jobs"
  ON job_completion_photos FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completion_photos.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Completion checklists
DROP POLICY IF EXISTS "Users can manage checklists for their org jobs" ON job_completion_checklists;
CREATE POLICY "Users can manage checklists for their org jobs"
  ON job_completion_checklists FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completion_checklists.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- Job completions
DROP POLICY IF EXISTS "Users can manage completions for their org jobs" ON job_completions;
CREATE POLICY "Users can manage completions for their org jobs"
  ON job_completions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = job_completions.job_id
    AND jobs.organization_id = get_user_organization_id()
  ));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update job_time_entries updated_at
CREATE OR REPLACE FUNCTION update_job_time_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_time_entries_updated_at ON job_time_entries;
CREATE TRIGGER job_time_entries_updated_at
  BEFORE UPDATE ON job_time_entries
  FOR EACH ROW EXECUTE FUNCTION update_job_time_entries_updated_at();

-- Update job_completion_checklists updated_at
CREATE OR REPLACE FUNCTION update_job_completion_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_completion_checklists_updated_at ON job_completion_checklists;
CREATE TRIGGER job_completion_checklists_updated_at
  BEFORE UPDATE ON job_completion_checklists
  FOR EACH ROW EXECUTE FUNCTION update_job_completion_checklists_updated_at();

-- Update job_completions updated_at
CREATE OR REPLACE FUNCTION update_job_completions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_completions_updated_at ON job_completions;
CREATE TRIGGER job_completions_updated_at
  BEFORE UPDATE ON job_completions
  FOR EACH ROW EXECUTE FUNCTION update_job_completions_updated_at();

-- ============================================
-- DEFAULT CHECKLIST ITEMS
-- Function to initialize standard checklist for a job
-- ============================================
CREATE OR REPLACE FUNCTION initialize_job_checklist(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Safety items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'safety', 'PPE Used Properly', 'All crew wore required PPE throughout the job', 1, true),
    (p_job_id, 'safety', 'Safety Perimeter Maintained', 'Work area was properly cordoned off', 2, true),
    (p_job_id, 'safety', 'No Incidents Reported', 'No safety incidents or near-misses occurred', 3, true),
    (p_job_id, 'safety', 'Air Quality Monitored', 'Air quality monitoring was performed as required', 4, false);

  -- Quality items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'quality', 'Work Meets Specifications', 'All work completed to specification and standards', 1, true),
    (p_job_id, 'quality', 'Materials Properly Contained', 'Hazardous materials properly contained and sealed', 2, true),
    (p_job_id, 'quality', 'Area Clearance Testing', 'Post-work testing confirms safe levels', 3, false);

  -- Cleanup items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'cleanup', 'Work Area Cleaned', 'All debris and waste removed from work area', 1, true),
    (p_job_id, 'cleanup', 'Equipment Cleaned', 'All equipment properly decontaminated', 2, true),
    (p_job_id, 'cleanup', 'Waste Properly Bagged', 'All hazardous waste properly bagged and labeled', 3, true),
    (p_job_id, 'cleanup', 'Disposal Manifests Completed', 'Disposal documentation is complete', 4, true);

  -- Documentation items
  INSERT INTO job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'documentation', 'Before Photos Taken', 'Photos taken before work began', 1, true),
    (p_job_id, 'documentation', 'After Photos Taken', 'Photos taken after work completed', 2, true),
    (p_job_id, 'documentation', 'Time Entries Complete', 'All crew time entries recorded', 3, true),
    (p_job_id, 'documentation', 'Material Usage Recorded', 'All materials used have been recorded', 4, true);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VARIANCE CALCULATION FUNCTION
-- Calculate and update completion variance
-- ============================================
CREATE OR REPLACE FUNCTION calculate_completion_variance(p_completion_id UUID)
RETURNS VOID AS $$
DECLARE
  v_job_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_material_cost DECIMAL(12, 2);
BEGIN
  -- Get job_id
  SELECT job_id INTO v_job_id FROM job_completions WHERE id = p_completion_id;

  -- Calculate actual hours from time entries
  SELECT COALESCE(SUM(hours), 0) INTO v_actual_hours
  FROM job_time_entries WHERE job_id = v_job_id;

  -- Calculate actual material cost from usage
  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = v_job_id;

  -- Get estimated values from job
  SELECT estimated_duration_hours, contract_amount
  INTO v_estimated_hours, v_estimated_material_cost
  FROM jobs WHERE id = v_job_id;

  -- Update completion record
  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL
      THEN v_actual_hours - v_estimated_hours ELSE NULL END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100) ELSE NULL END,
    cost_variance = CASE WHEN v_estimated_material_cost IS NOT NULL
      THEN v_actual_material_cost - v_estimated_material_cost ELSE NULL END,
    cost_variance_percent = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN ((v_actual_material_cost - v_estimated_material_cost) / v_estimated_material_cost * 100) ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_completion_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET (comment for manual setup)
-- ============================================
-- Run this in Supabase SQL Editor after migration:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-completion-photos', 'job-completion-photos', true);
--
-- Storage policies (run separately):
-- CREATE POLICY "Authenticated users can upload photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Anyone can view photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'job-completion-photos');
--
-- CREATE POLICY "Users can delete their org photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'job-completion-photos' AND auth.role() = 'authenticated');
