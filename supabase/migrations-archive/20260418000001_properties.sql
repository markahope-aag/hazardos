-- ============================================================================
-- Properties: first-class location entity for the CRM.
--
-- In the users' mental model, the address is the prime record, not the person.
-- Remediation work is done on a property; owners change over time; the full
-- abatement history at that address is load-bearing context regardless of who
-- currently owns it. This migration introduces a canonical `properties` row
-- per unique address-per-org, a many-to-many `property_contacts` link that
-- carries role + tenancy dates (so "moved away" is representable without
-- losing the prior owner), and nullable `property_id` FKs on the four
-- entities that carry address data today. Existing rows are backfilled and
-- deduped by normalized address.
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  address_line1         TEXT NOT NULL,
  address_line2         TEXT,
  city                  TEXT,
  state                 TEXT,
  zip                   TEXT,

  -- Deterministic dedup key. Stored (not computed on read) so the unique
  -- index below can enforce "one property per normalized address per org".
  normalized_address    TEXT GENERATED ALWAYS AS (
    lower(trim(
      coalesce(address_line1, '') || ' ' ||
      coalesce(city, '')          || ' ' ||
      coalesce(state, '')         || ' ' ||
      coalesce(zip, '')
    ))
  ) STORED,

  latitude              DOUBLE PRECISION,
  longitude             DOUBLE PRECISION,

  notes                 TEXT,

  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_org_normalized
  ON properties (organization_id, normalized_address)
  WHERE normalized_address <> '';

CREATE INDEX IF NOT EXISTS idx_properties_org_city_state
  ON properties (organization_id, state, city);

-- Trigram index for fast "search as you type" across the address string.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_properties_normalized_trgm
  ON properties USING gin (normalized_address gin_trgm_ops);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access properties" ON properties;
CREATE POLICY "Org access properties" ON properties
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- property_contacts: who is (or was) associated with a property, and how.
--
-- "Moved away" is modeled as is_current=false + moved_out_date set + notes.
-- A prior owner is never deleted — that history is the point.
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_contacts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  contact_id            UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  role                  TEXT NOT NULL CHECK (role IN (
    'owner',
    'previous_owner',
    'tenant',
    'site_contact',
    'billing_contact'
  )),
  is_current            BOOLEAN NOT NULL DEFAULT TRUE,
  moved_in_date         DATE,
  moved_out_date        DATE,
  notes                 TEXT,

  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Same contact can appear at multiple properties, but not twice at the same
  -- property in the same role.
  UNIQUE (property_id, contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_property_contacts_property
  ON property_contacts (property_id, is_current, role);

CREATE INDEX IF NOT EXISTS idx_property_contacts_contact
  ON property_contacts (contact_id, is_current);

ALTER TABLE property_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access property_contacts" ON property_contacts;
CREATE POLICY "Org access property_contacts" ON property_contacts
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP TRIGGER IF EXISTS update_property_contacts_updated_at ON property_contacts;
CREATE TRIGGER update_property_contacts_updated_at
  BEFORE UPDATE ON property_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- property_id on the entities that already carry address data.
-- Nullable so existing data isn't invalidated and so records without an
-- address (rare but legal for contacts) remain valid.
-- ============================================================================

ALTER TABLE customers       ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE site_surveys    ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE opportunities   ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
ALTER TABLE jobs            ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_property     ON customers     (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_site_surveys_property  ON site_surveys  (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunities_property ON opportunities (property_id) WHERE property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_property          ON jobs          (property_id) WHERE property_id IS NOT NULL;

-- ============================================================================
-- Backfill.
--
-- Pulls every row from the four source tables that has an address, unions
-- them, dedupes by (org, normalized_address), inserts into properties, then
-- updates each source row with its matching property_id. Owner-customers
-- additionally get a property_contacts row with role='owner'.
--
-- The ON CONFLICT DO NOTHING + subquery lookup pattern is used instead of
-- RETURNING because the same normalized address may come from multiple
-- source rows and we need them to all resolve to the same property_id.
-- ============================================================================

WITH candidate AS (
  SELECT organization_id, address_line1, address_line2, city, state, zip
  FROM customers
  WHERE address_line1 IS NOT NULL AND trim(address_line1) <> ''
  UNION ALL
  SELECT organization_id, site_address, NULL, site_city, site_state, site_zip
  FROM site_surveys
  WHERE site_address IS NOT NULL AND trim(site_address) <> ''
  UNION ALL
  SELECT organization_id, service_address_line1, service_address_line2, service_city, service_state, service_zip
  FROM opportunities
  WHERE service_address_line1 IS NOT NULL AND trim(service_address_line1) <> ''
  UNION ALL
  SELECT organization_id, job_address, NULL, job_city, job_state, job_zip
  FROM jobs
  WHERE job_address IS NOT NULL AND trim(job_address) <> ''
),
deduped AS (
  -- Pick one canonical spelling per (org, normalized_address). We keep the
  -- first address_line1/city/state/zip we see — address_line2 is merged
  -- opportunistically when any source had one.
  SELECT DISTINCT ON (organization_id, lower(trim(coalesce(address_line1,'') || ' ' || coalesce(city,'') || ' ' || coalesce(state,'') || ' ' || coalesce(zip,''))))
    organization_id,
    address_line1,
    (SELECT c2.address_line2 FROM candidate c2
      WHERE c2.organization_id = candidate.organization_id
        AND lower(trim(coalesce(c2.address_line1,'') || ' ' || coalesce(c2.city,'') || ' ' || coalesce(c2.state,'') || ' ' || coalesce(c2.zip,'')))
          = lower(trim(coalesce(candidate.address_line1,'') || ' ' || coalesce(candidate.city,'') || ' ' || coalesce(candidate.state,'') || ' ' || coalesce(candidate.zip,'')))
        AND c2.address_line2 IS NOT NULL
      LIMIT 1) AS address_line2,
    city,
    state,
    zip
  FROM candidate
)
INSERT INTO properties (organization_id, address_line1, address_line2, city, state, zip)
SELECT organization_id, address_line1, address_line2, city, state, zip
FROM deduped
ON CONFLICT (organization_id, normalized_address) WHERE normalized_address <> '' DO NOTHING;

-- Link each source row back to its property.

UPDATE customers c
SET property_id = p.id
FROM properties p
WHERE c.property_id IS NULL
  AND c.organization_id = p.organization_id
  AND c.address_line1 IS NOT NULL
  AND trim(c.address_line1) <> ''
  AND p.normalized_address =
    lower(trim(coalesce(c.address_line1,'') || ' ' || coalesce(c.city,'') || ' ' || coalesce(c.state,'') || ' ' || coalesce(c.zip,'')));

UPDATE site_surveys s
SET property_id = p.id
FROM properties p
WHERE s.property_id IS NULL
  AND s.organization_id = p.organization_id
  AND s.site_address IS NOT NULL
  AND trim(s.site_address) <> ''
  AND p.normalized_address =
    lower(trim(coalesce(s.site_address,'') || ' ' || coalesce(s.site_city,'') || ' ' || coalesce(s.site_state,'') || ' ' || coalesce(s.site_zip,'')));

UPDATE opportunities o
SET property_id = p.id
FROM properties p
WHERE o.property_id IS NULL
  AND o.organization_id = p.organization_id
  AND o.service_address_line1 IS NOT NULL
  AND trim(o.service_address_line1) <> ''
  AND p.normalized_address =
    lower(trim(coalesce(o.service_address_line1,'') || ' ' || coalesce(o.service_city,'') || ' ' || coalesce(o.service_state,'') || ' ' || coalesce(o.service_zip,'')));

UPDATE jobs j
SET property_id = p.id
FROM properties p
WHERE j.property_id IS NULL
  AND j.organization_id = p.organization_id
  AND j.job_address IS NOT NULL
  AND trim(j.job_address) <> ''
  AND p.normalized_address =
    lower(trim(coalesce(j.job_address,'') || ' ' || coalesce(j.job_city,'') || ' ' || coalesce(j.job_state,'') || ' ' || coalesce(j.job_zip,'')));

-- Seed property_contacts: existing linked customers become current owners.
INSERT INTO property_contacts (organization_id, property_id, contact_id, role, is_current)
SELECT c.organization_id, c.property_id, c.id, 'owner', TRUE
FROM customers c
WHERE c.property_id IS NOT NULL
ON CONFLICT (property_id, contact_id, role) DO NOTHING;

-- ============================================================================
-- Keep property_contacts.is_current honest: when moved_out_date is set, the
-- contact is no longer current. A trigger handles this so the UI/API can't
-- drift.
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_property_contact_current()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.moved_out_date IS NOT NULL THEN
    NEW.is_current = FALSE;
    IF NEW.role = 'owner' THEN
      NEW.role = 'previous_owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_contact_sync_current ON property_contacts;
CREATE TRIGGER property_contact_sync_current
  BEFORE INSERT OR UPDATE ON property_contacts
  FOR EACH ROW
  EXECUTE FUNCTION sync_property_contact_current();

NOTIFY pgrst, 'reload schema';
