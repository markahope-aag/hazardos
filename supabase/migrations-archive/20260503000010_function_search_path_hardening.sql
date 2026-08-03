-- Pin search_path on three trigger functions flagged by the Supabase
-- linter (function_search_path_mutable). With an empty search_path,
-- table refs inside the function body must be schema-qualified — done
-- here for site_surveys and estimates. touch_email_sends_updated_at
-- only touches NEW, so no qualification needed.
--
-- Behavior is unchanged; this just removes a search_path hijack vector
-- in case any of these triggers ever runs under a caller who has set a
-- malicious search_path.

CREATE OR REPLACE FUNCTION set_survey_root_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.survey_root_id IS NULL THEN
    IF NEW.parent_survey_id IS NULL THEN
      NEW.survey_root_id := NEW.id;
    ELSE
      SELECT survey_root_id INTO NEW.survey_root_id
      FROM public.site_surveys
      WHERE id = NEW.parent_survey_id;

      IF NEW.survey_root_id IS NULL THEN
        NEW.survey_root_id := NEW.parent_survey_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_survey_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.site_surveys
    WHERE survey_root_id = NEW.survey_root_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION set_estimate_root_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.estimate_root_id IS NULL THEN
    IF NEW.parent_estimate_id IS NULL THEN
      NEW.estimate_root_id := NEW.id;
    ELSE
      SELECT estimate_root_id INTO NEW.estimate_root_id
      FROM public.estimates
      WHERE id = NEW.parent_estimate_id;

      IF NEW.estimate_root_id IS NULL THEN
        NEW.estimate_root_id := NEW.parent_estimate_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_estimate_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.estimates
    WHERE estimate_root_id = NEW.estimate_root_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION touch_email_sends_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
