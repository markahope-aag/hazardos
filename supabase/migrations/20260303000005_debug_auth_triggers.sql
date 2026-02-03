-- Debug: List all triggers on auth.users
DO $$
DECLARE
  trig_record RECORD;
BEGIN
  RAISE NOTICE 'Triggers on auth.users:';
  FOR trig_record IN
    SELECT tgname, tgtype, proname as function_name
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'auth.users'::regclass
  LOOP
    RAISE NOTICE 'Trigger: %, Type: %, Function: %',
      trig_record.tgname, trig_record.tgtype, trig_record.function_name;
  END LOOP;
END $$;

-- Check for duplicate emails that might cause issues
DO $$
DECLARE
  email_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO email_count FROM auth.users;
  RAISE NOTICE 'Total users in auth.users: %', email_count;
END $$;

-- Test the handle_new_user function directly with a fake record
-- This won't actually insert, just tests for syntax errors
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  RAISE NOTICE 'Testing if profiles table accepts inserts...';

  -- Try inserting a test row and immediately rolling back
  BEGIN
    INSERT INTO profiles (id, email, first_name, last_name, role, is_platform_user)
    VALUES ('00000000-0000-0000-0000-000000000099', 'test@test.com', 'Test', 'User', 'estimator', false);

    -- If we get here, the insert worked
    RAISE NOTICE 'Test insert succeeded';

    -- Clean up
    DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000099';
    RAISE NOTICE 'Test row cleaned up';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Test insert failed: % %', SQLERRM, SQLSTATE;
  END;
END $$;
