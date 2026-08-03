-- pg_stat_statements-backed query performance monitoring.
--
-- Supabase ships with pg_stat_statements available as an extension; this
-- migration enables it (idempotent) and adds two SECURITY DEFINER RPCs:
--
--   * get_top_slow_queries(order_by, limit_n)  — read top queries by
--     total time, mean time, or call count.
--   * reset_query_performance_stats()          — reset the in-memory
--     stat buffer (occasionally useful when investigating a regression).
--
-- pg_stat_statements is a global view across all databases / users on
-- the cluster; it is NOT org-scoped, and it can include enough context
-- (table names, partial WHERE clauses) that we don't want to expose it
-- to tenant users. Both functions are revoked from anon/authenticated
-- and called from the platform-admin API via the service-role client.

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ============================================================================
-- 1. get_top_slow_queries — returns the top N queries ordered by the
--    requested metric. Only the columns useful for performance review;
--    we deliberately omit per-block I/O accounting (too noisy for a
--    quick triage view).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_top_slow_queries(
  order_by TEXT DEFAULT 'total_time',
  limit_n  INT  DEFAULT 50
)
RETURNS TABLE (
  query           TEXT,
  calls           BIGINT,
  total_exec_ms   DOUBLE PRECISION,
  mean_exec_ms    DOUBLE PRECISION,
  min_exec_ms     DOUBLE PRECISION,
  max_exec_ms     DOUBLE PRECISION,
  stddev_exec_ms  DOUBLE PRECISION,
  rows_returned   BIGINT,
  shared_blks_hit BIGINT,
  shared_blks_read BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Whitelist the order_by argument so the dynamic SQL can't be coerced
  -- into anything unexpected.
  IF order_by NOT IN ('total_time', 'mean_time', 'calls', 'max_time') THEN
    RAISE EXCEPTION 'Invalid order_by: %', order_by;
  END IF;

  IF limit_n < 1 OR limit_n > 500 THEN
    RAISE EXCEPTION 'limit_n must be between 1 and 500';
  END IF;

  RETURN QUERY EXECUTE format($q$
    SELECT
      pss.query,
      pss.calls,
      pss.total_exec_time     AS total_exec_ms,
      pss.mean_exec_time      AS mean_exec_ms,
      pss.min_exec_time       AS min_exec_ms,
      pss.max_exec_time       AS max_exec_ms,
      pss.stddev_exec_time    AS stddev_exec_ms,
      pss.rows                AS rows_returned,
      pss.shared_blks_hit,
      pss.shared_blks_read
    FROM pg_stat_statements pss
    JOIN pg_database d ON d.oid = pss.dbid
    WHERE d.datname = current_database()
      -- Hide pg_stat_statements meta-queries (admin/maintenance noise).
      AND pss.query NOT ILIKE '%%pg_stat_statements%%'
      AND pss.query NOT ILIKE '%%information_schema%%'
    ORDER BY %s DESC
    LIMIT %s
  $q$,
    CASE order_by
      WHEN 'total_time' THEN 'pss.total_exec_time'
      WHEN 'mean_time'  THEN 'pss.mean_exec_time'
      WHEN 'max_time'   THEN 'pss.max_exec_time'
      WHEN 'calls'      THEN 'pss.calls'
    END,
    limit_n
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_top_slow_queries(TEXT, INT) FROM anon, authenticated;

COMMENT ON FUNCTION public.get_top_slow_queries(TEXT, INT) IS
  'Top N entries from pg_stat_statements for the current database. Service-role only — exposes raw query text that can include schema and partial filter context.';

-- ============================================================================
-- 2. reset_query_performance_stats — wraps pg_stat_statements_reset().
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_query_performance_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM pg_stat_statements_reset();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_query_performance_stats() FROM anon, authenticated;

COMMENT ON FUNCTION public.reset_query_performance_stats() IS
  'Clears the pg_stat_statements stat buffer. Useful before reproducing a regression so the top-queries view reflects only the reproduction window.';
