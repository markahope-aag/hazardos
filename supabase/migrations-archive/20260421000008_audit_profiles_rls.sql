-- Diagnostic: list RLS policies on profiles so we can see why the Team
-- page only shows the current user. Read-only.
DO $$
DECLARE
  pol RECORD;
  count INT := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
    ORDER BY cmd, policyname
  LOOP
    count := count + 1;
    RAISE NOTICE 'PROFILES_POLICY: % / % / %', pol.cmd, pol.policyname, LEFT(COALESCE(pol.qual, ''), 200);
  END LOOP;
  RAISE NOTICE 'PROFILES_POLICY_COUNT: %', count;
END $$;
