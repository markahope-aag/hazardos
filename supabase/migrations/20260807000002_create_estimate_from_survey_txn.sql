-- Make survey-rooted estimate creation atomic.
--
-- createEstimateFromSurvey inserted the estimate, then its line items, and threw
-- if the second step failed. Unlike the revision path it did not even attempt a
-- compensating delete, so any line-item failure left an empty estimate sitting in
-- `pending_approval`: it shows a total, has nothing behind it, and appears in the
-- office manager's approval queue as real work.
--
-- Same pattern as create_estimate_revision (20260807000001): SECURITY INVOKER so
-- RLS still applies, search_path pinned, execute revoked from PUBLIC and anon.
--
-- The pricing calculation stays in the service. It reads the org's rate tables
-- and applies markup rules, which is business logic, not a database concern. The
-- resolved figures and the finished line items are passed in.
--
-- The approval_requests insert is deliberately NOT part of this transaction. It
-- is best-effort by design: the estimate is already in pending_approval, so
-- losing the queue row costs a notification, not the work. Folding it in would
-- mean a notification failure discards a correctly-priced estimate.

CREATE OR REPLACE FUNCTION public.create_estimate_from_survey(
  p_organization_id uuid,
  p_site_survey_id uuid,
  p_created_by uuid,
  p_estimate_number text,
  p_estimate jsonb,
  p_line_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_estimate_id uuid;
BEGIN
  -- Scope the survey to the caller's org before writing anything against it.
  PERFORM 1
  FROM site_surveys
  WHERE id = p_site_survey_id
    AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Site survey % not found', p_site_survey_id
      USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO estimates (
    organization_id, site_survey_id, customer_id, location_id,
    estimate_number, status,
    project_name, project_description, scope_of_work,
    estimated_duration_days, estimated_start_date, estimated_end_date,
    valid_until, subtotal, markup_percent, markup_amount,
    discount_percent, discount_amount, tax_percent, tax_amount, total,
    internal_notes, created_by
  )
  VALUES (
    p_organization_id,
    p_site_survey_id,
    NULLIF(p_estimate->>'customer_id', '')::uuid,
    NULLIF(p_estimate->>'location_id', '')::uuid,
    p_estimate_number,
    'pending_approval',
    NULLIF(p_estimate->>'project_name', ''),
    NULLIF(p_estimate->>'project_description', ''),
    NULLIF(p_estimate->>'scope_of_work', ''),
    NULLIF(p_estimate->>'estimated_duration_days', '')::integer,
    NULLIF(p_estimate->>'estimated_start_date', '')::date,
    NULLIF(p_estimate->>'estimated_end_date', '')::date,
    NULLIF(p_estimate->>'valid_until', '')::date,
    COALESCE(NULLIF(p_estimate->>'subtotal', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'markup_percent', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'markup_amount', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'discount_percent', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'discount_amount', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'tax_percent', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'tax_amount', '')::numeric, 0),
    COALESCE(NULLIF(p_estimate->>'total', '')::numeric, 0),
    NULLIF(p_estimate->>'internal_notes', ''),
    p_created_by
  )
  RETURNING id INTO v_estimate_id;

  -- WITH ORDINALITY preserves the order the calculator produced, so sort_order
  -- matches the sequence the customer sees on the proposal.
  INSERT INTO estimate_line_items (
    estimate_id, item_type, category, description, quantity, unit,
    unit_price, total_price, source_rate_id, source_table, sort_order,
    is_optional, is_included, notes
  )
  SELECT
    v_estimate_id,
    (item->>'item_type')::line_item_type,
    NULLIF(item->>'category', ''),
    item->>'description',
    COALESCE(NULLIF(item->>'quantity', '')::numeric, 0),
    NULLIF(item->>'unit', ''),
    COALESCE(NULLIF(item->>'unit_price', '')::numeric, 0),
    COALESCE(NULLIF(item->>'total_price', '')::numeric, 0),
    NULLIF(item->>'source_rate_id', '')::uuid,
    NULLIF(item->>'source_table', ''),
    (ord - 1)::integer,
    COALESCE((item->>'is_optional')::boolean, false),
    COALESCE((item->>'is_included')::boolean, true),
    NULLIF(item->>'notes', '')
  FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb)) WITH ORDINALITY AS t(item, ord);

  RETURN v_estimate_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_estimate_from_survey(uuid, uuid, uuid, text, jsonb, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_estimate_from_survey(uuid, uuid, uuid, text, jsonb, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_estimate_from_survey(uuid, uuid, uuid, text, jsonb, jsonb) TO authenticated;

COMMENT ON FUNCTION public.create_estimate_from_survey(uuid, uuid, uuid, text, jsonb, jsonb) IS
  'Atomically creates a survey-rooted estimate with its calculated line items. '
  'Replaces a two-step insert in estimate-creator.ts that left an empty estimate '
  'in pending_approval when the line-item write failed.';
