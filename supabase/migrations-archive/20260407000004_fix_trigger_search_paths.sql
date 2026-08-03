-- ============================================
-- Fix trigger functions that call other public functions
-- After search_path was set to '' on all functions,
-- trigger functions must use schema-qualified references.
-- Also handle the case where tenant_usage table may not exist.
-- ============================================

-- Fix track_assessment_creation (fires on site_surveys insert)
-- Gracefully skip if tenant_usage table does not exist
CREATE OR REPLACE FUNCTION public.track_assessment_creation()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(NEW.organization_id, 'assessments');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix track_photo_upload (fires on site_survey_photos insert)
CREATE OR REPLACE FUNCTION public.track_photo_upload()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(
      (SELECT organization_id FROM public.site_surveys WHERE id = NEW.site_survey_id),
      'photos'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
