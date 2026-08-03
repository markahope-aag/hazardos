-- ============================================
-- MANIFESTS
-- ============================================
-- A manifest is the single sheet the crew takes to the site. It bundles
-- the site location, the scope of work, the people assigned, the
-- materials and equipment to bring, and the vehicles/rentals needed.
--
-- A manifest is ALWAYS attached to a job. When it's generated, we snapshot
-- the relevant bits of the job, estimate, customer, crew, equipment, and
-- materials into JSONB so the paper the crew took to the field matches
-- what was dispatched — even if the office edits the job afterward.
-- The office manager can also edit the manifest itself (adds, removes,
-- adjustments) before it's issued; after issue the content is locked.

CREATE TABLE IF NOT EXISTS manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  manifest_number TEXT NOT NULL,

  -- draft  → editable, not yet handed to crew
  -- issued → locked; the version the crew took to the site
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'issued')),

  -- Populated from source records at generate-time; editable while status
  -- is 'draft'. Schema is versioned implicitly via the "version" key so
  -- future changes don't break old records.
  --
  -- Top-level shape: { version, site, job, customer, estimate, crew,
  --                    equipment, materials, extra_items }
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Free-text dispatch notes — things to tell the crew that don't belong
  -- in the snapshot (safety callouts, parking, etc.).
  notes TEXT,

  issued_at TIMESTAMPTZ,
  issued_by UUID REFERENCES profiles(id),

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (organization_id, manifest_number)
);

CREATE INDEX IF NOT EXISTS idx_manifests_org ON manifests(organization_id);
CREATE INDEX IF NOT EXISTS idx_manifests_job ON manifests(job_id);
CREATE INDEX IF NOT EXISTS idx_manifests_status ON manifests(status);

-- Vehicles are distinct enough from equipment (they carry drivers, plates,
-- DOT paperwork) to warrant their own table instead of a JSON blob. This
-- also makes it easy to attach a vehicle to multiple manifests in the
-- future without duplicating metadata.
CREATE TABLE IF NOT EXISTS manifest_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_id UUID NOT NULL REFERENCES manifests(id) ON DELETE CASCADE,

  vehicle_type TEXT,              -- 'truck', 'trailer', 'van', ...
  make_model TEXT,                -- 'Ford F-250'
  plate TEXT,
  driver_profile_id UUID REFERENCES profiles(id),
  driver_name TEXT,               -- fallback if driver isn't a user
  is_rental BOOLEAN DEFAULT FALSE,
  rental_vendor TEXT,
  rental_rate_daily NUMERIC(10, 2),
  rental_start_date DATE,
  rental_end_date DATE,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manifest_vehicles_manifest ON manifest_vehicles(manifest_id);

-- RLS
ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE manifest_vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their org manifests" ON manifests;
CREATE POLICY "Users can manage their org manifests"
  ON manifests FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can manage manifest vehicles for their org" ON manifest_vehicles;
CREATE POLICY "Users can manage manifest vehicles for their org"
  ON manifest_vehicles FOR ALL
  USING (EXISTS (
    SELECT 1 FROM manifests
    WHERE manifests.id = manifest_vehicles.manifest_id
      AND manifests.organization_id = get_user_organization_id()
  ));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_manifests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS manifests_updated_at ON manifests;
CREATE TRIGGER manifests_updated_at
  BEFORE UPDATE ON manifests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_manifests_updated_at();

-- Manifest numbering: MAN-<street>-<mmddyyyy>, same convention as jobs and
-- estimates. Prefers the job's existing suffix so the three documents for
-- a single project share an identifier (JOB-1210-4212026 ⇒ MAN-1210-4212026).
-- Collision handling falls back to a -2, -3, ... suffix.
CREATE OR REPLACE FUNCTION public.generate_manifest_number(
  p_organization_id UUID,
  p_job_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  base TEXT;
  candidate TEXT;
  suffix INT := 2;
BEGIN
  -- Reuse the job's suffix when possible.
  SELECT REGEXP_REPLACE(job_number, '^JOB-', 'MAN-')
    INTO base
    FROM public.jobs
    WHERE id = p_job_id;

  IF base IS NULL OR base !~ '^MAN-' THEN
    base := 'MAN-' || TO_CHAR(NOW(), 'MMDDYYYY');
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.manifests
    WHERE organization_id = p_organization_id AND manifest_number = candidate
  ) LOOP
    candidate := base || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

COMMENT ON TABLE manifests IS
  'Crew-facing dispatch sheet for a job. Snapshot is frozen at issue time so the paper version matches what the crew took even if the job is later edited.';
COMMENT ON TABLE manifest_vehicles IS
  'Vehicles assigned to a manifest — trucks, trailers, vans, rentals.';
