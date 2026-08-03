-- ============================================
-- Fix trigger functions: use fully qualified references
-- With search_path = '', information_schema is not accessible
-- Use pg_catalog instead for table existence checks
-- ============================================

CREATE OR REPLACE FUNCTION public.track_assessment_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(NEW.organization_id, 'assessments');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.track_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(
      (SELECT organization_id FROM public.site_surveys WHERE id = NEW.site_survey_id),
      'photos'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
