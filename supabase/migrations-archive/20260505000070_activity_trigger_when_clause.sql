-- Optimize the shared `log_entity_activity` trigger that's attached to 15
-- write-heavy tables (customers, jobs, estimates, opportunities, etc.).
--
-- Background: every INSERT/UPDATE/DELETE on those tables enters the
-- plpgsql function, computes a JSONB diff of OLD vs NEW, looks up the
-- actor's profile, and inserts an activity_log row. The function does
-- short-circuit on trivial updates and missing auth context — but only
-- after entering plpgsql and initializing local vars.
--
-- Adding a WHEN clause moves the cheap filters up to the trigger
-- machinery so the function isn't even invoked when:
--   * there's no auth.uid() (system writes / cron / cascading triggers)
--   * the row didn't actually change (OLD IS DISTINCT FROM NEW)
--
-- This is roughly the same per-row cost as before for meaningful user
-- writes, but ~free for the (numerous) trivial cascades.

CREATE OR REPLACE FUNCTION attach_activity_trigger_v2(tbl TEXT, entity_type_label TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = tbl
  ) THEN
    RAISE NOTICE 'Skipping activity trigger for missing table: %', tbl;
    RETURN;
  END IF;

  -- Drop the prior combined trigger and any previous v2 splits.
  EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%I ON %I', tbl, tbl);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%I_ins ON %I', tbl, tbl);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%I_upd ON %I', tbl, tbl);
  EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%I_del ON %I', tbl, tbl);

  -- INSERT: cannot reference OLD in WHEN; just gate on auth.uid().
  EXECUTE format(
    'CREATE TRIGGER trg_activity_%I_ins
       AFTER INSERT ON %I
       FOR EACH ROW
       WHEN (auth.uid() IS NOT NULL)
       EXECUTE FUNCTION log_entity_activity(%L)',
    tbl, tbl, entity_type_label
  );

  -- DELETE: cannot reference NEW in WHEN; just gate on auth.uid().
  EXECUTE format(
    'CREATE TRIGGER trg_activity_%I_del
       AFTER DELETE ON %I
       FOR EACH ROW
       WHEN (auth.uid() IS NOT NULL)
       EXECUTE FUNCTION log_entity_activity(%L)',
    tbl, tbl, entity_type_label
  );

  -- UPDATE: skip pure no-op touches in addition to system writes. This is
  -- where the win is — every cascading-trigger UPDATE that doesn't actually
  -- change a column gets filtered before plpgsql is even entered.
  EXECUTE format(
    'CREATE TRIGGER trg_activity_%I_upd
       AFTER UPDATE ON %I
       FOR EACH ROW
       WHEN (auth.uid() IS NOT NULL AND OLD IS DISTINCT FROM NEW)
       EXECUTE FUNCTION log_entity_activity(%L)',
    tbl, tbl, entity_type_label
  );
END;
$$;

SELECT attach_activity_trigger_v2('customers',         'contact');
SELECT attach_activity_trigger_v2('companies',         'company');
SELECT attach_activity_trigger_v2('properties',        'property');
SELECT attach_activity_trigger_v2('property_contacts', 'property_contact');
SELECT attach_activity_trigger_v2('site_surveys',      'site_survey');
SELECT attach_activity_trigger_v2('estimates',         'estimate');
SELECT attach_activity_trigger_v2('proposals',         'proposal');
SELECT attach_activity_trigger_v2('opportunities',     'opportunity');
SELECT attach_activity_trigger_v2('jobs',              'job');
SELECT attach_activity_trigger_v2('job_change_orders', 'change_order');
SELECT attach_activity_trigger_v2('job_notes',         'job_note');
SELECT attach_activity_trigger_v2('job_documents',     'document');
SELECT attach_activity_trigger_v2('invoices',          'invoice');
SELECT attach_activity_trigger_v2('payments',          'payment');
SELECT attach_activity_trigger_v2('follow_ups',        'follow_up');

DROP FUNCTION attach_activity_trigger_v2(TEXT, TEXT);
