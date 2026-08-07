-- Make estimate revision atomic.
--
-- createEstimateRevision inserted the new estimate, then inserted the copied
-- line items, and on failure deleted the estimate by hand. That last step is a
-- compensating rollback, not a transaction: if the cleanup DELETE itself failed
-- (lost connection, RLS, a lock timeout) the result was an estimate row with no
-- line items — a revision showing a total with nothing behind it.
--
-- Follows the pattern set by create_invoice_from_job / record_invoice_payment /
-- create_job_from_proposal: SECURITY INVOKER so RLS still applies, search_path
-- pinned, execute revoked from PUBLIC and anon.
--
-- Reads and business logic stay in the service. The estimate number is worked
-- out there (it needs the survey address and a collision scan) and passed in.
-- The field copy happens here as INSERT ... SELECT rather than 20 jsonb casts,
-- so a column added to estimates later cannot be silently dropped by a revision
-- the way location_id was.

CREATE OR REPLACE FUNCTION public.create_estimate_revision(
  p_parent_estimate_id uuid,
  p_organization_id uuid,
  p_created_by uuid,
  p_estimate_number text,
  p_revision_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  -- Lock the parent for the duration. Two concurrent revisions of the same
  -- estimate would otherwise both read version N and both try to become N+1.
  PERFORM 1
  FROM estimates
  WHERE id = p_parent_estimate_id
    AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent estimate % not found', p_parent_estimate_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- version and estimate_root_id are set by the existing trigger, so they are
  -- deliberately not in this list. approved_by/approved_at/approval_notes are
  -- omitted because a revision starts unapproved.
  INSERT INTO estimates (
    organization_id, site_survey_id, customer_id, location_id,
    estimate_number, status, parent_estimate_id, revision_notes,
    project_name, project_description, scope_of_work,
    estimated_duration_days, estimated_start_date, estimated_end_date,
    valid_until, subtotal, markup_percent, markup_amount,
    discount_percent, discount_amount, tax_percent, tax_amount, total,
    internal_notes, created_by
  )
  SELECT
    organization_id, site_survey_id, customer_id, location_id,
    p_estimate_number, 'draft', id, p_revision_notes,
    project_name, project_description, scope_of_work,
    estimated_duration_days, estimated_start_date, estimated_end_date,
    valid_until, subtotal, markup_percent, markup_amount,
    discount_percent, discount_amount, tax_percent, tax_amount, total,
    internal_notes, p_created_by
  FROM estimates
  WHERE id = p_parent_estimate_id
  RETURNING id INTO v_new_id;

  INSERT INTO estimate_line_items (
    estimate_id, item_type, category, description, quantity, unit,
    unit_price, total_price, source_rate_id, source_table, sort_order,
    is_optional, is_included, notes
  )
  SELECT
    v_new_id, item_type, category, description, quantity, unit,
    unit_price, total_price, source_rate_id, source_table, sort_order,
    is_optional, is_included, notes
  FROM estimate_line_items
  WHERE estimate_id = p_parent_estimate_id
  ORDER BY sort_order ASC;

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_estimate_revision(uuid, uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_estimate_revision(uuid, uuid, uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_estimate_revision(uuid, uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_estimate_revision(uuid, uuid, uuid, text, text) IS
  'Atomically creates a revision of an estimate with its line items copied. '
  'Replaces a hand-rolled compensating delete in estimate-versioning.ts.';
