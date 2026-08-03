-- Round 2 of multi-location support: tag the remaining workflow records
-- (estimates, invoices, lab reports) so the office-of-record filter
-- works end-to-end. Reuses the inherit_creator_default_location trigger
-- function from migration 20260504000090 so creators' default office
-- is auto-stamped on every new row.

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

ALTER TABLE lab_reports
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

CREATE INDEX IF NOT EXISTS idx_estimates_location
  ON estimates(organization_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_location
  ON invoices(organization_id, location_id)
  WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lab_reports_location
  ON lab_reports(organization_id, location_id)
  WHERE location_id IS NOT NULL;

-- Auto-fill triggers so new rows pick up the creator's default office.
DROP TRIGGER IF EXISTS estimates_inherit_default_location ON estimates;
CREATE TRIGGER estimates_inherit_default_location
  BEFORE INSERT ON estimates
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS invoices_inherit_default_location ON invoices;
CREATE TRIGGER invoices_inherit_default_location
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

DROP TRIGGER IF EXISTS lab_reports_inherit_default_location ON lab_reports;
CREATE TRIGGER lab_reports_inherit_default_location
  BEFORE INSERT ON lab_reports
  FOR EACH ROW EXECUTE FUNCTION inherit_creator_default_location();

-- Backfill: pull location from the upstream record where one exists.
-- Estimates → from the originating site survey or job that has a
-- location already set, falling back to the creator's default.
UPDATE estimates e
SET location_id = j.location_id
FROM jobs j
WHERE e.id = j.estimate_id
  AND e.location_id IS NULL
  AND j.location_id IS NOT NULL;

UPDATE estimates e
SET location_id = s.location_id
FROM site_surveys s
WHERE e.site_survey_id = s.id
  AND e.location_id IS NULL
  AND s.location_id IS NOT NULL;

UPDATE estimates e
SET location_id = p.default_location_id
FROM profiles p
WHERE e.created_by = p.id
  AND e.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

-- Invoices → from the linked job, then customer's location, then the
-- creator's default.
UPDATE invoices i
SET location_id = j.location_id
FROM jobs j
WHERE i.job_id = j.id
  AND i.location_id IS NULL
  AND j.location_id IS NOT NULL;

UPDATE invoices i
SET location_id = c.location_id
FROM customers c
WHERE i.customer_id = c.id
  AND i.location_id IS NULL
  AND c.location_id IS NOT NULL;

UPDATE invoices i
SET location_id = p.default_location_id
FROM profiles p
WHERE i.created_by = p.id
  AND i.location_id IS NULL
  AND p.default_location_id IS NOT NULL;

-- Lab reports → from estimate, then invoice, then creator. Lab reports
-- don't have a direct job_id; estimates and invoices both carry their
-- own location now so this transitively works.
UPDATE lab_reports lr
SET location_id = e.location_id
FROM estimates e
WHERE lr.estimate_id = e.id
  AND lr.location_id IS NULL
  AND e.location_id IS NOT NULL;

UPDATE lab_reports lr
SET location_id = i.location_id
FROM invoices i
WHERE lr.invoice_id = i.id
  AND lr.location_id IS NULL
  AND i.location_id IS NOT NULL;

UPDATE lab_reports lr
SET location_id = p.default_location_id
FROM profiles p
WHERE lr.created_by = p.id
  AND lr.location_id IS NULL
  AND p.default_location_id IS NOT NULL;
