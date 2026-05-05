-- Server-side aggregate for the Estimates list page.
-- Replaces the client-side useMemo() over a 50-row paginated list,
-- which under-counted any org with more than 50 estimates.
--
-- All numbers are scoped to the caller's organization via the same
-- get_user_organization_id() helper used by RLS policies. Latest-only
-- filtering matches the list view: one row per estimate_root_id at
-- the highest version.

CREATE OR REPLACE FUNCTION public.get_estimate_metrics(
  p_location_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
WITH scoped AS (
  SELECT e.*
  FROM public.estimates e
  WHERE e.organization_id = public.get_user_organization_id()
    AND (
      p_location_id IS NULL
      OR (p_location_id = '00000000-0000-0000-0000-000000000000'::uuid
          AND e.location_id IS NULL)
      OR e.location_id = p_location_id
    )
),
latest_per_chain AS (
  SELECT DISTINCT ON (estimate_root_id) *
  FROM scoped
  ORDER BY estimate_root_id, version DESC
),
open_set AS (
  SELECT * FROM latest_per_chain
  WHERE status IN ('draft','pending_approval','approved','sent','accepted')
),
decided_set AS (
  SELECT id, status
  FROM latest_per_chain
  WHERE status IN ('sent','accepted','rejected','expired','converted')
),
decided_with_jobs AS (
  -- "Won" = decided estimate that produced a non-cancelled job. Counts
  -- the chain once even if it has multiple jobs attached.
  SELECT DISTINCT d.id
  FROM decided_set d
  JOIN public.jobs j ON j.estimate_id = d.id
  WHERE j.status <> 'cancelled'
)
SELECT jsonb_build_object(
  'open',         (SELECT COUNT(*) FROM open_set),
  'draft',        (SELECT COUNT(*) FROM latest_per_chain WHERE status = 'draft'),
  'overdue',      (SELECT COUNT(*) FROM latest_per_chain
                   WHERE status = 'sent'
                     AND valid_until IS NOT NULL
                     AND valid_until < CURRENT_DATE),
  'win_rate',     CASE
                    WHEN (SELECT COUNT(*) FROM decided_set) = 0 THEN 0
                    ELSE LEAST(
                      100,
                      ROUND(
                        100.0 * (SELECT COUNT(*) FROM decided_with_jobs)
                              / (SELECT COUNT(*) FROM decided_set)
                      )::int
                    )
                  END,
  'avg_value',    COALESCE(
                    (SELECT AVG(total) FROM open_set WHERE total > 0),
                    0
                  ),
  'total_value',  COALESCE((SELECT SUM(total) FROM open_set), 0),
  'total_count',  (SELECT COUNT(*) FROM latest_per_chain)
);
$$;

GRANT EXECUTE ON FUNCTION public.get_estimate_metrics(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_estimate_metrics(UUID) IS
  'Aggregated estimate metrics for the Estimates list KPIs. Scoped to '
  'the caller''s organization. Pass NULL for all locations, the zero-uuid '
  'sentinel for ''unassigned'', or a location_id to scope further.';
