-- ============================================================================
-- Compliance & Credential Tracking — per-org starter credential types
--
-- Mirrors the pipeline_stages seeding pattern (20260220000002): a trigger
-- seeds a sensible starter catalog when an organization is created, and a
-- one-time backfill covers organizations that already exist.
--
-- The starter set is intentionally conservative and fully editable per-org —
-- the required_for_* mappings are defaults, not regulatory truth. Firms tune
-- them to their jurisdiction.
-- ============================================================================

CREATE OR REPLACE FUNCTION create_default_credential_types()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credential_types (
    organization_id, name, category, applies_to, issuing_authority,
    default_valid_days, warning_lead_days,
    required_for_hazard_types, required_for_containment_levels
  ) VALUES
    (NEW.id, 'Asbestos Worker License',      'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_i','type_ii','type_iii']),
    (NEW.id, 'Asbestos Supervisor License',  'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_ii','type_iii']),
    (NEW.id, 'Lead (RRP) Certification',     'rrp_certification',   'worker', 'EPA', 1825, 60, ARRAY['lead'],     NULL),
    (NEW.id, 'Respirator Fit Test',          'respirator_fit_test', 'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']),
    (NEW.id, 'Medical Clearance (OSHA)',     'medical_clearance',   'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger functions must not be directly callable by clients.
REVOKE EXECUTE ON FUNCTION public.create_default_credential_types() FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_credential_types_for_new_org') THEN
    CREATE TRIGGER create_credential_types_for_new_org
      AFTER INSERT ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION create_default_credential_types();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- Backfill: seed the starter set for any existing org that has none yet.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    IF NOT EXISTS (SELECT 1 FROM credential_types WHERE organization_id = org.id) THEN
      INSERT INTO credential_types (
        organization_id, name, category, applies_to, issuing_authority,
        default_valid_days, warning_lead_days,
        required_for_hazard_types, required_for_containment_levels
      ) VALUES
        (org.id, 'Asbestos Worker License',      'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_i','type_ii','type_iii']),
        (org.id, 'Asbestos Supervisor License',  'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_ii','type_iii']),
        (org.id, 'Lead (RRP) Certification',     'rrp_certification',   'worker', 'EPA', 1825, 60, ARRAY['lead'],     NULL),
        (org.id, 'Respirator Fit Test',          'respirator_fit_test', 'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']),
        (org.id, 'Medical Clearance (OSHA)',     'medical_clearance',   'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']);
    END IF;
  END LOOP;
END $$;
