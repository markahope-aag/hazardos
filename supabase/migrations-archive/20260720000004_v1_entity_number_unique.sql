-- v1 entity-number uniqueness (fixes the count()+1 race — API20 / HS10)
--
-- estimates.estimate_number, invoices.invoice_number and jobs.job_number are
-- generated as `count(*) + 1` per org with no transaction or uniqueness
-- guarantee. Two concurrent creates read the same count and mint the SAME
-- number; today only a NON-unique index exists, so both rows insert silently.
-- QA proof: 8 concurrent estimate creates all received EST-00011.
--
-- These UNIQUE indexes make a collision fail with 23505, which the API's
-- insertWithEntityNumber() helper (lib/utils/entity-number.ts) catches and
-- retries with the next number.
--
-- ⚠️ APPLY WITH CARE — this WILL fail if duplicate numbers already exist.
-- Run the dedupe audit below FIRST and resolve any hits before applying:
--
--   select organization_id, estimate_number, count(*)
--   from estimates group by 1, 2 having count(*) > 1;
--   -- repeat for invoices/invoice_number and jobs/job_number
--
-- Using CONCURRENTLY so the build doesn't lock the tables; run outside a txn.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_estimates_org_number
  ON estimates (organization_id, estimate_number);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_invoices_org_number
  ON invoices (organization_id, invoice_number);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_jobs_org_number
  ON jobs (organization_id, job_number);
