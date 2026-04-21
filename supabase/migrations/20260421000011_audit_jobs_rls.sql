-- Diagnostic: jobs SELECT policies on the live DB
DO $$
DECLARE
  pol RECORD;
  count INT := 0;
BEGIN
  FOR pol IN
    SELECT policyname, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'jobs'
    ORDER BY cmd, policyname
  LOOP
    count := count + 1;
    RAISE NOTICE 'JOBS_POLICY: % / % / %', pol.cmd, pol.policyname, LEFT(COALESCE(pol.qual, ''), 200);
  END LOOP;
  RAISE NOTICE 'JOBS_POLICY_COUNT: %', count;
END $$;
