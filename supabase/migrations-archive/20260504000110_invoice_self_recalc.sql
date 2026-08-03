-- Recalculate invoice totals when the invoice itself changes (not just
-- its line items). The original recalculate_invoice_totals trigger only
-- fires from invoice_line_items, so editing discount_amount or tax_rate
-- directly on the invoice didn't propagate to total / balance_due.
--
-- This BEFORE UPDATE trigger normalizes the math whenever a relevant
-- column changes. It uses NEW.subtotal (which the line-item trigger
-- maintains) so we don't re-sum line items here — keeps it cheap.

CREATE OR REPLACE FUNCTION public.recalculate_invoice_self_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  computed_tax DECIMAL(12, 2);
  computed_total DECIMAL(12, 2);
BEGIN
  -- Only act when an input that affects totals actually changed. Skip
  -- recursive updates when the trigger itself stamps total/balance_due.
  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.tax_rate IS DISTINCT FROM OLD.tax_rate
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
  THEN
    computed_tax := COALESCE(NEW.subtotal, 0) * COALESCE(NEW.tax_rate, 0);
    computed_total := COALESCE(NEW.subtotal, 0) + computed_tax - COALESCE(NEW.discount_amount, 0);

    NEW.tax_amount := computed_tax;
    NEW.total := computed_total;
    NEW.balance_due := computed_total - COALESCE(NEW.amount_paid, 0);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invoice_self_recalc ON invoices;
CREATE TRIGGER invoice_self_recalc
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_invoice_self_totals();
