-- CRITICAL (audit finding I14): record_invoice_payment accepted a payment larger
-- than the invoice balance, driving balance_due negative and flipping status to
-- 'paid' (verified: $500 on a $100 invoice -> balance_due = -400, status = 'paid').
-- Only the browser dialog blocked overpayment; the RPC — the shared path for the
-- internal API, /api/v1, and any raw call — had no server guard.
--
-- Fix: reject a non-positive amount, and an amount that exceeds the current
-- balance due, BEFORE inserting the payment. Everything else is unchanged from
-- 20260702000004_record_invoice_payment_txn.sql (invoice lock, balance trigger,
-- paid-state side effects). Exact payoff (amount == balance) is allowed.
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
  v_balance numeric;
  v_invoice_status text;
  v_payment payments;
BEGIN
  -- Lock the invoice so concurrent payments can't race the status read /
  -- paid-state side effects below. Also the source of truth for org scoping
  -- and the balance we validate against.
  SELECT organization_id, job_id, COALESCE(balance_due, total, 0)
    INTO v_org_id, v_job_id, v_balance
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Server-side overpayment guard (matches the browser dialog).
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds the invoice balance due (%). Enter an amount up to the balance, or void and re-issue.',
      p_amount, v_balance
      USING ERRCODE = 'check_violation';
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
