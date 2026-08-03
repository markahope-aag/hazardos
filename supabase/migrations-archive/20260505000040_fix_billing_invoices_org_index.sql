-- Index-name collision fix.
--
-- 20260201000020_invoices.sql:97 created `idx_invoices_org` on the `invoices`
-- table. Two later migrations tried to create an index of the same name on
-- the *separate* `billing_invoices` table (platform-level billing). Postgres
-- requires unique index names within a schema, so each subsequent
-- `CREATE INDEX IF NOT EXISTS idx_invoices_org ON billing_invoices(...)`
-- silently skipped — leaving `billing_invoices.organization_id` un-indexed
-- despite being the multi-tenancy filter column on every read.
--
-- This migration creates the index under a properly namespaced name and
-- also drops the redundant duplicate that ended up on `invoices`
-- (`idx_invoices_organization_id`, added later by an ensure migration that
-- wasn't aware of `idx_invoices_org`).

-- 1. Add the missing index on billing_invoices under a non-colliding name.
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org
  ON billing_invoices(organization_id);

-- 2. Drop the redundant invoice-table index. Two indexes covering exactly
--    the same column waste write throughput and disk; keep `idx_invoices_org`
--    as the canonical one (it's the older / referenced name).
DROP INDEX IF EXISTS idx_invoices_organization_id;
