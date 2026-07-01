-- ============================================================================
-- Compliance & Credential Tracking — core schema
--
-- A reusable "credential + expiry + proactive alert, scoped to a subject"
-- primitive. Phase 1 tracks WORKER credentials (asbestos/lead licenses,
-- respirator fit tests, medical clearances). The shape is deliberately built
-- so equipment-calibration (asset_id / equipment_calibration category) can
-- reuse it later with no schema reshaping.
--
-- Conventions mirrored from the codebase:
--   * org-scoped tables with RLS (get_user_organization_id())
--   * composite FK org-integrity (parent UNIQUE(id, organization_id) + child
--     FK on (child_col, organization_id)) — see 20260505000090
--   * SECURITY DEFINER helpers with pinned search_path; anon grants revoked
--   * derived status computed, not stored (mirrors derived payment status)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Enums (guarded so re-runs are safe)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credential_category') THEN
    CREATE TYPE credential_category AS ENUM (
      'worker_license',
      'rrp_certification',
      'respirator_fit_test',
      'medical_clearance',
      'equipment_calibration',  -- reserved for Phase 2 (asset calibration)
      'other'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'credential_applies_to') THEN
    -- Phase 1 uses 'worker'; 'asset' is reserved for equipment calibration.
    CREATE TYPE credential_applies_to AS ENUM ('worker', 'asset');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. profiles needs a UNIQUE(id, organization_id) so a credential can hold a
--    composite FK to the worker and keep org-integrity (a worker's credential
--    can't reference a profile in another tenant). id is already PK/unique;
--    this simply names the (id, organization_id) tuple as an FK target.
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_org_id_key') THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_org_id_key UNIQUE (id, organization_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. credential_types — per-org catalog of what can be tracked
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credential_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  category credential_category NOT NULL DEFAULT 'other',
  applies_to credential_applies_to NOT NULL DEFAULT 'worker',
  issuing_authority TEXT,
  -- Used to auto-suggest an expiry date from the issue date in the UI.
  default_valid_days INTEGER CHECK (default_valid_days IS NULL OR default_valid_days > 0),
  -- Per-type lead window for "expiring soon" (configurable; default 30 days).
  warning_lead_days INTEGER NOT NULL DEFAULT 30 CHECK (warning_lead_days >= 0),
  -- Which job requirements make this credential mandatory. Text arrays match
  -- the job vocabulary: jobs.containment_level enum values ('type_i'..) and
  -- jobs.hazard_types text[].
  required_for_containment_levels TEXT[],
  required_for_hazard_types TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credential_types_id_org_id_key UNIQUE (id, organization_id)
);

-- ----------------------------------------------------------------------------
-- 4. credentials — instances of a held credential
--    Exactly one subject (worker_id XOR asset_id). We use two nullable columns
--    with a CHECK rather than a polymorphic subject_type/subject_id pair, so
--    each subject keeps a real composite FK with org-integrity. asset_id is
--    unused in Phase 1 (no assets table yet) but the shape is ready.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_type_id UUID NOT NULL,
  worker_id UUID,
  asset_id UUID,  -- reserved for Phase 2; no FK until an assets table exists
  identifier VARCHAR(255),
  issued_date DATE,
  expiry_date DATE,  -- nullable: some credentials never expire
  document_path TEXT,  -- Supabase Storage / R2 ref for the uploaded cert
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT credentials_exactly_one_subject CHECK (
    (worker_id IS NOT NULL AND asset_id IS NULL) OR
    (worker_id IS NULL AND asset_id IS NOT NULL)
  ),
  -- Composite FK: a credential's type must live in the same org.
  CONSTRAINT credentials_type_org_fkey
    FOREIGN KEY (credential_type_id, organization_id)
    REFERENCES credential_types (id, organization_id) ON DELETE RESTRICT,
  -- Composite FK: a worker credential must reference a profile in the same org.
  -- (worker_id NULL in the asset case → MATCH SIMPLE leaves this unenforced.)
  CONSTRAINT credentials_worker_org_fkey
    FOREIGN KEY (worker_id, organization_id)
    REFERENCES profiles (id, organization_id) ON DELETE CASCADE
);

-- ----------------------------------------------------------------------------
-- 5. Indexes tuned for the two hot paths: the daily expiry sweep and the
--    per-worker compliance lookup.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_credentials_org_expiry ON credentials (organization_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_credentials_org_worker ON credentials (organization_id, worker_id);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials (credential_type_id);
CREATE INDEX IF NOT EXISTS idx_credential_types_org ON credential_types (organization_id);

-- ----------------------------------------------------------------------------
-- 6. updated_at triggers (reuse the shared function; idempotent)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS set_credential_types_updated_at ON credential_types;
CREATE TRIGGER set_credential_types_updated_at
  BEFORE UPDATE ON credential_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_credentials_updated_at ON credentials;
CREATE TRIGGER set_credentials_updated_at
  BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. RLS — read for any org member; writes restricted to admins/owners.
--    (API routes also gate roles, but RLS is the real guard for direct
--    PostgREST access from the client.)
-- ----------------------------------------------------------------------------
ALTER TABLE credential_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

-- credential_types
DROP POLICY IF EXISTS "credential_types_select" ON credential_types;
CREATE POLICY "credential_types_select" ON credential_types FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "credential_types_insert" ON credential_types;
CREATE POLICY "credential_types_insert" ON credential_types FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

DROP POLICY IF EXISTS "credential_types_update" ON credential_types;
CREATE POLICY "credential_types_update" ON credential_types FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

DROP POLICY IF EXISTS "credential_types_delete" ON credential_types;
CREATE POLICY "credential_types_delete" ON credential_types FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

-- credentials
DROP POLICY IF EXISTS "credentials_select" ON credentials;
CREATE POLICY "credentials_select" ON credentials FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "credentials_insert" ON credentials;
CREATE POLICY "credentials_insert" ON credentials FOR INSERT
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

DROP POLICY IF EXISTS "credentials_update" ON credentials;
CREATE POLICY "credentials_update" ON credentials FOR UPDATE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

DROP POLICY IF EXISTS "credentials_delete" ON credentials;
CREATE POLICY "credentials_delete" ON credentials FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

-- ----------------------------------------------------------------------------
-- 8. Grants — no anon access; authenticated goes through RLS.
-- ----------------------------------------------------------------------------
REVOKE ALL ON credential_types FROM anon;
REVOKE ALL ON credentials FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON credential_types TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credentials TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. Derived status view (computed, not stored — expiry status depends on
--    now(), so it can't be a stored generated column). security_invoker makes
--    the underlying RLS apply to the querying user.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW credential_status
  WITH (security_invoker = true) AS
SELECT
  c.id,
  c.organization_id,
  c.credential_type_id,
  c.worker_id,
  c.asset_id,
  c.identifier,
  c.issued_date,
  c.expiry_date,
  c.document_path,
  c.notes,
  c.created_at,
  c.updated_at,
  ct.name        AS credential_type_name,
  ct.category    AS category,
  ct.warning_lead_days,
  CASE
    WHEN c.expiry_date IS NULL THEN 'no_expiry'
    WHEN c.expiry_date < CURRENT_DATE THEN 'expired'
    WHEN c.expiry_date <= CURRENT_DATE + make_interval(days => COALESCE(ct.warning_lead_days, 30))
      THEN 'expiring_soon'
    ELSE 'valid'
  END AS status
FROM credentials c
JOIN credential_types ct ON ct.id = c.credential_type_id;

REVOKE ALL ON credential_status FROM anon;
GRANT SELECT ON credential_status TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. Org-level enforcement setting for the crew-assignment gate.
--     'warn' (default) surfaces a warning; 'block' rejects the assignment.
-- ----------------------------------------------------------------------------
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS credential_assignment_enforcement TEXT NOT NULL DEFAULT 'warn'
    CHECK (credential_assignment_enforcement IN ('warn', 'block'));
