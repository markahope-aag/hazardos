-- ============================================================================
-- Data integrity: atomic "record invoice payment"
--
-- InvoicePaymentsService.recordPayment performed up to four separate writes
-- with no transaction:
--   1. INSERT the payment (an AFTER-INSERT trigger recomputes the invoice's
--      amount_paid / balance_due / status)
--   2. UPDATE scheduled_reminders -> 'cancelled' (if the invoice is now paid)
--   3. UPDATE the job status -> 'paid' (if the invoice is now paid)
-- A failure after step 1 left corrupt financial state: a paid invoice whose
-- job still reads 'invoiced' (breaks AR / revenue recognition), or a pending
-- payment-reminder SMS that keeps chasing a customer who already paid.
--
-- This wraps the sequence in one Postgres function / transaction. It locks the
-- invoice row (FOR UPDATE) so concurrent payments serialize and the post-insert
-- status read is consistent. The existing update_invoice_balance() trigger runs
-- inside the same transaction, so the paid/partial status is derived exactly as
-- before — we just read it back and apply the paid-state side effects
-- atomically.
--
-- SECURITY INVOKER so RLS on payments / invoices / scheduled_reminders / jobs
-- still applies. Activity logging stays in application code (a logging failure
-- must not roll back a recorded payment). Returns the inserted payment as jsonb.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_reference_number text,
  p_notes text,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_job_id uuid;
  v_invoice_status text;
  v_payment payments;
BEGIN
  -- Lock the invoice so concurrent payments can't race the status read /
  -- paid-state side effects below. Also the source of truth for org scoping.
  SELECT organization_id, job_id
    INTO v_org_id, v_job_id
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO payments (
    organization_id, invoice_id, amount, payment_date,
    payment_method, reference_number, notes, created_by
  ) VALUES (
    v_org_id, p_invoice_id, p_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(p_payment_method, ''), NULLIF(p_reference_number, ''),
    NULLIF(p_notes, ''), p_created_by
  )
  RETURNING * INTO v_payment;

  -- The AFTER-INSERT trigger update_invoice_balance() has now recomputed the
  -- invoice; read the fresh status to decide the paid-state side effects.
  SELECT status INTO v_invoice_status FROM invoices WHERE id = p_invoice_id;

  IF v_invoice_status = 'paid' THEN
    UPDATE scheduled_reminders
    SET status = 'cancelled'
    WHERE related_type = 'invoice'
      AND related_id = p_invoice_id
      AND status = 'pending';

    IF v_job_id IS NOT NULL THEN
      UPDATE jobs
      SET status = 'paid', updated_at = NOW()
      WHERE id = v_job_id;
    END IF;
  END IF;

  RETURN to_jsonb(v_payment);
END;
$$;

REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid) TO authenticated;
