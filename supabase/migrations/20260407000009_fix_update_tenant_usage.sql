-- ============================================
-- Fix update_tenant_usage to handle missing tenant_usage table
-- The tenant_usage table may not exist on all instances.
-- Uses EXECUTE to avoid early plan validation of table references.
-- ============================================

CREATE OR REPLACE FUNCTION public.update_tenant_usage(
  org_id UUID,
  usage_type VARCHAR,
  increment_by INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  current_month DATE;
BEGIN
  -- Check if tenant_usage table exists using pg_catalog (works with empty search_path)
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    RETURN;
  END IF;

  current_month := DATE_TRUNC('month', NOW());

  EXECUTE 'INSERT INTO public.tenant_usage (organization_id, month_year) VALUES ($1, $2) ON CONFLICT (organization_id, month_year) DO NOTHING'
    USING org_id, current_month;

  CASE usage_type
    WHEN 'assessments' THEN
      EXECUTE 'UPDATE public.tenant_usage SET assessments_created = assessments_created + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
    WHEN 'photos' THEN
      EXECUTE 'UPDATE public.tenant_usage SET photos_uploaded = photos_uploaded + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
    WHEN 'api_calls' THEN
      EXECUTE 'UPDATE public.tenant_usage SET api_calls = api_calls + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
