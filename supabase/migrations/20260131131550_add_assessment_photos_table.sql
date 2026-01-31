-- Add assessment_photos table if it doesn't exist
-- This migration ensures the photos table exists before the rename migration

-- Create assessment_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS assessment_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    caption TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_photos_assessment_id ON assessment_photos(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_photos_organization_id ON assessment_photos(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessment_photos_created_at ON assessment_photos(created_at);

-- Enable RLS
ALTER TABLE assessment_photos ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for assessment_photos
DROP POLICY IF EXISTS "Users can view assessment photos in their organization" ON assessment_photos;
CREATE POLICY "Users can view assessment photos in their organization" ON assessment_photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = assessment_photos.assessment_id
      AND a.organization_id = p.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can insert assessment photos in their organization" ON assessment_photos;
CREATE POLICY "Users can insert assessment photos in their organization" ON assessment_photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = assessment_photos.assessment_id
      AND a.organization_id = p.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can update assessment photos in their organization" ON assessment_photos;
CREATE POLICY "Users can update assessment photos in their organization" ON assessment_photos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = assessment_photos.assessment_id
      AND a.organization_id = p.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can delete assessment photos in their organization" ON assessment_photos;
CREATE POLICY "Users can delete assessment photos in their organization" ON assessment_photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assessments a
      JOIN profiles p ON p.id = auth.uid()
      WHERE a.id = assessment_photos.assessment_id
      AND a.organization_id = p.organization_id
    )
  );

DROP POLICY IF EXISTS "Platform owners can access all assessment photos" ON assessment_photos;
CREATE POLICY "Platform owners can access all assessment photos" ON assessment_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_assessment_photos ON assessment_photos;
CREATE TRIGGER set_updated_at_assessment_photos
  BEFORE UPDATE ON assessment_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add table comment
COMMENT ON TABLE assessment_photos IS 'Photos and videos associated with assessments - will be renamed to site_survey_photos in next migration';