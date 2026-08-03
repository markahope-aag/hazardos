-- ============================================================================
-- Data integrity: atomic "create invoice from job"
--
-- InvoicesService.createFromJob previously performed three separate PostgREST
-- round-trips with no transaction:
--   1. INSERT the invoice (draft)
--   2. INSERT its line items
--   3. UPDATE the job status to 'invoiced'
-- A failure between any two left corrupt financial state — an invoice with no
-- line items (empty bill sent to a customer), or line items written while the
-- job stayed 'completed' so it could be invoiced again (duplicate invoices).
--
-- This wraps the whole sequence in one Postgres function, which runs in a
-- single implicit transaction: any RAISE rolls the entire thing back. It also
-- re-checks the completed-status guard under a row lock (FOR UPDATE), closing
-- the time-of-check/time-of-use gap against two concurrent invoicings of the
-- same job.
--
-- SECURITY INVOKER so RLS on invoices/invoice_line_items/jobs still applies —
-- the function can only touch rows the calling user could already write. The
-- existing AFTER-INSERT triggers on invoice_line_items (recalculate_invoice_
-- totals) and on invoices (activity log) fire inside the same transaction, so
-- totals and the activity entry are derived exactly as before.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invoice_from_job(
  p_job_id uuid,
  p_due_date date,
  p_payment_terms text,
  p_discount_amount numeric,
  p_line_items jsonb,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_customer_id uuid;
  v_job_status text;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_item jsonb;
  v_qty numeric;
  v_sort integer := 0;
BEGIN
  -- Lock the job row so two concurrent invoicings can't both pass the
  -- completed-status guard and each create an invoice.
  SELECT organization_id, customer_id, status
    INTO v_org_id, v_customer_id, v_job_status
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Server-side enforcement of the same guard the service/UI apply: an open
  -- job's contract amount can still move, so invoicing is gated on completion.
  -- Re-checked here under the lock in case status changed since the read.
  IF v_job_status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot invoice job %: status is %, expected completed',
      p_job_id, v_job_status USING ERRCODE = 'check_violation';
  END IF;

  v_invoice_number := generate_invoice_number(v_org_id);

  INSERT INTO invoices (
    organization_id, invoice_number, customer_id, job_id,
    due_date, payment_terms, discount_amount, status, created_by
  ) VALUES (
    v_org_id, v_invoice_number, v_customer_id, p_job_id,
    p_due_date, NULLIF(p_payment_terms, ''), COALESCE(p_discount_amount, 0),
    'draft', p_created_by
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb))
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    INSERT INTO invoice_line_items (
      invoice_id, description, quantity, unit, unit_price, line_total,
      source_type, source_id, sort_order
    ) VALUES (
      v_invoice_id,
      v_item->>'description',
      v_qty,
      NULLIF(v_item->>'unit', ''),
      (v_item->>'unit_price')::numeric,
      v_qty * (v_item->>'unit_price')::numeric,
      NULLIF(v_item->>'source_type', ''),
      NULLIF(v_item->>'source_id', '')::uuid,
      v_sort
    );
    v_sort := v_sort + 1;
  END LOOP;

  UPDATE jobs
  SET status = 'invoiced', updated_at = NOW()
  WHERE id = p_job_id;

  RETURN v_invoice_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_invoice_from_job(uuid, date, text, numeric, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invoice_from_job(uuid, date, text, numeric, jsonb, uuid) TO authenticated;
