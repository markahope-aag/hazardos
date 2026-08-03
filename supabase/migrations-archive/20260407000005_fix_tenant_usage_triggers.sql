-- ============================================
-- Fix trigger functions that reference tenant_usage table
-- The tenant_usage table may not exist on all instances.
-- Make trigger functions resilient to its absence.
-- ============================================

-- Fix track_assessment_creation (fires on site_surveys insert)
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
