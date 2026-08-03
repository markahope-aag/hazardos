-- Migration: Rename Assessments to Site Surveys
-- This script is IDEMPOTENT - safe to run multiple times
-- It checks for table existence before making changes

-- Helper function to check if a table exists
CREATE OR REPLACE FUNCTION table_exists(tbl_name text) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = tbl_name
    );
END;
$$ LANGUAGE plpgsql;

-- Main migration block
DO $$
BEGIN
    -- Step 1: Rename assessments -> site_surveys (if assessments exists)
    IF table_exists('assessments') AND NOT table_exists('site_surveys') THEN
        ALTER TABLE assessments RENAME TO site_surveys;
        RAISE NOTICE 'Renamed assessments -> site_surveys';
    ELSIF table_exists('site_surveys') THEN
        RAISE NOTICE 'site_surveys table already exists, skipping rename';
    ELSE
        RAISE NOTICE 'Neither assessments nor site_surveys found - check your schema';
    END IF;

    -- Step 2: Rename photos -> site_survey_photos (if photos exists)
    IF table_exists('photos') AND NOT table_exists('site_survey_photos') THEN
        ALTER TABLE photos RENAME TO site_survey_photos;
        RAISE NOTICE 'Renamed photos -> site_survey_photos';
    ELSIF table_exists('site_survey_photos') THEN
        RAISE NOTICE 'site_survey_photos table already exists, skipping rename';
    END IF;
END $$;

-- Step 3: Rename column assessment_id -> site_survey_id in site_survey_photos
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_survey_photos' AND column_name = 'assessment_id'
    ) THEN
        ALTER TABLE site_survey_photos RENAME COLUMN assessment_id TO site_survey_id;
        RAISE NOTICE 'Renamed column assessment_id -> site_survey_id in site_survey_photos';
    ELSE
        RAISE NOTICE 'Column already renamed or does not exist in site_survey_photos';
    END IF;
END $$;

-- Step 4: Update foreign key constraint for site_survey_photos
DO $$
BEGIN
    -- Drop old constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'photos_assessment_id_fkey' AND table_name = 'site_survey_photos'
    ) THEN
        ALTER TABLE site_survey_photos DROP CONSTRAINT photos_assessment_id_fkey;
    END IF;

    -- Add new constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'site_survey_photos_site_survey_id_fkey' AND table_name = 'site_survey_photos'
    ) THEN
        ALTER TABLE site_survey_photos
        ADD CONSTRAINT site_survey_photos_site_survey_id_fkey
        FOREIGN KEY (site_survey_id) REFERENCES site_surveys(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created new FK constraint site_survey_photos_site_survey_id_fkey';
    END IF;
END $$;

-- Step 5: Update indexes on site_survey_photos
DROP INDEX IF EXISTS idx_photos_assessment_id;
CREATE INDEX IF NOT EXISTS idx_site_survey_photos_site_survey_id ON site_survey_photos(site_survey_id);

-- Step 6: Update indexes on site_surveys
DROP INDEX IF EXISTS idx_assessments_organization_id;
DROP INDEX IF EXISTS idx_assessments_status;
DROP INDEX IF EXISTS idx_assessments_created_at;
CREATE INDEX IF NOT EXISTS idx_site_surveys_organization_id ON site_surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_status ON site_surveys(status);
CREATE INDEX IF NOT EXISTS idx_site_surveys_created_at ON site_surveys(created_at);

-- Step 7: Update triggers on site_surveys
DROP TRIGGER IF EXISTS set_updated_at_assessments ON site_surveys;
DROP TRIGGER IF EXISTS update_assessments_updated_at ON site_surveys;
DROP TRIGGER IF EXISTS set_updated_at_site_surveys ON site_surveys;

CREATE TRIGGER set_updated_at_site_surveys
    BEFORE UPDATE ON site_surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Update photo tracking trigger
DROP TRIGGER IF EXISTS track_photo_upload_trigger ON site_survey_photos;

CREATE OR REPLACE FUNCTION track_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_tenant_usage((SELECT organization_id FROM site_surveys WHERE id = NEW.site_survey_id), 'photos');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_photo_upload_trigger
    AFTER INSERT ON site_survey_photos
    FOR EACH ROW
    EXECUTE FUNCTION track_photo_upload();

-- Step 9: Update RLS policies for site_surveys
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can create assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Admins can delete assessments in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can view site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can create site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Users can update site surveys in their organization" ON site_surveys;
DROP POLICY IF EXISTS "Admins can delete site surveys in their organization" ON site_surveys;

CREATE POLICY "Users can view site surveys in their organization" ON site_surveys
    FOR SELECT
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create site surveys in their organization" ON site_surveys
    FOR INSERT
    WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update site surveys in their organization" ON site_surveys
    FOR UPDATE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete site surveys in their organization" ON site_surveys
    FOR DELETE
    USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'tenant_owner')));

-- Step 10: Update RLS policies for site_survey_photos
DROP POLICY IF EXISTS "Users can view photos for assessments in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can create photos for assessments in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update photos for assessments in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can delete photos for assessments in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can view site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can create site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can update site survey photos in their organization" ON site_survey_photos;
DROP POLICY IF EXISTS "Users can delete site survey photos in their organization" ON site_survey_photos;

CREATE POLICY "Users can view site survey photos in their organization" ON site_survey_photos
    FOR SELECT
    USING (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Users can create site survey photos in their organization" ON site_survey_photos
    FOR INSERT
    WITH CHECK (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Users can update site survey photos in their organization" ON site_survey_photos
    FOR UPDATE
    USING (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Users can delete site survey photos in their organization" ON site_survey_photos
    FOR DELETE
    USING (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid()));

-- Step 11: Update estimates table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'estimates' AND column_name = 'assessment_id'
    ) THEN
        -- Drop old FK constraint
        ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_assessment_id_fkey;

        -- Rename column
        ALTER TABLE estimates RENAME COLUMN assessment_id TO site_survey_id;

        -- Add new FK constraint
        ALTER TABLE estimates
        ADD CONSTRAINT estimates_site_survey_id_fkey
        FOREIGN KEY (site_survey_id) REFERENCES site_surveys(id) ON DELETE CASCADE;

        RAISE NOTICE 'Updated estimates table: assessment_id -> site_survey_id';
    END IF;
END $$;

-- Update estimates RLS policies
DROP POLICY IF EXISTS "Users can view estimates for assessments in their organization" ON estimates;
DROP POLICY IF EXISTS "Estimators can create estimates in their organization" ON estimates;
DROP POLICY IF EXISTS "Estimators can update estimates in their organization" ON estimates;
DROP POLICY IF EXISTS "Users can view estimates in their organization" ON estimates;

CREATE POLICY "Users can view estimates in their organization" ON estimates
    FOR SELECT
    USING (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid()));

CREATE POLICY "Estimators can create estimates in their organization" ON estimates
    FOR INSERT
    WITH CHECK (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')));

CREATE POLICY "Estimators can update estimates in their organization" ON estimates
    FOR UPDATE
    USING (site_survey_id IN (SELECT s.id FROM site_surveys s JOIN profiles p ON p.organization_id = s.organization_id WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator', 'tenant_owner')));

-- Step 12: Update jobs table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'jobs' AND column_name = 'assessment_id'
    ) THEN
        -- Drop old FK constraint
        ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_assessment_id_fkey;

        -- Rename column
        ALTER TABLE jobs RENAME COLUMN assessment_id TO site_survey_id;

        -- Add new FK constraint
        ALTER TABLE jobs
        ADD CONSTRAINT jobs_site_survey_id_fkey
        FOREIGN KEY (site_survey_id) REFERENCES site_surveys(id) ON DELETE CASCADE;

        RAISE NOTICE 'Updated jobs table: assessment_id -> site_survey_id';
    END IF;
END $$;

-- Step 13: Rename status enum type
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assessment_status') THEN
        ALTER TYPE assessment_status RENAME TO site_survey_status;
        RAISE NOTICE 'Renamed type: assessment_status -> site_survey_status';
    ELSE
        RAISE NOTICE 'Type assessment_status does not exist or already renamed';
    END IF;
END $$;

-- Step 14: Add documentation comments
COMMENT ON TABLE site_surveys IS 'Site surveys (formerly assessments) - field data collection for environmental remediation projects';
COMMENT ON TABLE site_survey_photos IS 'Photos associated with site surveys (formerly photos)';

-- Clean up helper function
DROP FUNCTION IF EXISTS table_exists(text);

-- Final verification
DO $$
DECLARE
    site_surveys_count INTEGER;
    photos_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO site_surveys_count FROM site_surveys;
    SELECT COUNT(*) INTO photos_count FROM site_survey_photos;

    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE 'site_surveys: % records', site_surveys_count;
    RAISE NOTICE 'site_survey_photos: % records', photos_count;
END $$;
