-- Defense in depth for the reporting matviews.
--
-- The previous security-lockdown migration revoked SELECT on
-- mv_sales_performance / mv_job_costs / mv_lead_source_roi from
-- anon and authenticated, forcing the reporting service to use the
-- service-role client. That works, but the only thing standing between
-- a future caller and a cross-org leak is the application's
-- `.eq('organization_id', orgId)` filter — there's no row-level
-- enforcement at the database layer (matviews can't have RLS).
--
-- This migration adds three wrapper VIEWs that filter by
-- get_user_organization_id() server-side. The views are owned by postgres
-- and so can read the underlying matviews even when the caller can't.
-- We grant SELECT on the views to authenticated; the matviews themselves
-- stay locked. Any consumer querying the view automatically sees only
-- their own org's rows — even if they forget to filter.
--
-- Platform users (cross-org access) still need the matview directly via
-- service_role; that path is unchanged.

-- ============================================================================
-- 1. v_sales_performance
-- ============================================================================
DROP VIEW IF EXISTS v_sales_performance;
CREATE VIEW v_sales_performance AS
  SELECT *
  FROM mv_sales_performance
  WHERE organization_id = get_user_organization_id();

GRANT SELECT ON v_sales_performance TO authenticated;

COMMENT ON VIEW v_sales_performance IS
  'Org-filtered wrapper over mv_sales_performance. Reads the matview using the view owner''s grants, then filters by get_user_organization_id() so authenticated callers can only see their own organization''s rows. The underlying matview is revoked from authenticated to prevent direct access.';

-- ============================================================================
-- 2. v_job_costs
-- ============================================================================
DROP VIEW IF EXISTS v_job_costs;
CREATE VIEW v_job_costs AS
  SELECT *
  FROM mv_job_costs
  WHERE organization_id = get_user_organization_id();

GRANT SELECT ON v_job_costs TO authenticated;

COMMENT ON VIEW v_job_costs IS
  'Org-filtered wrapper over mv_job_costs. See v_sales_performance.';

-- ============================================================================
-- 3. v_lead_source_roi
-- ============================================================================
DROP VIEW IF EXISTS v_lead_source_roi;
CREATE VIEW v_lead_source_roi AS
  SELECT *
  FROM mv_lead_source_roi
  WHERE organization_id = get_user_organization_id();

GRANT SELECT ON v_lead_source_roi TO authenticated;

COMMENT ON VIEW v_lead_source_roi IS
  'Org-filtered wrapper over mv_lead_source_roi. See v_sales_performance.';
