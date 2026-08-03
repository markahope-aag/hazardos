-- Single-FK "primary contact" on companies.
--
-- We already have customers.is_primary_contact, but that's a per-row
-- boolean — nothing prevents two contacts from both claiming the
-- primary seat for one company. A dedicated FK on companies is the
-- unambiguous source of truth: exactly one primary per company, or
-- none. The old boolean can coexist or be deprecated later without
-- touching this column.
--
-- ON DELETE SET NULL so deleting a contact doesn't orphan the
-- company — the primary slot just opens back up.

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS primary_contact_id UUID REFERENCES customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_primary_contact
  ON companies(primary_contact_id)
  WHERE primary_contact_id IS NOT NULL;
