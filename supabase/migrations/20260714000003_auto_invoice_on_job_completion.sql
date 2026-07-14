-- ============================================================================
-- I3: "Job completion auto-generates an invoice — line items match the
-- completed job"
--
-- Auto-invoicing existed only on ONE of the ways a job reaches 'completed':
-- JobCompletionService.approveCompletion() explicitly calls
-- InvoicesService.createFromJob(). But a job can be completed three ways:
--   1. the completion-review approval (auto-invoices — worked)
--   2. JobsService.updateStatus() via PATCH /api/jobs/[id]/status
--      (auto-creates commission, but never an invoice)
--   3. the CRM job page (app/(dashboard)/crm/jobs/[id]/page.tsx), which does
--      a raw client-side `supabase.from('jobs').update({status:'completed'})`
--      and bypasses every server-side hook entirely.
-- Completing a job through (2) or (3) produced no invoice, so the tester had
-- to click "Create Invoice" manually — exactly the reported behavior.
--
-- An app-side hook can't cover path (3) (a raw client write runs no server
-- code), so the fix belongs in the database where every path converges: a
-- trigger that fires when jobs.status transitions to 'completed'. This is the
-- same pattern the project already uses for create_job_from_signed_proposal
-- and sync_opportunity_from_job.
--
-- It builds the SAME line items InvoicesService.createFromJob builds — the
-- job's final/contract amount as a remediation-services line plus one line
-- per approved change order — carries the signed estimate's discount, resolves
-- the same due terms (company Net-N > residential 15 / commercial 30 > 30),
-- and delegates the actual write to the existing create_invoice_from_job()
-- RPC so the invoice, its line items, totals recalculation, and the
-- job->'invoiced' flip all happen atomically and identically to the manual
-- path. So the auto invoice's line items match a manually created one.
--
-- Idempotent: skips if the job already has an invoice, so it can't double-bill
-- when more than one path runs (e.g. approveCompletion still calls
-- createFromJob — that call now finds the trigger's invoice and no-ops).
--
-- SECURITY DEFINER so completing a job never fails on a user who lacks
-- invoice-insert rights (a technician marking a job done shouldn't be blocked,
-- and the automation must not roll back their status change). Tenancy is
-- preserved because create_invoice_from_job derives organization_id from the
-- job itself, not from the caller.
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
  -- jobs.customer_id is NOT NULL in practice, but create_invoice_from_job
  -- needs it — bail rather than raise inside a completion.
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Idempotent: one invoice per job.
  SELECT id INTO v_existing FROM invoices WHERE job_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Line 1: the job amount as remediation services (final overrides contract).
  v_amount := COALESCE(NEW.final_amount, NEW.contract_amount);
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

  -- One line per approved change order.
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

  -- Nothing billable -> no invoice (avoids a $0 invoice with no lines).
  IF v_line_items = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  -- Carry the signed estimate's discount onto the invoice.
  IF NEW.estimate_id IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_discount
    FROM estimates WHERE id = NEW.estimate_id;
    v_discount := COALESCE(v_discount, 0);
  END IF;

  -- Due terms, mirroring InvoicesService.resolveDueTerms:
  --   company payment_terms "Net N" > non-standard company label (30d) >
  --   contact_type (commercial 30 / residential 15) > 15.
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

  -- Reuse the atomic manual-path writer: invoice + line items + totals +
  -- job->'invoiced'. That status flip re-updates this row, but the trigger's
  -- WHEN clause (NEW.status='completed') keeps it from re-firing on 'invoiced'.
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

DROP TRIGGER IF EXISTS trg_auto_invoice_on_job_completion ON jobs;
CREATE TRIGGER trg_auto_invoice_on_job_completion
  AFTER UPDATE OF status ON jobs
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION auto_invoice_on_job_completion();
