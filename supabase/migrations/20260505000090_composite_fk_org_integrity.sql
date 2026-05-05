-- Cross-org integrity for tables that denormalize organization_id.
--
-- Several child tables carry their own organization_id column instead of
-- joining through the parent on every read — payments, customer_contacts,
-- proposals, work_orders, etc. This makes RLS policies cheap (one direct
-- comparison, no join), but it leaves a structural hole: nothing at the
-- database layer prevents `payments.organization_id` from drifting away
-- from `invoices.organization_id`. A bug in a service-role write or a
-- careless migration could insert a row whose denormalized org_id points
-- at a parent in a different tenant — and RLS would happily hide the
-- mismatch instead of catching it.
--
-- Fix: composite foreign keys. The parent gets a UNIQUE constraint on
-- (id, organization_id), and the child's FK is replaced with one that
-- references that pair. Postgres will then refuse any INSERT or UPDATE
-- where the child's denormalized org_id doesn't match the parent's.
-- Single-column referential integrity stays intact via the same FK; we
-- just upgrade what it enforces.
--
-- Drift verification before applying: all 8 candidate tables checked
-- for existing rows where child.organization_id <> parent.organization_id.
-- All returned 0 drift, so the new constraint is satisfiable on apply.

-- ============================================================================
-- 1. Parent UNIQUE constraints. Each is (id, organization_id) and is the
--    target the composite FKs reference. The id column is already PK
--    (and therefore unique on its own); adding a second uniqueness
--    that pairs id with org_id is structurally redundant but lets us
--    name the (id, organization_id) tuple as an FK target.
-- ============================================================================

DO $$
DECLARE
  parent_tables TEXT[] := ARRAY[
    'jobs', 'customers', 'properties', 'estimates', 'invoices',
    'job_documents', 'organization_documents'
  ];
  t TEXT;
  con_name TEXT;
BEGIN
  FOREACH t IN ARRAY parent_tables LOOP
    con_name := t || '_id_org_id_key';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = con_name
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (id, organization_id)',
        t, con_name
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 2. Helper: drop a child's existing FK on `child_col` -> `parent`(id),
--    then add a composite FK on (child_col, organization_id) ->
--    parent(id, organization_id) preserving the requested ON DELETE.
--
--    The original FK names follow the Postgres default
--    `<table>_<column>_fkey` convention; we look one up dynamically
--    via pg_constraint so we tolerate hand-named ones too.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.upgrade_to_composite_fk(
  child_table TEXT,
  child_col TEXT,
  parent_table TEXT,
  on_delete TEXT  -- 'CASCADE' | 'SET NULL' | 'NO ACTION' | 'RESTRICT'
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  existing_fk TEXT;
  new_fk_name TEXT := child_table || '_' || child_col || '_org_fkey';
BEGIN
  -- Find any existing single-column FK from child_table.child_col to parent_table.id.
  SELECT c.conname INTO existing_fk
  FROM pg_constraint c
  JOIN pg_class child_cls ON child_cls.oid = c.conrelid
  JOIN pg_class parent_cls ON parent_cls.oid = c.confrelid
  WHERE c.contype = 'f'
    AND child_cls.relname = child_table
    AND parent_cls.relname = parent_table
    AND array_length(c.conkey, 1) = 1
    AND (
      SELECT a.attname
      FROM pg_attribute a
      WHERE a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    ) = child_col
  LIMIT 1;

  IF existing_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', child_table, existing_fk);
  END IF;

  -- Skip if the composite FK already exists (idempotency for replays).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = new_fk_name
  ) THEN
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I, organization_id)
         REFERENCES %I (id, organization_id) ON DELETE %s',
      child_table, new_fk_name, child_col, parent_table, on_delete
    );
  END IF;
END;
$$;

-- ============================================================================
-- 3. Apply composite FKs.
--    ON DELETE behaviors below match the originals from
--    initial-schema / repair migrations.
-- ============================================================================

-- jobs.id <- job_documents.job_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('job_documents', 'job_id', 'jobs', 'CASCADE');

-- jobs.id <- work_orders.job_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('work_orders', 'job_id', 'jobs', 'CASCADE');

-- customers.id <- customer_contacts.customer_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('customer_contacts', 'customer_id', 'customers', 'CASCADE');

-- properties.id <- property_contacts.property_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('property_contacts', 'property_id', 'properties', 'CASCADE');

-- customers.id <- property_contacts.contact_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('property_contacts', 'contact_id', 'customers', 'CASCADE');

-- estimates.id <- proposals.estimate_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('proposals', 'estimate_id', 'estimates', 'CASCADE');

-- invoices.id <- payments.invoice_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('payments', 'invoice_id', 'invoices', 'CASCADE');

-- estimates.id <- estimate_attached_documents.estimate_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('estimate_attached_documents', 'estimate_id', 'estimates', 'CASCADE');

-- organization_documents.id <- estimate_attached_documents.document_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('estimate_attached_documents', 'document_id', 'organization_documents', 'CASCADE');

-- invoices.id <- invoice_attached_documents.invoice_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('invoice_attached_documents', 'invoice_id', 'invoices', 'CASCADE');

-- job_documents.id <- invoice_attached_documents.job_document_id (CASCADE)
SELECT pg_temp.upgrade_to_composite_fk('invoice_attached_documents', 'job_document_id', 'job_documents', 'CASCADE');

-- pg_temp helpers go away with the connection; no explicit DROP needed.
