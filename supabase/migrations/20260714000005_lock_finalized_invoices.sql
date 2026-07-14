-- Lock finalized invoices (EX7: "try editing a finalized invoice — locked").
--
-- An invoice is a financial record. Once it leaves 'draft' — i.e. it has been
-- issued to the customer (sent/viewed/partial/paid/overdue) or voided — its
-- monetary substance must be immutable. Corrections happen by voiding and
-- re-issuing, never by silently editing an invoice the customer has already
-- seen. Until now nothing enforced this: the invoice PATCH and the line-item
-- add/update/delete endpoints accepted edits at any status, and the discount
-- editor was reachable on sent invoices.
--
-- This migration is the hard backstop at the database, so the rule holds for
-- every path (internal API, public /api/v1, a future feature, raw SQL). The
-- API layer also returns a friendly 409 before reaching here.
--
-- What stays allowed on a non-draft invoice (deliberately NOT blocked):
--   * status transitions (send, mark viewed, void)
--   * payment posting — amount_paid / balance_due / total / tax_amount / status
--     are maintained by the payment + self-recalc triggers
--   * delivery/tracking columns (sent_at, viewed_at, qb_invoice_id, portal…)
-- Only the fields that change what/when the customer owes are frozen.

-- 1. Line items are the invoice's substance. Block any insert/update/delete
--    against a line item whose parent invoice is past draft. Creation is safe:
--    invoices are always inserted as 'draft' first (see create_invoice_from_job
--    and the /api/v1 create path), then their line items are added while still
--    draft. The AFTER-trigger that re-sums totals only touches `invoices`, so
--    there's no recursion here.
CREATE OR REPLACE FUNCTION public.enforce_invoice_line_items_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_invoice_id uuid;
  v_status text;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;

  -- If the parent invoice no longer exists (nothing to protect) allow it.
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION
      'Invoice % is finalized (status: %); its line items cannot be added, changed, or removed. Void the invoice and issue a new one instead.',
      v_invoice_id, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_line_items_locked ON invoice_line_items;
CREATE TRIGGER enforce_invoice_line_items_locked
  BEFORE INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_line_items_locked();

-- 2. Freeze the money-bearing fields on the invoice itself once it is past
--    draft. Compares OLD vs NEW so status-only / payment-only updates pass
--    through untouched. Runs BEFORE UPDATE; the self-recalc trigger only
--    rewrites total/tax_amount/balance_due, none of which are guarded here,
--    so the two never fight.
CREATE OR REPLACE FUNCTION public.enforce_invoice_content_locked()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
       NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.tax_rate        IS DISTINCT FROM OLD.tax_rate
    OR NEW.due_date        IS DISTINCT FROM OLD.due_date
    OR NEW.invoice_date    IS DISTINCT FROM OLD.invoice_date
    OR NEW.customer_id     IS DISTINCT FROM OLD.customer_id
    OR NEW.job_id          IS DISTINCT FROM OLD.job_id
  ) THEN
    RAISE EXCEPTION
      'Invoice % is finalized (status: %); its amounts and dates cannot be edited. Void the invoice and issue a new one instead.',
      OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_invoice_content_locked ON invoices;
CREATE TRIGGER enforce_invoice_content_locked
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_content_locked();
