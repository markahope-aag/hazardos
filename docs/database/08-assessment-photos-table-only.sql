-- Create assessment_photos table for media metadata
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS assessment_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_photos_assessment_id ON assessment_photos(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_photos_created_at ON assessment_photos(created_at);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_assessment_photos
  BEFORE UPDATE ON assessment_photos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE assessment_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assessment_photos table
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

CREATE POLICY "Platform owners can access all assessment photos" ON assessment_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );