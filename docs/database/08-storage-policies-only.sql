-- Storage Policies for assessment-media bucket
-- Run these commands in Supabase Dashboard > Storage > Policies

-- Policy 1: Users can upload files to their organization folder
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

-- Policy 2: Users can view files from their organization folder
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

-- Policy 3: Users can delete files from their organization folder
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

-- Policy 4: Platform owners can access all files
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