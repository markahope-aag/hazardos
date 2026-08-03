-- Diagnostic: verify every column the /jobs/[id] query references exists.
-- Tables/columns the server-side query touches are probed here; each
-- missing one gets a NOTICE. Read-only.
DO $$
DECLARE
  probe RECORD;
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOR probe IN SELECT * FROM (VALUES
    ('profiles', 'full_name'),
    ('profiles', 'email'),
    ('profiles', 'phone'),
    ('profiles', 'role'),
    ('job_crew', 'profile_id'),
    ('job_crew', 'role'),
    ('job_crew', 'is_lead'),
    ('job_crew', 'scheduled_start'),
    ('job_crew', 'scheduled_end'),
    ('job_equipment', 'equipment_name'),
    ('job_equipment', 'equipment_type'),
    ('job_equipment', 'quantity'),
    ('job_equipment', 'is_rental'),
    ('job_equipment', 'rental_start_date'),
    ('job_equipment', 'rental_end_date'),
    ('job_materials', 'material_name'),
    ('job_materials', 'material_type'),
    ('job_materials', 'quantity_estimated'),
    ('job_materials', 'unit'),
    ('job_disposal', 'job_id'),
    ('job_change_orders', 'job_id'),
    ('job_notes', 'job_id'),
    ('proposals', 'proposal_number'),
    ('estimates', 'estimate_number'),
    ('estimates', 'total'),
    ('estimates', 'scope_of_work'),
    ('jobs', 'estimate_id'),
    ('jobs', 'proposal_id'),
    ('jobs', 'customer_id'),
    ('jobs', 'site_survey_id'),
    ('jobs', 'gate_code'),
    ('jobs', 'lockbox_code'),
    ('jobs', 'contact_onsite_name'),
    ('jobs', 'contact_onsite_phone'),
    ('jobs', 'hazard_types'),
    ('jobs', 'access_notes'),
    ('jobs', 'special_instructions')
  ) AS t(tbl, col) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = probe.tbl
        AND column_name = probe.col
    ) THEN
      missing := array_append(missing, probe.tbl || '.' || probe.col);
    END IF;
  END LOOP;

  IF array_length(missing, 1) IS NULL THEN
    RAISE NOTICE 'JOB_QUERY_AUDIT: every referenced column exists';
  ELSE
    RAISE NOTICE 'JOB_QUERY_AUDIT: % missing: %',
      array_length(missing, 1), missing;
  END IF;
END $$;
