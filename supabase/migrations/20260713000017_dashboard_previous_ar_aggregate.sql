-- ============================================================================
-- X20 dashboard performance: bound the prior-period AR computation.
--
-- The StatsCards widget computed "outstanding AR at the end of the previous
-- period" by fetching EVERY non-void invoice created on/before that date plus
-- EVERY payment on/before that date, then reducing in JS:
--     previousAR = sum over invoices of max(0, invoice.total - payments_for_it)
-- Both fetches are unbounded and grow with account age, so on a large/old org
-- this was the query most likely to push the dashboard past its 3s budget.
--
-- This function performs the identical calculation DB-side and returns a single
-- number. The GREATEST(..., 0) preserves the per-invoice floor (an overpaid
-- invoice contributes 0, never a negative that offsets other invoices) so the
-- result matches the previous JS reduce exactly. Two explicit cutoffs mirror
-- the original filters precisely: invoices by created_at (timestamptz), payments
-- by payment_date (date).
--
-- SECURITY INVOKER: RLS on invoices/payments still applies, so the sum only
-- includes the caller's own organization's rows regardless of p_org.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_previous_outstanding_ar(
  p_org uuid,
  p_invoice_cutoff timestamptz,
  p_payment_cutoff date
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(GREATEST(inv.total - COALESCE(pay.paid, 0), 0)), 0)
  FROM invoices inv
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS paid
    FROM payments
    WHERE organization_id = p_org
      AND payment_date <= p_payment_cutoff
    GROUP BY invoice_id
  ) pay ON pay.invoice_id = inv.id
  WHERE inv.organization_id = p_org
    AND inv.created_at <= p_invoice_cutoff
    AND inv.status <> 'void';
$$;

REVOKE ALL ON FUNCTION public.dashboard_previous_outstanding_ar(uuid, timestamptz, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_previous_outstanding_ar(uuid, timestamptz, date) TO authenticated;
