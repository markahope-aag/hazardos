-- Simple Migration Verification
-- Run each section separately in Supabase SQL Editor

-- 1. Check all required tables exist
SELECT 
  table_name,
  table_type,
  'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'customers',
    'site_surveys', 
    'site_survey_photos',
    'labor_rates',
    'equipment_rates',
    'material_costs', 
    'disposal_fees',
    'travel_rates',
    'pricing_settings'
  )
ORDER BY table_name;

-- 2. Check customers table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- 3. Check site_surveys has new fields
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'site_surveys'
  AND column_name IN ('customer_id', 'scheduled_date', 'scheduled_time_start', 'scheduled_time_end', 'assigned_to', 'appointment_status')
ORDER BY column_name;

-- 4. Check pricing tables exist with correct columns
SELECT 
  table_name,
  COUNT(column_name) as column_count
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
GROUP BY table_name
ORDER BY table_name;

-- 5. Check custom types exist
SELECT 
  typname as type_name,
  typtype as type_type
FROM pg_type 
WHERE typname IN ('customer_status', 'customer_source', 'appointment_status', 'disposal_hazard_type')
ORDER BY typname;

-- 6. Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('customers', 'site_surveys', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
ORDER BY tablename;

-- 7. Count records in each table
SELECT 'customers' as table_name, COUNT(*) as record_count FROM customers
UNION ALL
SELECT 'site_surveys' as table_name, COUNT(*) as record_count FROM site_surveys
UNION ALL
SELECT 'site_survey_photos' as table_name, COUNT(*) as record_count FROM site_survey_photos
UNION ALL
SELECT 'labor_rates' as table_name, COUNT(*) as record_count FROM labor_rates
UNION ALL
SELECT 'equipment_rates' as table_name, COUNT(*) as record_count FROM equipment_rates
UNION ALL
SELECT 'material_costs' as table_name, COUNT(*) as record_count FROM material_costs
UNION ALL
SELECT 'disposal_fees' as table_name, COUNT(*) as record_count FROM disposal_fees
UNION ALL
SELECT 'travel_rates' as table_name, COUNT(*) as record_count FROM travel_rates
UNION ALL
SELECT 'pricing_settings' as table_name, COUNT(*) as record_count FROM pricing_settings;

-- 8. Final status check
SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('customers', 'site_surveys', 'site_survey_photos', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
    ) = 9 THEN '🎉 ALL 9 TABLES EXIST - MIGRATIONS SUCCESSFUL'
    ELSE '⚠️ MISSING TABLES - CHECK MIGRATION STATUS'
  END as migration_status,
  (
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('customers', 'site_surveys', 'site_survey_photos', 'labor_rates', 'equipment_rates', 'material_costs', 'disposal_fees', 'travel_rates', 'pricing_settings')
  ) as tables_found;