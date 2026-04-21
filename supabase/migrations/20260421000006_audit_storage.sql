-- Diagnostic: surface whether survey-photos bucket + RLS policies exist.
-- Read-only, emits NOTICEs so drift is visible in `supabase db push` output.
DO $$
DECLARE
  bucket_exists BOOLEAN;
  policy_count INTEGER;
BEGIN
  SELECT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'survey-photos')
    INTO bucket_exists;

  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE 'survey-photos:%';

  RAISE NOTICE 'STORAGE_AUDIT: survey-photos bucket exists: %', bucket_exists;
  RAISE NOTICE 'STORAGE_AUDIT: survey-photos policies on storage.objects: %', policy_count;
END $$;
