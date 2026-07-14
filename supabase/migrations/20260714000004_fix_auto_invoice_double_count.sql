-- ============================================================================
-- Fix a change-order double-count carried into the I3 auto-invoice trigger
-- (and present in the manual InvoicesService.createFromJob path it mirrors).
--
-- jobs.final_amount is maintained by a trigger as
-- `contract_amount + SUM(approved change orders)`. The completion invoice
-- itemizes each approved change order as its own line, so using final_amount
-- for the "Remediation services" base line billed every change order twice —
-- the invoice totalled contract + 2×change_orders instead of the job's real
-- value (contract + change_orders = final_amount). A completed job worth 9200
-- (8000 contract + 1200 change order) produced a 10400 invoice.
--
-- Use contract_amount as the clean base line instead; base + itemized change
-- orders then sums to final_amount, the job's true value, with no double
-- count. contract_amount and final_amount are seeded equal on job creation
-- and only diverge by approved change orders, so this is safe. The
-- application createFromJob path is fixed in the same change.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_invoice_on_job_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing      uuid;
  v_amount        numeric;
  v_line_items    jsonb := '[]'::jsonb;
  v_co            RECORD;
  v_discount      numeric := 0;
  v_contact_type  text;
  v_company_terms text;
  v_due_days      int;
  v_terms_label   text;
  v_created_by    uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing FROM invoices WHERE job_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Base contract only (NOT final_amount, which already includes approved
  -- change orders that we itemize separately below — see migration header).
  v_amount := COALESCE(NEW.contract_amount, NEW.final_amount);
  IF v_amount IS NOT NULL AND v_amount <> 0 THEN
    v_line_items := v_line_items || jsonb_build_object(
      'description', 'Remediation services - Job #' || NEW.job_number,
      'quantity',    1,
      'unit',        'job',
      'unit_price',  v_amount,
      'source_type', 'job',
      'source_id',   NEW.id
    );
  END IF;

  FOR v_co IN
    SELECT id, description, amount
    FROM job_change_orders
    WHERE job_id = NEW.id AND status = 'approved'
  LOOP
    v_line_items := v_line_items || jsonb_build_object(
      'description', 'Change Order: ' || v_co.description,
      'quantity',    1,
      'unit',        'each',
      'unit_price',  v_co.amount,
      'source_type', 'change_order',
      'source_id',   v_co.id
    );
  END LOOP;

  IF v_line_items = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  IF NEW.estimate_id IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_discount
    FROM estimates WHERE id = NEW.estimate_id;
    v_discount := COALESCE(v_discount, 0);
  END IF;

  SELECT c.contact_type, co.payment_terms
    INTO v_contact_type, v_company_terms
  FROM customers c
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE c.id = NEW.customer_id;

  IF v_company_terms IS NOT NULL AND v_company_terms ~* 'Net\s+\d+' THEN
    v_due_days    := (regexp_match(v_company_terms, 'Net\s+(\d+)', 'i'))[1]::int;
    v_terms_label := v_company_terms;
  ELSIF v_company_terms IS NOT NULL AND v_company_terms <> '' THEN
    v_due_days    := 30;
    v_terms_label := v_company_terms;
  ELSIF v_contact_type = 'commercial' THEN
    v_due_days    := 30;
    v_terms_label := 'Net 30';
  ELSE
    v_due_days    := 15;
    v_terms_label := 'Net 15';
  END IF;

  v_created_by := COALESCE(auth.uid(), NEW.created_by);

  PERFORM create_invoice_from_job(
    NEW.id,
    (CURRENT_DATE + v_due_days),
    v_terms_label,
    v_discount,
    v_line_items,
    v_created_by
  );

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_invoice_on_job_completion() FROM PUBLIC, anon, authenticated;
