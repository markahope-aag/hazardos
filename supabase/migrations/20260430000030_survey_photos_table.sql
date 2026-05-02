-- Migration: survey_photos table — relational replacement for the
-- site_surveys.photo_metadata JSONB array.
--
-- Why a real table:
--   1. The JSONB array forces a read-merge-write of the whole column
--      on every photo upload, which races under concurrent technician
--      uploads (last-write-wins).
--   2. We can't index JSONB across surveys, so questions like "which
--      photos in customer X's history have stamp_status='failed'?"
--      require a full table scan.
--   3. The retention/lifecycle policy needs an indexable expires_at
--      so the daily lifecycle worker can target exactly the rows that
--      need transition without walking JSONB.
--   4. Customer-/job-level photo discovery is now a single indexed
--      query.
--
-- The legacy site_survey_photos table from initial schema is kept as
-- is — it is largely vestigial, used only by a few internal db-test
-- pages, and is not the source of truth for mobile survey captures.
--
-- Strategy: dual-source while we migrate.
--   • New uploads write to survey_photos and skip the JSONB.
--   • Read paths prefer survey_photos and fall back to JSONB.
--   • A follow-up backfill migration unwinds existing JSONB into rows.
--   • Phase 5 drops the JSONB column.

-- ============================================
-- 1. Per-org retention setting
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS photo_retention_days INTEGER NOT NULL DEFAULT 1095;

ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_photo_retention_days_check;

ALTER TABLE organizations
  ADD CONSTRAINT organizations_photo_retention_days_check
  CHECK (photo_retention_days BETWEEN 90 AND 3650);

COMMENT ON COLUMN organizations.photo_retention_days IS
  'How long survey photos (originals + stamped) are retained before deletion. Default 3 years (1095 days). Min 90, max 3650.';

-- ============================================
-- 2. survey_photos table
-- ============================================

CREATE TABLE IF NOT EXISTS survey_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant + entity linkage. customer_id / job_id / company_id are
  -- denormalized at insert time so customer-level queries are O(index)
  -- instead of joining through site_surveys.
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_survey_id UUID NOT NULL REFERENCES site_surveys(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,

  -- Original JSONB photo id (e.g. "photo-1729..."). Lets the backfill
  -- be idempotent — re-running it doesn't double-insert.
  legacy_id TEXT,

  -- User-supplied metadata
  category TEXT NOT NULL DEFAULT 'other',
  location TEXT,
  caption TEXT,
  area_id TEXT,

  -- Capture metadata (forensic pipeline). All optional — older rows
  -- captured before the pipeline existed simply omit them.
  captured_at TIMESTAMPTZ,
  captured_at_source TEXT CHECK (captured_at_source IN ('exif', 'client', 'server')),
  captured_lat DOUBLE PRECISION,
  captured_lng DOUBLE PRECISION,
  device_make TEXT,
  device_model TEXT,
  exif_raw JSONB,

  -- File metadata
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  mime_type TEXT,
  file_size BIGINT,
  file_hash TEXT,

  -- Storage references.
  --   • original_r2_key / stamped_r2_key — canonical store for new
  --     uploads. R2 has zero egress and a single price tier; cheaper
  --     than Supabase Storage and avoids the "two-bucket dance."
  --   • original_supabase_path / stamped_supabase_path — populated
  --     for legacy rows that still live in the survey-photos bucket
  --     until the migrate-to-r2 script copies them. Always NULL for
  --     post-cutover rows.
  original_r2_key TEXT,
  stamped_r2_key TEXT,
  original_supabase_path TEXT,
  stamped_supabase_path TEXT,

  -- Lifecycle.
  --   tier='hot'     — visible in galleries and downloadable
  --   tier='cold'    — admin-retrievable for legal/audit; hidden in
  --                    standard gallery surfaces
  --   tier='deleted' — bytes removed from R2; row kept as audit trail
  tier TEXT NOT NULL DEFAULT 'hot' CHECK (tier IN ('hot', 'cold', 'deleted')),
  tier_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Stamping pipeline status
  stamp_status TEXT CHECK (stamp_status IN ('pending', 'stamped', 'failed', 'skipped')) DEFAULT 'pending',
  stamp_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Either an R2 key or a legacy Supabase path must exist for the
  -- row to point at any actual bytes — except for tier='deleted'
  -- rows where we've intentionally removed everything.
  CONSTRAINT survey_photos_has_storage CHECK (
    tier = 'deleted'
    OR original_r2_key IS NOT NULL
    OR original_supabase_path IS NOT NULL
  )
);

-- ============================================
-- 3. Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_survey_photos_survey
  ON survey_photos(site_survey_id);

CREATE INDEX IF NOT EXISTS idx_survey_photos_org
  ON survey_photos(organization_id);

CREATE INDEX IF NOT EXISTS idx_survey_photos_customer
  ON survey_photos(customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_survey_photos_job
  ON survey_photos(job_id) WHERE job_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_survey_photos_company
  ON survey_photos(company_id) WHERE company_id IS NOT NULL;

-- Lifecycle worker scans by tier+expires; keeps the daily cron O(log n).
CREATE INDEX IF NOT EXISTS idx_survey_photos_lifecycle
  ON survey_photos(tier, expires_at) WHERE tier <> 'deleted';

-- Idempotent backfill key.
CREATE UNIQUE INDEX IF NOT EXISTS idx_survey_photos_legacy_unique
  ON survey_photos(site_survey_id, legacy_id) WHERE legacy_id IS NOT NULL;

-- ============================================
-- 4. Row-level security
-- ============================================

ALTER TABLE survey_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_photos: org members read"
  ON survey_photos FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "survey_photos: org members insert"
  ON survey_photos FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "survey_photos: org members update"
  ON survey_photos FOR UPDATE
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Hard delete is admin-only — the lifecycle worker uses the service
-- role and bypasses RLS, so this only locks down the in-app delete
-- path. Soft delete (tier='deleted') is fine for any role since the
-- update policy above already allows it.
CREATE POLICY "survey_photos: tenant admins delete"
  ON survey_photos FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles
       WHERE id = auth.uid()
         AND role IN ('tenant_owner', 'admin', 'platform_owner', 'platform_admin')
    )
  );

-- ============================================
-- 5. Triggers
-- ============================================

DROP TRIGGER IF EXISTS survey_photos_updated_at ON survey_photos;

CREATE TRIGGER survey_photos_updated_at
  BEFORE UPDATE ON survey_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Recompute expires_at for an org's existing photos when the retention
-- setting changes. Affects every non-deleted row owned by that org;
-- the trigger uses SECURITY DEFINER so a tenant admin updating their
-- own org doesn't need broad UPDATE rights on survey_photos.
CREATE OR REPLACE FUNCTION recompute_survey_photo_expiry_for_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.photo_retention_days IS DISTINCT FROM OLD.photo_retention_days THEN
    UPDATE survey_photos
       SET expires_at = created_at + (NEW.photo_retention_days || ' days')::INTERVAL,
           updated_at = now()
     WHERE organization_id = NEW.id
       AND tier <> 'deleted';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organizations_photo_retention_change ON organizations;

CREATE TRIGGER organizations_photo_retention_change
  AFTER UPDATE OF photo_retention_days ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION recompute_survey_photo_expiry_for_org();

COMMENT ON TABLE survey_photos IS
  'Relational replacement for site_surveys.photo_metadata JSONB. Indexed by survey/customer/job/company; lifecycle-managed by daily cron with per-org retention windows.';
