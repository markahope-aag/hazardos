-- Multi-location support: tag every CRM entity (contact, company,
-- opportunity) with the office that owns the relationship so the team
-- can filter and sort by location. Jobs and site_surveys already
-- carry location_id (added in 20260301000003). When a new record is
-- created the creator's profile.default_location_id is used as a
-- starting value, which the server-side handlers wire up.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_customers_location
  ON customers(organization_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_location
  ON companies(organization_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_location
  ON opportunities(organization_id, location_id)
  WHERE location_id IS NOT NULL;

-- Auto-fill location on insert from the creator's profile so we don't
-- have to remember to set it everywhere in app code. Only fires when
-- the row is inserted with NULL location_id and the creator has a
-- default location set. Org users without a default location will see
-- their records land as "Unassigned" and can be moved later.
CREATE OR REPLACE FUNCTION inherit_creator_default_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.location_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT default_location_id INTO NEW.location_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS customers_inherit_default_location ON customers;
CREATE TRIGGER customers_inherit_default_location
  BEFORE INSERT ON customers
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS companies_inherit_default_location ON companies;
CREATE TRIGGER companies_inherit_default_location
  BEFORE INSERT ON companies
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS opportunities_inherit_default_location ON opportunities;
CREATE TRIGGER opportunities_inherit_default_location
  BEFORE INSERT ON opportunities
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS jobs_inherit_default_location ON jobs;
CREATE TRIGGER jobs_inherit_default_location
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS site_surveys_inherit_default_location ON site_surveys;
CREATE TRIGGER site_surveys_inherit_default_location
  BEFORE INSERT ON site_surveys
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

-- Backfill: any existing customer/company/opportunity that links to a
-- profile with a default location takes that as its starting value.
-- Records owned by users without a default location stay null and
-- show up as "Unassigned" until the team triages them.
UPDATE customers c
SET location_id = p.default_location_id
FROM profiles p
WHERE c.created_by = p.id
  AND c.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

UPDATE companies co
SET location_id = p.default_location_id
FROM profiles p
WHERE co.created_by = p.id
  AND co.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

UPDATE opportunities o
SET location_id = p.default_location_id
FROM profiles p
WHERE o.owner_id = p.id
  AND o.location_id IS NULL
  AND p.default_location_id IS NOT NULL;
