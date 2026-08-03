-- ============================================================================
-- Performance: pipeline metrics as a SQL aggregate + supporting index
--
-- getPipelineMetrics() previously fetched up to 10,000 opportunity rows with
-- three joins and summed them in JavaScript, on the two highest-traffic sales
-- pages (/crm/pipeline, /sales). Replace that with a server-side GROUP BY.
--
-- Also add the partial index the open-pipeline query actually uses: the default
-- opportunity list + the metrics join filter on `outcome IS NULL ORDER BY
-- updated_at DESC`. The existing idx_opportunities_outcome_updated covers the
-- opposite predicate (outcome IS NOT NULL) and doesn't help here.
-- ============================================================================

-- Partial index for the open-pipeline hot path.
CREATE INDEX IF NOT EXISTS idx_opportunities_open_updated
  ON public.opportunities (organization_id, updated_at DESC)
  WHERE outcome IS NULL;

-- Per-stage aggregate for the caller's organization. SECURITY INVOKER so RLS
-- on opportunities/pipeline_stages still applies; the explicit org filter keeps
-- empty stages scoped to the caller. Returns every stage (LEFT JOIN) so stages
-- with zero open opportunities still render as empty kanban columns.
CREATE OR REPLACE FUNCTION public.get_pipeline_metrics()
RETURNS TABLE (
  stage_id uuid,
  stage_name text,
  count bigint,
  value numeric,
  weighted numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ps.id AS stage_id,
    ps.name AS stage_name,
    COUNT(o.id) AS count,
    COALESCE(SUM(o.estimated_value), 0) AS value,
    COALESCE(SUM(o.weighted_value), 0) AS weighted
  FROM public.pipeline_stages ps
  LEFT JOIN public.opportunities o
    ON o.stage_id = ps.id
   AND o.organization_id = ps.organization_id
   AND o.outcome IS NULL
  WHERE ps.organization_id = get_user_organization_id()
  GROUP BY ps.id, ps.name, ps.sort_order
  ORDER BY ps.sort_order;
$$;

REVOKE ALL ON FUNCTION public.get_pipeline_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pipeline_metrics() TO authenticated;
