-- Recreate the three reporting materialized views that were commented out
-- in 20260421000003_repair_missing_tables.sql because the schema had drifted
-- (proposals.total, jobs.title, jobs.completed_at, customers.status = 'active'
-- no longer exist). The reporting service still queries these, so reports
-- have been silently empty.
--
-- Schema reconciliation:
--   • proposals has no `total` — total lives on the linked estimate
--   • jobs.title -> jobs.name
--   • jobs.completed_at -> jobs.actual_end_at
--   • customers status uses 'customer' / 'past_customer' (not 'active')
--   • customers.source can be null; fall back to lead_source, then 'untracked'

DROP MATERIALIZED VIEW IF EXISTS mv_sales_performance;
DROP MATERIALIZED VIEW IF EXISTS mv_job_costs;
DROP MATERIALIZED VIEW IF EXISTS mv_lead_source_roi;

-- ============================================================================
-- 1. Sales performance per rep per month
-- ============================================================================
-- Columns are named to satisfy both the reporting-service query
-- (total_proposals, total_value, won_value) and the SalesPerformanceRow type
-- (proposals_sent, revenue_won) — the duplicated names cost nothing on a
-- materialized view and keep both call sites working.
CREATE MATERIALIZED VIEW mv_sales_performance AS
SELECT
  p.organization_id,
  p.id AS user_id,
  p.full_name,
  DATE_TRUNC('month', pr.created_at) AS month,

  COUNT(DISTINCT pr.id) AS total_proposals,
  COUNT(DISTINCT pr.id) AS proposals_sent,
  COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END) AS proposals_won,
  COUNT(DISTINCT CASE WHEN pr.status = 'declined' THEN pr.id END) AS proposals_lost,

  COALESCE(SUM(e.total), 0) AS total_value,
  COALESCE(SUM(CASE WHEN pr.status = 'signed' THEN e.total END), 0) AS won_value,
  COALESCE(SUM(CASE WHEN pr.status = 'signed' THEN e.total END), 0) AS revenue_won,
  COALESCE(AVG(CASE WHEN pr.status = 'signed' THEN e.total END), 0) AS avg_deal_size,

  CASE
    WHEN COUNT(DISTINCT CASE WHEN pr.status IN ('signed','declined') THEN pr.id END) > 0
    THEN ROUND(
      COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END)::numeric /
      COUNT(DISTINCT CASE WHEN pr.status IN ('signed','declined') THEN pr.id END) * 100, 1
    )
    ELSE 0
  END AS win_rate

FROM profiles p
JOIN proposals pr ON pr.created_by = p.id
LEFT JOIN estimates e ON e.id = pr.estimate_id
GROUP BY p.organization_id, p.id, p.full_name, DATE_TRUNC('month', pr.created_at);

-- Unique index so REFRESH CONCURRENTLY works.
CREATE UNIQUE INDEX mv_sales_performance_pkey
  ON mv_sales_performance(organization_id, user_id, month);

-- ============================================================================
-- 2. Job cost analysis (one row per completed job)
-- ============================================================================
CREATE MATERIALIZED VIEW mv_job_costs AS
SELECT
  j.organization_id,
  j.id AS job_id,
  j.job_number,
  j.name AS title,
  j.hazard_types,
  DATE_TRUNC('month', j.actual_end_at) AS month,
  COALESCE(c.company_name, c.name, '(no customer)') AS customer_name,

  COALESCE(e.total, 0) AS estimated_total,
  COALESCE(jc.actual_labor_cost, 0) AS actual_labor,
  COALESCE(jc.actual_material_cost, 0) AS actual_materials,
  -- Prefer the job_completions roll-up; fall back to jobs.actual_cost if the
  -- completion record hasn't been filed yet.
  COALESCE(jc.actual_total, j.actual_cost, 0) AS actual_total,

  COALESCE(i.total, 0) AS invoiced,
  COALESCE(i.amount_paid, 0) AS collected,

  COALESCE(e.total, 0) - COALESCE(jc.actual_total, j.actual_cost, 0) AS variance,
  CASE
    WHEN COALESCE(e.total, 0) > 0
    THEN ROUND(
      (COALESCE(e.total, 0) - COALESCE(jc.actual_total, j.actual_cost, 0)) /
      e.total * 100, 1
    )
    ELSE 0
  END AS variance_pct

FROM jobs j
LEFT JOIN customers c ON c.id = j.customer_id
LEFT JOIN estimates e ON e.id = j.estimate_id
LEFT JOIN job_completions jc ON jc.job_id = j.id
LEFT JOIN invoices i ON i.job_id = j.id
WHERE j.status = 'completed';

CREATE UNIQUE INDEX mv_job_costs_pkey ON mv_job_costs(job_id);

-- ============================================================================
-- 3. Lead source ROI per month
-- ============================================================================
CREATE MATERIALIZED VIEW mv_lead_source_roi AS
SELECT
  c.organization_id,
  COALESCE(c.source::text, c.lead_source, 'untracked') AS source,
  DATE_TRUNC('month', c.created_at) AS month,

  COUNT(DISTINCT c.id) AS leads,
  COUNT(DISTINCT CASE WHEN c.status IN ('customer','past_customer') THEN c.id END) AS converted,

  COALESCE(SUM(i.total), 0) AS total_revenue,

  ROUND(
    COUNT(DISTINCT CASE WHEN c.status IN ('customer','past_customer') THEN c.id END)::numeric /
    NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
  ) AS conversion_rate,

  ROUND(
    COALESCE(SUM(i.total), 0)::numeric /
    NULLIF(
      COUNT(DISTINCT CASE WHEN c.status IN ('customer','past_customer') THEN c.id END),
      0
    ), 2
  ) AS avg_revenue_per_conversion

FROM customers c
LEFT JOIN invoices i ON i.customer_id = c.id AND i.status = 'paid'
GROUP BY
  c.organization_id,
  COALESCE(c.source::text, c.lead_source, 'untracked'),
  DATE_TRUNC('month', c.created_at);

CREATE UNIQUE INDEX mv_lead_source_roi_pkey
  ON mv_lead_source_roi(organization_id, source, month);

-- ============================================================================
-- Refresh function — replace with current names so refresh_report_views()
-- can't error on stale references.
-- ============================================================================
CREATE OR REPLACE FUNCTION refresh_report_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_job_costs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_source_roi;
END;
$$;

-- ============================================================================
-- Permissions — materialized views don't support RLS, so org isolation is
-- enforced at the query layer in ReportingService (every read .eq's
-- organization_id). Grant SELECT to the roles PostgREST and the service
-- client use; without this grant the schema cache won't expose the views.
-- ============================================================================
GRANT SELECT ON mv_sales_performance TO authenticated, service_role;
GRANT SELECT ON mv_job_costs        TO authenticated, service_role;
GRANT SELECT ON mv_lead_source_roi  TO authenticated, service_role;
