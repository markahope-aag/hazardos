-- Reporting views: add the role gate they never had.
--
-- These three views wrap materialized views. A materialized view cannot carry
-- RLS, so the view itself is the access layer and does its org scoping by hand
-- in the WHERE clause. That part works: a signed-in user only ever sees their
-- own organization's rows.
--
-- What was missing is the role half. Every one of these exposes money
-- (estimated_total, actual_total, invoiced, collected, revenue_won,
-- total_revenue), and any signed-in user could read them. QA confirmed against
-- production that a technician account selecting from v_job_costs and
-- v_lead_source_roi got rows back, which walks straight around the
-- FINANCIAL_VIEW gate added to the API routes and page layouts on 2026-08-15.
--
-- Same lesson as the time clock policy in 20260815000004: org isolation and
-- role authorization are different things, and a check that lives only in the
-- API is not a check, because the browser reaches PostgREST directly.
--
-- The role list mirrors ROLES.FINANCIAL_VIEW in lib/auth/roles.ts: everyone
-- except technician, per the 2026-07-28 client call ("the field crew works the
-- job but must not see what it is worth"). Office read-only staff (viewer)
-- keep access for billing questions.
--
-- Note on the linter: this does NOT clear the security_definer_view ERROR, and
-- that is deliberate. Flipping these to security_invoker would push the read
-- down onto mv_* objects that carry no RLS and are not granted to
-- `authenticated`, which breaks reporting for everyone rather than securing it.
-- The exposure the linter is pointing at is the missing predicate, and that is
-- what this fixes.

CREATE OR REPLACE VIEW "public"."v_job_costs" AS
 SELECT "organization_id",
    "job_id",
    "job_number",
    "title",
    "hazard_types",
    "month",
    "customer_name",
    "estimated_total",
    "actual_labor",
    "actual_materials",
    "actual_total",
    "invoiced",
    "collected",
    "variance",
    "variance_pct"
   FROM "public"."mv_job_costs"
  WHERE ("organization_id" = "public"."get_user_organization_id"())
    AND ("public"."get_user_role"() IN (
      'platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'viewer'
    ));

CREATE OR REPLACE VIEW "public"."v_sales_performance" AS
 SELECT "organization_id",
    "user_id",
    "full_name",
    "month",
    "total_proposals",
    "proposals_sent",
    "proposals_won",
    "proposals_lost",
    "total_value",
    "won_value",
    "revenue_won",
    "avg_deal_size",
    "win_rate"
   FROM "public"."mv_sales_performance"
  WHERE ("organization_id" = "public"."get_user_organization_id"())
    AND ("public"."get_user_role"() IN (
      'platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'viewer'
    ));

CREATE OR REPLACE VIEW "public"."v_lead_source_roi" AS
 SELECT "organization_id",
    "source",
    "month",
    "leads",
    "converted",
    "total_revenue",
    "conversion_rate",
    "avg_revenue_per_conversion"
   FROM "public"."mv_lead_source_roi"
  WHERE ("organization_id" = "public"."get_user_organization_id"())
    AND ("public"."get_user_role"() IN (
      'platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'viewer'
    ));

-- generate_access_token had a mutable search_path (linter 0011). A SECURITY
-- DEFINER function without a pinned search_path can be redirected by whatever
-- the caller has in front of public, so pin it.
ALTER FUNCTION "public"."generate_access_token"() SET "search_path" = 'public', 'pg_temp';
