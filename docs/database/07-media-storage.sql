-- Media Storage Setup for HazardOS
-- This file sets up Supabase Storage and assessment_photos table

-- Create assessment_photos table
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

-- RLS Policies for assessment_photos
-- Users can view photos from assessments in their organization
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

-- Users can insert photos for assessments in their organization
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

-- Users can update photos for assessments in their organization
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

-- Users can delete photos for assessments in their organization
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

-- Platform owners can access all photos
CREATE POLICY "Platform owners can access all assessment photos" ON assessment_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- Storage bucket setup (run these commands in Supabase Dashboard > Storage)
/*
1. Create a new bucket called 'assessment-media'
2. Set the bucket to be private (not public)
3. Configure the following policies:

-- Storage policies for assessment-media bucket
-- Users can upload files to their organization folder
CREATE POLICY "Users can upload assessment media to their organization folder" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'assessment-media' AND
    (storage.foldername(name))[1] IN (
      SELECT p.organization_id::text
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Users can view files from their organization folder
CREATE POLICY "Users can view assessment media from their organization folder" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'assessment-media' AND
    (storage.foldername(name))[1] IN (
      SELECT p.organization_id::text
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Users can delete files from their organization folder
CREATE POLICY "Users can delete assessment media from their organization folder" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'assessment-media' AND
    (storage.foldername(name))[1] IN (
      SELECT p.organization_id::text
      FROM profiles p
      WHERE p.id = auth.uid()
    )
  );

-- Platform owners can access all files
CREATE POLICY "Platform owners can access all assessment media" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'assessment-media' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );
*/

-- File size and type constraints
COMMENT ON TABLE assessment_photos IS 'Stores metadata for photos and videos uploaded with assessments. Files are stored in Supabase Storage.';
COMMENT ON COLUMN assessment_photos.file_size IS 'File size in bytes. Videos should be compressed to under 50MB, images under 5MB.';
COMMENT ON COLUMN assessment_photos.file_type IS 'MIME type of the file (e.g., image/jpeg, video/webm)';
COMMENT ON COLUMN assessment_photos.file_path IS 'Path in Supabase Storage: organization_id/assessment_id/filename';