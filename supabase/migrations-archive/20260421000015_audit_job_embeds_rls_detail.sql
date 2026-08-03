-- Diagnostic: full text of RLS policies on embed tables so we can see
-- whether the policies actually permit reads for an authenticated user
-- whose organization owns the parent job.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT tablename, policyname, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'job_crew', 'job_equipment', 'job_materials', 'job_disposal',
        'job_change_orders', 'job_notes'
      )
    ORDER BY tablename, cmd
  LOOP
    RAISE NOTICE 'EMBED_POLICY: % / % / % / qual=% / check=%',
      pol.tablename, pol.cmd, pol.policyname,
      LEFT(COALESCE(pol.qual, 'NULL'), 200),
      LEFT(COALESCE(pol.with_check, 'NULL'), 200);
  END LOOP;
END $$;
