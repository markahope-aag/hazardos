-- Phase 3: Customer Contacts
-- Allows multiple contacts per customer with roles and communication preferences

-- ============================================================================
-- CUSTOMER CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Contact Info
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,

  -- Role & Preferences
  role TEXT NOT NULL DEFAULT 'general' CHECK (role IN ('primary', 'billing', 'site', 'scheduling', 'general')),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('email', 'phone', 'mobile', 'any')),

  -- Notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT customer_contacts_org_customer_fk
    FOREIGN KEY (organization_id, customer_id)
    REFERENCES customers(organization_id, id) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_customer_contacts_customer ON customer_contacts(customer_id);
CREATE INDEX idx_customer_contacts_org ON customer_contacts(organization_id);
CREATE INDEX idx_customer_contacts_primary ON customer_contacts(customer_id, is_primary) WHERE is_primary = true;
CREATE INDEX idx_customer_contacts_role ON customer_contacts(customer_id, role);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;

-- View contacts in your organization
CREATE POLICY "Users can view contacts in their organization"
  ON customer_contacts FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Insert contacts in your organization
CREATE POLICY "Users can insert contacts in their organization"
  ON customer_contacts FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- Update contacts in your organization
CREATE POLICY "Users can update contacts in their organization"
  ON customer_contacts FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- Delete contacts in your organization
CREATE POLICY "Users can delete contacts in their organization"
  ON customer_contacts FOR DELETE
  USING (organization_id = get_user_organization_id());

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER set_customer_contacts_updated_at
  BEFORE UPDATE ON customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PRIMARY CONTACT SYNC TRIGGER
-- Ensures only one primary contact per customer and syncs to customers table
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_primary_contact()
RETURNS TRIGGER AS $$
BEGIN
  -- If setting this contact as primary
  IF NEW.is_primary = true THEN
    -- Unset any other primary contacts for this customer
    UPDATE customer_contacts
    SET is_primary = false, updated_at = now()
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_primary = true;

    -- Sync to customers table
    UPDATE customers
    SET
      name = NEW.name,
      email = NEW.email,
      phone = COALESCE(NEW.phone, NEW.mobile),
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER sync_primary_contact_trigger
  AFTER INSERT OR UPDATE OF is_primary, name, email, phone, mobile
  ON customer_contacts
  FOR EACH ROW
  WHEN (NEW.is_primary = true)
  EXECUTE FUNCTION sync_primary_contact();

-- ============================================================================
-- ENSURE PRIMARY CONTACT FUNCTION
-- Called when deleting primary contact to promote another
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_primary_contact()
RETURNS TRIGGER AS $$
DECLARE
  remaining_contact UUID;
BEGIN
  -- Only act if we deleted a primary contact
  IF OLD.is_primary = true THEN
    -- Find another contact to make primary
    SELECT id INTO remaining_contact
    FROM customer_contacts
    WHERE customer_id = OLD.customer_id
    ORDER BY
      CASE role
        WHEN 'primary' THEN 1
        WHEN 'billing' THEN 2
        WHEN 'site' THEN 3
        WHEN 'scheduling' THEN 4
        ELSE 5
      END,
      created_at ASC
    LIMIT 1;

    -- Promote if found
    IF remaining_contact IS NOT NULL THEN
      UPDATE customer_contacts
      SET is_primary = true, updated_at = now()
      WHERE id = remaining_contact;
    END IF;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ensure_primary_contact_trigger
  AFTER DELETE ON customer_contacts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_primary_contact();

-- ============================================================================
-- MIGRATE EXISTING CUSTOMER DATA
-- Create initial contact from existing customer fields
-- ============================================================================

INSERT INTO customer_contacts (
  organization_id,
  customer_id,
  name,
  email,
  phone,
  role,
  is_primary
)
SELECT
  organization_id,
  id,
  name,
  email,
  phone,
  'primary',
  true
FROM customers
WHERE name IS NOT NULL
ON CONFLICT DO NOTHING;
