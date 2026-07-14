-- Backstop the "one per job" invariant with real constraints (audit finding).
--
-- Auto-invoicing, commission earning, and job-completion creation each rely on
-- a SELECT-then-INSERT idempotency check in application code. Under concurrent
-- requests (double-clicked "Approve completion", a retry after a timeout, or
-- the reject→resubmit→reapprove path) two callers can both pass the existence
-- check before either INSERT lands, producing a duplicate invoice (double-bill
-- the customer) or a duplicate commission (double-pay the rep).
--
-- These partial unique indexes make the database the source of truth: a race
-- now fails the loser cleanly on a unique violation instead of silently
-- creating a second row. job_id is nullable (standalone invoices / manual
-- commissions have none), so the indexes are partial. Verified against the
-- live DB that no existing duplicates would block creation.
--
-- Cardinality confirmed one-per-job for all three:
--   invoices           — no deposit/progress-invoice flow; createFromJob and the
--                        auto-invoice trigger both treat it as single/idempotent.
--   commission_earnings — createEarningForJob resolves a single rep and guards
--                        with .eq('job_id').maybeSingle().
--   job_completions    — submitCompletion returns the existing row if present;
--                        rejections update in place rather than inserting anew.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_job_id
  ON invoices (job_id) WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_commission_earnings_job_id
  ON commission_earnings (job_id) WHERE job_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_job_completions_job_id
  ON job_completions (job_id) WHERE job_id IS NOT NULL;
