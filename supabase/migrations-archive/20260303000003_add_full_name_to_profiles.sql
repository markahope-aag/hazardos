-- ============================================
-- Add full_name column to profiles
-- This fixes the missing column referenced by reporting views
-- ============================================

-- Add full_name as a generated column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS full_name VARCHAR(201)
GENERATED ALWAYS AS (
  COALESCE(first_name, '') ||
  CASE WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN ' ' ELSE '' END ||
  COALESCE(last_name, '')
) STORED;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Added full_name generated column to profiles table';
END $$;
