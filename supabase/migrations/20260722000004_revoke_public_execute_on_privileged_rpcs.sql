-- ============================================================================
-- Fix for 20260722000002: the SEC24 revokes were inert. Verified by calling all
-- five functions with the public anon key after that migration applied — every
-- one still succeeded.
--
-- Cause: Postgres grants EXECUTE to PUBLIC by default on CREATE FUNCTION.
-- `REVOKE ... FROM anon, authenticated` removes role-specific grants that were
-- never the thing permitting access; the implicit PUBLIC grant survived, and
-- PUBLIC covers every role including anon.
--
-- Fix: revoke from PUBLIC first, then re-grant only where a caller actually
-- exists. (This is the pattern 20260722000001 used correctly for the proposal
-- portal RPCs — REVOKE ALL ... FROM PUBLIC before granting to anon.)
--
-- Note that revoking from PUBLIC also removes service_role's access, so
-- get_top_slow_queries is re-granted explicitly: its one caller,
-- app/api/platform-admin/query-performance/route.ts, uses createAdminClient()
-- and is gated to platform_owner/platform_admin. The other four have no caller
-- in app/, lib/, components/, or any other database function, so they are left
-- reachable only by the table owner.
-- ============================================================================

REVOKE ALL ON FUNCTION public.get_top_slow_queries(text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reset_rate_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_customer_stats(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalc_company_stats(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_top_slow_queries(text, int) TO service_role;
