-- Site Survey Database Structure Verification for HazardOS
-- Run this to check if all required tables and relationships exist after migration

-- Check all required tables exist (updated for site surveys)
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'organizations',
    'profiles', 
    'site_surveys',           -- Was assessments
    'site_survey_photos',     -- Was assessment_photos
    'photos',
    'equipment_catalog',
    'materials_catalog',
    'estimates',
    'jobs',
    'platform_settings',
    'tenant_usage',
    'audit_log',
    'tenant_invitations'
  )
ORDER BY table_name;

-- Check if old tables still exist (should be empty after migration)
SELECT 
  table_name,
  'OLD TABLE - Should not exist' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('assessments', 'assessment_photos');

-- Check site_survey_photos table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'site_survey_photos'
ORDER BY ordinal_position;

-- Check site_surveys table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'site_surveys'
  AND column_name IN (
    'id', 'organization_id', 'estimator_id', 'job_name', 'customer_name',
    'site_address', 'site_city', 'site_state', 'site_zip', 'hazard_type',
    'containment_level', 'area_sqft', 'linear_ft', 'volume_cuft',
    'occupied', 'clearance_required', 'status', 'site_location'
  )
ORDER BY column_name;

-- Check foreign key relationships for site_survey_photos
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'site_survey_photos';

-- Check RLS is enabled on key tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('site_surveys', 'site_survey_photos', 'profiles', 'organizations')
ORDER BY tablename;

-- Check indexes on site_survey_photos
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'site_survey_photos'
  AND schemaname = 'public';

-- Check indexes on site_surveys
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'site_surveys'
  AND schemaname = 'public';

-- Check storage bucket exists
SELECT 
  id,
  name,
  public
FROM storage.buckets
WHERE name = 'assessment-media';

-- Check storage policies exist
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%assessment%';

-- Check if custom types exist (updated names)
SELECT 
  typname,
  typtype
FROM pg_type 
WHERE typname IN ('hazard_type', 'site_survey_status', 'assessment_status', 'user_role', 'organization_status', 'subscription_tier');

-- Check if update_updated_at_column function exists
SELECT 
  proname,
  prosrc IS NOT NULL as has_source
FROM pg_proc 
WHERE proname = 'update_updated_at_column';

-- Check triggers on site_survey_photos
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'site_survey_photos';

-- Check triggers on site_surveys
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'site_surveys';

-- Sample data check - count records in key tables
SELECT 
  'organizations' as table_name, COUNT(*) as record_count FROM organizations
UNION ALL
SELECT 
  'profiles' as table_name, COUNT(*) as record_count FROM profiles  
UNION ALL
SELECT 
  'site_surveys' as table_name, COUNT(*) as record_count FROM site_surveys
UNION ALL
SELECT 
  'site_survey_photos' as table_name, COUNT(*) as record_count FROM site_survey_photos;

-- Check if platform owner exists
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  is_platform_user,
  organization_id
FROM profiles 
WHERE role = 'platform_owner'
LIMIT 5;

-- Check RLS policies on site_surveys table
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'site_surveys';

-- Check RLS policies on site_survey_photos table
SELECT 
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'site_survey_photos';

-- Final verification: Test basic operations
SELECT 
  'Migration Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_surveys')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'site_survey_photos')
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments')
    THEN 'MIGRATION COMPLETE ✅'
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assessments')
    THEN 'MIGRATION NOT RUN ❌'
    ELSE 'PARTIAL MIGRATION ⚠️'
  END as status;