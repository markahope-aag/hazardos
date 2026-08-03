-- ============================================================================
-- Auto-tracked activity log.
--
-- Until now activity_log rows were written only from hand-placed Activity.*
-- calls in TypeScript services — which meant every new code path had to
-- remember to call them, and many didn't. Customers could be edited,
-- estimates deleted, and change orders approved with zero audit trail.
--
-- This migration installs a generic BEFORE trigger on the tables that
-- matter, so every INSERT/UPDATE/DELETE produces an activity_log row
-- automatically. Hand-placed Activity.* calls for semantic events
-- (sent, paid, signed, status_changed) stay in place; the trigger only
-- emits generic 'created' / 'updated' / 'deleted' actions. Duplicate
-- hand-placed Activity.created/updated/deleted calls should be removed
-- from the code, which happens in the same commit as this migration.
--
-- Design notes:
--   - Service-role writes (auth.uid() IS NULL) are skipped. Those are
--     backfills, cron jobs, and migrations — not user actions — and
--     flooding the feed with them is noise.
--   - Updates that only touch `updated_at` are skipped. Triggers that
--     cascade-update timestamps shouldn't show up in the feed.
--   - The trigger runs SECURITY DEFINER so it can INSERT into
--     activity_log regardless of the caller's RLS posture (the log is
--     org-scoped via the current user's organization, so there's no
--     cross-tenant leak).
-- ============================================================================

CREATE OR REPLACE FUNCTION log_entity_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity_type_name TEXT := TG_ARGV[0];
  current_user_id UUID := auth.uid();
  current_org_id UUID := get_user_organization_id();
  current_user_name TEXT;

  new_row JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  old_row JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  canonical JSONB := COALESCE(new_row, old_row);

  action_name TEXT;
  entity_name TEXT;
  entity_id_val UUID;
  changes JSONB;
BEGIN
  -- No user session → system write. Skip silently.
  IF current_user_id IS NULL OR current_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  action_name := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
  END;

  -- For UPDATE, ignore pure updated_at bumps so cascades and trivial
  -- touches don't spam the feed.
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value) INTO changes
    FROM jsonb_each(new_row) AS n(key, value)
    WHERE NOT (old_row ? n.key AND old_row -> n.key = n.value);

    IF changes IS NULL THEN
      RETURN NEW;
    END IF;

    changes := changes - 'updated_at';
    IF changes = '{}'::jsonb OR changes IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Resolve actor display name (nullable — the feed falls back to the id).
  SELECT full_name INTO current_user_name FROM profiles WHERE id = current_user_id;

  -- Pick a human-friendly entity_name from common columns. Each table
  -- tends to have one of these; the order matters — `name` is most
  -- common but shouldn't trump a more specific identifier like
  -- `invoice_number` for entities that have one.
  entity_name := COALESCE(
    canonical ->> 'job_number',
    canonical ->> 'invoice_number',
    canonical ->> 'estimate_number',
    canonical ->> 'proposal_number',
    canonical ->> 'change_order_number',
    canonical ->> 'name',
    canonical ->> 'title',
    canonical ->> 'address_line1',
    canonical ->> 'site_address',
    canonical ->> 'job_address',
    canonical ->> 'file_name'
  );

  entity_id_val := (canonical ->> 'id')::UUID;

  INSERT INTO activity_log (
    organization_id, user_id, user_name,
    action, entity_type, entity_id, entity_name,
    old_values, new_values
  ) VALUES (
    current_org_id,
    current_user_id,
    current_user_name,
    action_name,
    entity_type_name,
    entity_id_val,
    entity_name,
    -- For updates we only store the diff, not the whole row — activity_log
    -- isn't a backup, it's a feed. For deletes we keep the whole OLD so
    -- "what was in this thing before it was removed" is answerable.
    CASE
      WHEN TG_OP = 'INSERT' THEN NULL
      WHEN TG_OP = 'UPDATE' THEN (
        SELECT jsonb_object_agg(key, old_row -> key)
        FROM jsonb_object_keys(changes) AS k(key)
      )
      ELSE old_row
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      WHEN TG_OP = 'UPDATE' THEN changes
      ELSE new_row
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- Per-table triggers. The argument to log_entity_activity is the
-- human-facing entity_type string that lands in activity_log.entity_type,
-- consumed by the feed UI.
--
-- Attaching via a helper DO block so a missing table (mid-development DBs
-- don't always have every migration applied) doesn't fail the whole
-- migration — we just skip that table and warn.
-- ============================================================================

CREATE OR REPLACE FUNCTION attach_activity_trigger(tbl TEXT, entity_type_label TEXT)
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

  EXECUTE format('DROP TRIGGER IF EXISTS trg_activity_%I ON %I', tbl, tbl);
  EXECUTE format(
    'CREATE TRIGGER trg_activity_%I
       AFTER INSERT OR UPDATE OR DELETE ON %I
       FOR EACH ROW EXECUTE FUNCTION log_entity_activity(%L)',
    tbl, tbl, entity_type_label
  );
END;
$$;

SELECT attach_activity_trigger('customers',         'contact');
SELECT attach_activity_trigger('companies',         'company');
SELECT attach_activity_trigger('properties',        'property');
SELECT attach_activity_trigger('property_contacts', 'property_contact');
SELECT attach_activity_trigger('site_surveys',      'site_survey');
SELECT attach_activity_trigger('estimates',         'estimate');
SELECT attach_activity_trigger('proposals',         'proposal');
SELECT attach_activity_trigger('opportunities',     'opportunity');
SELECT attach_activity_trigger('jobs',              'job');
SELECT attach_activity_trigger('job_change_orders', 'change_order');
SELECT attach_activity_trigger('job_notes',         'job_note');
SELECT attach_activity_trigger('job_documents',     'document');
SELECT attach_activity_trigger('invoices',          'invoice');
SELECT attach_activity_trigger('payments',          'payment');
SELECT attach_activity_trigger('follow_ups',        'follow_up');

-- Done with the bootstrapping helper.
DROP FUNCTION attach_activity_trigger(TEXT, TEXT);
