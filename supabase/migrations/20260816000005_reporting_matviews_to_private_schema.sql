-- Clear linter 0010 (security_definer_view) honestly, rather than living with it.
--
-- The three reporting views had to run as SECURITY DEFINER because SELECT on
-- the materialized views underneath them is revoked from anon and
-- authenticated. That revoke is load-bearing: a materialized view cannot carry
-- RLS, so if callers could read mv_job_costs directly they would see every
-- organization's costs, with no org or role filter at all. The view is the only
-- thing applying those predicates.
--
-- Flipping the views to security_invoker on its own would therefore be a
-- downgrade: it requires granting SELECT on the matviews back to authenticated,
-- which reopens exactly that bypass.
--
-- Moving the matviews into `private` resolves the conflict. PostgREST does not
-- expose that schema (verified against production: anon, a signed-in
-- technician, and even service_role all get "PGRST106: Invalid schema:
-- private"), so a SELECT grant there cannot be exercised through the API. The
-- view keeps enforcing organization and role; callers simply have no route to
-- the underlying data except through it.
--
-- Net effect: same access as before, minus the SECURITY DEFINER property that
-- the linter (rightly) treats as a smell.

CREATE SCHEMA IF NOT EXISTS "private";

ALTER MATERIALIZED VIEW "public"."mv_job_costs" SET SCHEMA "private";
ALTER MATERIALIZED VIEW "public"."mv_lead_source_roi" SET SCHEMA "private";
ALTER MATERIALIZED VIEW "public"."mv_sales_performance" SET SCHEMA "private";

-- The views now run as the caller, so the caller needs to be able to reach the
-- matviews in SQL. This is safe only because `private` is not an exposed
-- schema; do not add it to the PostgREST schema list.
GRANT USAGE ON SCHEMA "private" TO "authenticated", "service_role";
GRANT SELECT ON "private"."mv_job_costs" TO "authenticated", "service_role";
GRANT SELECT ON "private"."mv_lead_source_roi" TO "authenticated", "service_role";
GRANT SELECT ON "private"."mv_sales_performance" TO "authenticated", "service_role";

-- anon gets nothing: it has no organization, so every row would be filtered out
-- anyway, and a permission error is a clearer answer than an empty result.

-- Postgres tracks the view -> matview dependency by OID, so SET SCHEMA above
-- already re-pointed the view bodies. Only the security property changes here.
ALTER VIEW "public"."v_job_costs" SET (security_invoker = on);
ALTER VIEW "public"."v_lead_source_roi" SET (security_invoker = on);
ALTER VIEW "public"."v_sales_performance" SET (security_invoker = on);

-- The refresh function referred to the matviews unqualified under
-- `search_path = public`, so the move would have broken it. Schema-qualify the
-- names and widen the path to cover both schemas. CONCURRENTLY still works:
-- the unique indexes each matview needs moved along with it.
CREATE OR REPLACE FUNCTION "public"."refresh_report_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'private', 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_sales_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_job_costs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.mv_lead_source_roi;
END;
$$;

ALTER FUNCTION "public"."refresh_report_views"() OWNER TO "postgres";

-- CREATE OR REPLACE resets grants to the default, so re-apply the lockdown from
-- 20260816000003. Without this the function would silently become callable by
-- anyone again, which is the same class of regression that migration fixed.
REVOKE ALL ON FUNCTION "public"."refresh_report_views"() FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION "public"."refresh_report_views"() TO "service_role";
