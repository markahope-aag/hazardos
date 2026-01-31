-- Migration: Rename Assessments to Site Surveys
-- This script renames all assessment-related tables, columns, and references to use "site_surveys" terminology

-- Step 1: Rename the main table
ALTER TABLE assessments RENAME TO site_surveys;

-- Step 2: Rename the photos table and update foreign key reference
ALTER TABLE assessment_photos RENAME TO site_survey_photos;
ALTER TABLE site_survey_photos RENAME COLUMN assessment_id TO site_survey_id;

-- Step 3: Update foreign key constraint names
ALTER TABLE site_survey_photos 
  DROP CONSTRAINT IF EXISTS assessment_photos_assessment_id_fkey;

ALTER TABLE site_survey_photos 
  ADD CONSTRAINT site_survey_photos_site_survey_id_fkey 
  FOREIGN KEY (site_survey_id) REFERENCES site_surveys(id) ON DELETE CASCADE;

-- Step 4: Rename indexes
DROP INDEX IF EXISTS idx_assessment_photos_assessment_id;
DROP INDEX IF EXISTS idx_assessment_photos_organization_id;
DROP INDEX IF EXISTS idx_assessment_photos_created_at;
DROP INDEX IF EXISTS idx_assessments_organization_id;
DROP INDEX IF EXISTS idx_assessments_status;

CREATE INDEX IF NOT EXISTS idx_site_survey_photos_site_survey_id ON site_survey_photos(site_survey_id);
CREATE INDEX IF NOT EXISTS idx_site_survey_photos_organization_id ON site_survey_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_survey_photos_created_at ON site_survey_photos(created_at);
CREATE INDEX IF NOT EXISTS idx_site_surveys_organization_id ON site_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);

-- Step 5: Update trigger names
DROP TRIGGER IF EXISTS set_updated_at_assessment_photos ON site_survey_photos;
DROP TRIGGER IF EXISTS set_updated_at_assessments ON site_surveys;

CREATE TRIGGER set_updated_at_site_survey_photos
  BEFORE UPDATE ON site_survey_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at_site_surveys
  BEFORE UPDATE ON site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 6: Update RLS policy names for site_surveys table
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can insert assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can delete assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Platform owners can access all assessments" ON site_surveys;

CREATE POLICY "Users can view site surveys in their organization" ON site_surveys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = site_surveys.organization_id
    )
  );

CREATE POLICY "Users can insert site surveys in their organization" ON site_surveys
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = site_surveys.organization_id
    )
  );

CREATE POLICY "Users can update site surveys in their organization" ON site_surveys
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = site_surveys.organization_id
    )
  );

CREATE POLICY "Users can delete site surveys in their organization" ON site_surveys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = site_surveys.organization_id
    )
  );

CREATE POLICY "Platform owners can access all site surveys" ON site_surveys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- Step 7: Update RLS policy names for site_survey_photos table
DROP POLICY IF EXISTS "Users can view assessment photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can insert assessment photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update assessment photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can delete assessment photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Platform owners can access all assessment photos" ON site_survey_photos;

CREATE POLICY "Users can view site survey photos in their organization" ON site_survey_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM site_surveys s
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = site_survey_photos.site_survey_id
      AND s.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can insert site survey photos in their organization" ON site_survey_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM site_surveys s
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = site_survey_photos.site_survey_id
      AND s.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can update site survey photos in their organization" ON site_survey_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM site_surveys s
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = site_survey_photos.site_survey_id
      AND s.organization_id = p.organization_id
    )
  );

CREATE POLICY "Users can delete site survey photos in their organization" ON site_survey_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM site_surveys s
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = site_survey_photos.site_survey_id
      AND s.organization_id = p.organization_id
    )
  );

CREATE POLICY "Platform owners can access all site survey photos" ON site_survey_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- Step 8: Update custom type name
ALTER TYPE assessment_status RENAME TO site_survey_status;

-- Step 9: Add comments to document the change
COMMENT ON TABLE site_surveys IS 'Site surveys (formerly assessments) - field data collection for environmental remediation projects';
COMMENT ON TABLE site_survey_photos IS 'Photos and videos associated with site surveys (formerly assessment_photos)';
COMMENT ON COLUMN site_survey_photos.site_survey_id IS 'Foreign key reference to site_surveys table (formerly assessment_id)';

-- Verification queries to confirm the migration
-- These will show in the migration output
DO $$
DECLARE
    site_surveys_count INTEGER;
    photos_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO site_surveys_count FROM site_surveys;
    SELECT COUNT(*) INTO photos_count FROM site_survey_photos;
    
    RAISE NOTICE 'Migration completed successfully:';
    RAISE NOTICE '- site_surveys table: % records', site_surveys_count;
    RAISE NOTICE '- site_survey_photos table: % records', photos_count;
    RAISE NOTICE 'Tables renamed from assessments -> site_surveys';
    RAISE NOTICE 'Custom type renamed: assessment_status -> site_survey_status';
END $$;