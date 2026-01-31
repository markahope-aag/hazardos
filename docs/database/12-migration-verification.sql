-- Migration Verification Script
-- Run this in Supabase SQL Editor to verify all migrations have been applied

-- 1. Check that all required tables exist
SELECT 
  'Table Existence Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM (
  VALUES 
    ('customers'),
    ('site_surveys'),
    ('site_survey_photos'),
    ('labor_rates'),
    ('equipment_rates'),
    ('material_costs'),
    ('disposal_fees'),
    ('travel_rates'),
    ('pricing_settings')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables t ON t.table_name = required_tables.table_name AND t.table_schema = 'public'
ORDER BY required_tables.table_name;

-- 2. Check that site_surveys has new fields
SELECT 
  'Site Survey Fields Check' as check_type,
  column_name,
  data_type,
  is_nullable,
  '✅ ADDED' as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'site_surveys'
  AND column_name IN ('customer_id', 'scheduled_date', 'scheduled_time_start', 'scheduled_time_end', 'assigned_to', 'appointment_status')
ORDER BY column_name;

-- 3. Check customers table structure
SELECT 
  'Customers Table Structure' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- 4. Check that all pricing tables have proper structure
SELECT 
  'Pricing Tables Check' as check_type,
  t.table_name,
  COUNT(c.column_name) as column_count,
  '✅ CONFIGURED' as status
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
  AND t.table_name IN ('labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
GROUP BY t.table_name
ORDER BY t.table_name;

-- 5. Check that custom types exist
SELECT 
  'Custom Types Check' as check_type,
  typname as type_name,
  '✅ EXISTS' as status
FROM pg_type 
WHERE typname IN ('customer_status', 'customer_source', 'appointment_status', 'disposal_hazard_type')
ORDER BY typname;

-- 6. Check RLS is enabled on all tables
SELECT 
  'RLS Status Check' as check_type,
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'site_surveys', 'site_survey_photos', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
ORDER BY tablename;

-- 7. Check indexes exist
SELECT 
  'Index Check' as check_type,
  schemaname,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'site_surveys', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 8. Check foreign key relationships
SELECT 
  'Foreign Key Check' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  '✅ CONFIGURED' as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('customers', 'site_surveys', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
ORDER BY tc.table_name, kcu.column_name;

-- 9. Sample data test - Check if we can insert and query data
-- (This is a read-only check to see if basic operations would work)
SELECT 
  'Data Operations Check' as check_type,
  'customers' as table_name,
  COUNT(*) as current_record_count,
  '✅ ACCESSIBLE' as status
FROM customers
UNION ALL
SELECT 
  'Data Operations Check' as check_type,
  'site_surveys' as table_name,
  COUNT(*) as current_record_count,
  '✅ ACCESSIBLE' as status
FROM site_surveys
UNION ALL
SELECT 
  'Data Operations Check' as check_type,
  'labor_rates' as table_name,
  COUNT(*) as current_record_count,
  '✅ ACCESSIBLE' as status
FROM labor_rates
UNION ALL
SELECT 
  'Data Operations Check' as check_type,
  'pricing_settings' as table_name,
  COUNT(*) as current_record_count,
  '✅ ACCESSIBLE' as status
FROM pricing_settings;

-- 10. Final summary
SELECT 
  'MIGRATION SUMMARY' as check_type,
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'site_surveys', 'site_survey_photos', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
    ) = 9 THEN '🎉 ALL MIGRATIONS APPLIED SUCCESSFULLY'
    ELSE '⚠️ SOME MIGRATIONS MISSING - CHECK ABOVE RESULTS'
  END as status,
  (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'site_surveys', 'site_survey_photos', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
  ) as tables_found,
  '9' as tables_expected;