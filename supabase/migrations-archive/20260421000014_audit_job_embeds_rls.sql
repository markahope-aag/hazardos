-- Diagnostic: count RLS policies on the tables the job detail query
-- pulls via embedded joins. Missing or mis-scoped policies cause PostgREST
-- to fail silently on the embed, which cascades to the parent fetch.
DO $$
DECLARE
  tbl TEXT;
  cnt INT;
  has_rls BOOLEAN;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'job_crew', 'job_equipment', 'job_materials', 'job_disposal',
    'job_change_orders', 'job_notes'
  ] LOOP
    SELECT relrowsecurity INTO has_rls
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = tbl;

    SELECT COUNT(*) INTO cnt
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = tbl;

    RAISE NOTICE 'JOB_EMBEDS: table=% rls=% policies=%', tbl, has_rls, cnt;
  END LOOP;
END $$;
