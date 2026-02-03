-- Temporarily disable the problematic trigger to test signup
-- This will allow us to isolate if the trigger is the issue

-- First, let's check if there's a constraint issue by examining the profiles table
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE 'Checking profiles table columns...';
  FOR col_record IN
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'profiles'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: %, Type: %, Nullable: %, Default: %',
      col_record.column_name, col_record.data_type, col_record.is_nullable, col_record.column_default;
  END LOOP;
END $$;

-- Check for any constraints
DO $$
DECLARE
  con_record RECORD;
BEGIN
  RAISE NOTICE 'Checking profiles table constraints...';
  FOR con_record IN
    SELECT conname, contype, pg_get_constraintdef(oid) as definition
    FROM pg_constraint
    WHERE conrelid = 'profiles'::regclass
  LOOP
    RAISE NOTICE 'Constraint: %, Type: %, Definition: %',
      con_record.conname, con_record.contype, con_record.definition;
  END LOOP;
END $$;

-- Disable the trigger
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;

DO $$ BEGIN RAISE NOTICE 'Trigger disabled - try signup now'; END $$;
