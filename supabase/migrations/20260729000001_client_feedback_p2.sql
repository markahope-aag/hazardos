-- ============================================================================
-- P2 sweep from the 2026-07-28 client call.
--
-- Schema for: contact classification, archiving contacts and surveys, the
-- "no visit" opportunity flag, and tying lab reports to a property.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Contact classification
--
-- Gina asks for a "Contact Type" so a realtor who brings repeat work is
-- visible at a glance — today she types "(realtor)" after the name.
--
-- `contact_type` is already taken by residential/commercial, and
-- `contact_role` describes someone's role on a deal (decision maker, billing,
-- site contact). This is a third, orthogonal thing: what kind of party they
-- are. Named contact_category in the schema, labelled "Contact Type" in the
-- UI because that's the language the client uses.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_category') THEN
    CREATE TYPE contact_category AS ENUM (
      'property_owner',
      'homeowner',
      'realtor',
      'project_manager',
      'designated_person',  -- schools; the named AHERA contact
      'landlord',
      'contractor',
      'other'
    );
  END IF;
END $$;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS contact_category contact_category;

COMMENT ON COLUMN customers.contact_category IS
  'What kind of party this contact is (realtor, PM, landlord…). Distinct from
   contact_type (residential/commercial) and contact_role (role on a deal).';

CREATE INDEX IF NOT EXISTS idx_customers_org_category
  ON customers (organization_id, contact_category)
  WHERE contact_category IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Archiving
--
-- Two requests, one intent: "I don't want it to die, but I don't want it
-- showing up saying there's something here you need to address."
--
--   Contacts — when someone moves away, archive rather than delete so the
--   record stays retrievable. Deleting was never safe anyway: customers has
--   eight cascade FKs including disposal manifests (P1-5 of the July audit).
--
--   Surveys — a site visit that produced no estimate should stop appearing as
--   outstanding work but stay attached to the property.
--
-- Both use their existing status enums rather than a parallel archived_at
-- flag, so every list that already filters on status keeps working without
-- having to learn about a second concept.
-- ----------------------------------------------------------------------------
ALTER TYPE contact_status ADD VALUE IF NOT EXISTS 'archived';
ALTER TYPE site_survey_status ADD VALUE IF NOT EXISTS 'archived';

-- Who archived it and why. Nullable — only set when archived.
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE site_surveys
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS archive_reason TEXT;

COMMENT ON COLUMN site_surveys.archive_reason IS
  'Why the survey was filed away — typically "visited, no estimate needed".';

-- ----------------------------------------------------------------------------
-- "No visit" opportunities
--
-- Hover reports and similar arrive without anyone attending site. Gina fakes
-- these today with dummy 3pm jobs so they do not look like real visits.
-- ----------------------------------------------------------------------------
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS no_visit BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN opportunities.no_visit IS
  'True when the work was quoted without attending site (e.g. a hover report).';

-- ----------------------------------------------------------------------------
-- Lab reports belong to the property, permanently
--
-- "Joe Schmoe moved away from 123 Main Street. I still want to know that that
-- kitchen had no asbestos on that floor." Today a lab report links only to a
-- customer, so the result leaves with the occupant.
--
-- Composite FK to (id, organization_id) for the same tenant-isolation
-- integrity used on work_orders.job_id.
-- ----------------------------------------------------------------------------
ALTER TABLE lab_reports
  ADD COLUMN IF NOT EXISTS property_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lab_reports_property_id_org_fkey'
  ) THEN
    ALTER TABLE lab_reports
      ADD CONSTRAINT lab_reports_property_id_org_fkey
      FOREIGN KEY (property_id, organization_id)
      REFERENCES properties (id, organization_id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lab_reports_property
  ON lab_reports (property_id)
  WHERE property_id IS NOT NULL;

COMMENT ON COLUMN lab_reports.property_id IS
  'The physical location the samples came from. Survives the occupant moving
   on — the result is a fact about the building, not the customer.';
