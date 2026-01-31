-- Migration: Add Mobile Survey Fields
-- Adds JSONB columns to store rich mobile survey data
-- This is IDEMPOTENT - safe to run multiple times

-- Add building details columns
DO $$
BEGIN
    -- Building type (extended from simple hazard_type)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'building_type'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN building_type TEXT;
        COMMENT ON COLUMN site_surveys.building_type IS 'Type of building: residential_single, residential_multi, commercial, industrial, institutional, warehouse, retail';
    END IF;

    -- Year built
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'year_built'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN year_built INTEGER;
        COMMENT ON COLUMN site_surveys.year_built IS 'Year the building was constructed';
    END IF;

    -- Square footage (more precise than area_sqft for building size)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'building_sqft'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN building_sqft INTEGER;
        COMMENT ON COLUMN site_surveys.building_sqft IS 'Total building square footage';
    END IF;

    -- Number of stories
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'stories'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN stories INTEGER DEFAULT 1;
        COMMENT ON COLUMN site_surveys.stories IS 'Number of stories in the building';
    END IF;

    -- Construction type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'construction_type'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN construction_type TEXT;
        COMMENT ON COLUMN site_surveys.construction_type IS 'Construction type: wood_frame, concrete, steel, masonry, mixed';
    END IF;

    -- Occupancy status
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'occupancy_status'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN occupancy_status TEXT;
        COMMENT ON COLUMN site_surveys.occupancy_status IS 'Occupancy status: occupied, vacant, partial';
    END IF;

    -- Owner info
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'owner_name'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN owner_name TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'owner_phone'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN owner_phone TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'owner_email'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN owner_email TEXT;
    END IF;
END $$;

-- Add JSONB columns for rich data
DO $$
BEGIN
    -- Access information (restrictions, parking, equipment access, etc.)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'access_info'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN access_info JSONB DEFAULT '{}';
        COMMENT ON COLUMN site_surveys.access_info IS 'Access details: restrictions, parking, equipment access, elevator, doorway width';
    END IF;

    -- Environment information (temperature, humidity, moisture, structural concerns)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'environment_info'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN environment_info JSONB DEFAULT '{}';
        COMMENT ON COLUMN site_surveys.environment_info IS 'Environmental conditions: temperature, humidity, moisture issues, structural concerns';
    END IF;

    -- Hazard assessments (multi-hazard with detailed inventory)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'hazard_assessments'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN hazard_assessments JSONB DEFAULT '{}';
        COMMENT ON COLUMN site_surveys.hazard_assessments IS 'Detailed hazard data: types[], asbestos materials[], mold areas[], lead components[], other';
    END IF;

    -- Photo metadata (references to storage URLs with categories and captions)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'photo_metadata'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN photo_metadata JSONB DEFAULT '[]';
        COMMENT ON COLUMN site_surveys.photo_metadata IS 'Array of photo metadata: [{url, category, caption, gps, timestamp}]';
    END IF;

    -- Technician notes (final notes from review section)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'technician_notes'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN technician_notes TEXT;
        COMMENT ON COLUMN site_surveys.technician_notes IS 'Final notes and observations from the technician';
    END IF;

    -- Survey started timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN started_at TIMESTAMPTZ;
        COMMENT ON COLUMN site_surveys.started_at IS 'When the survey was started';
    END IF;

    -- Survey submitted timestamp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_surveys' AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE site_surveys ADD COLUMN submitted_at TIMESTAMPTZ;
        COMMENT ON COLUMN site_surveys.submitted_at IS 'When the survey was submitted';
    END IF;
END $$;

-- Add category to site_survey_photos for photo categorization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_survey_photos' AND column_name = 'category'
    ) THEN
        ALTER TABLE site_survey_photos ADD COLUMN category TEXT;
        COMMENT ON COLUMN site_survey_photos.category IS 'Photo category: exterior, interior, asbestos_materials, mold_areas, lead_components, utility_access, other';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'site_survey_photos' AND column_name = 'location'
    ) THEN
        ALTER TABLE site_survey_photos ADD COLUMN location TEXT;
        COMMENT ON COLUMN site_survey_photos.location IS 'Location description for the photo';
    END IF;
END $$;

-- Create indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_site_surveys_hazard_assessments ON site_surveys USING GIN (hazard_assessments);
CREATE INDEX IF NOT EXISTS idx_site_surveys_access_info ON site_surveys USING GIN (access_info);
CREATE INDEX IF NOT EXISTS idx_site_surveys_environment_info ON site_surveys USING GIN (environment_info);

-- Verification
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'site_surveys'
    AND column_name IN (
        'building_type', 'year_built', 'building_sqft', 'stories', 'construction_type',
        'occupancy_status', 'owner_name', 'owner_phone', 'owner_email',
        'access_info', 'environment_info', 'hazard_assessments', 'photo_metadata',
        'technician_notes', 'started_at', 'submitted_at'
    );

    RAISE NOTICE '=== Mobile Survey Fields Migration Complete ===';
    RAISE NOTICE 'Added % mobile survey columns to site_surveys', col_count;
END $$;
