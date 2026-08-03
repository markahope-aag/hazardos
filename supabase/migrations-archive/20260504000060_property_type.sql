-- Add property_type to the canonical address-level record so the CRM
-- can show residential vs commercial in the properties list and on the
-- detail card. Uses the existing property_type enum that opportunities
-- already use, so the value is portable across surfaces.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS property_type property_type;

-- Backfill 1: anything with a linked opportunity that has a property_type
-- inherits it from the most recent opportunity on that property.
UPDATE properties p
SET property_type = sub.property_type
FROM (
  SELECT DISTINCT ON (o.property_id)
    o.property_id, o.property_type
  FROM opportunities o
  WHERE o.property_id IS NOT NULL
    AND o.property_type IS NOT NULL
  ORDER BY o.property_id, o.created_at DESC
) sub
WHERE p.id = sub.property_id
  AND p.property_type IS NULL;

-- Backfill 2: any remaining property gets its type inferred from current
-- contacts. A single commercial-tagged contact is enough to flip the
-- property to commercial — the office can refine to industrial/government
-- later from the detail page.
UPDATE properties p
SET property_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM property_contacts pc
    JOIN customers c ON c.id = pc.contact_id
    WHERE pc.property_id = p.id
      AND pc.is_current = true
      AND c.contact_type = 'commercial'
  ) THEN 'commercial'::property_type
  WHEN EXISTS (
    SELECT 1 FROM property_contacts pc
    JOIN customers c ON c.id = pc.contact_id
    WHERE pc.property_id = p.id
      AND pc.is_current = true
      AND c.contact_type = 'residential'
  ) THEN 'residential_single_family'::property_type
  ELSE NULL
END
WHERE p.property_type IS NULL;

-- Speeds up filtering in the list view if/when filters get added.
CREATE INDEX IF NOT EXISTS idx_properties_property_type
  ON properties(organization_id, property_type)
  WHERE property_type IS NOT NULL;
