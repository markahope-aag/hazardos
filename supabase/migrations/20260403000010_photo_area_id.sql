-- Add area_id to site_survey_photos for area-level photo association
ALTER TABLE site_survey_photos ADD COLUMN IF NOT EXISTS area_id TEXT;
CREATE INDEX IF NOT EXISTS idx_survey_photos_area ON site_survey_photos(area_id) WHERE area_id IS NOT NULL;
