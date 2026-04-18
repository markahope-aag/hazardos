-- ============================================================================
-- Address changes are admin-only.
--
-- A surveyor in the field can draft a contact, an estimate, a site survey,
-- or a job — but once an address is recorded, only the office manager (admin)
-- or the company owner (tenant_owner) can change it. Addresses are the
-- anchor for the whole property-first CRM model; unrestricted editing would
-- let a technician silently reassign work history to the wrong location.
--
-- Enforced at the DB with BEFORE UPDATE triggers so every path (API, direct
-- Supabase client, future integrations) is covered. Service-role writes
-- (backfills, scheduled jobs, system triggers) pass through because
-- get_user_role() returns NULL when auth.uid() is null — no real session
-- means we trust the caller.
-- ============================================================================

CREATE OR REPLACE FUNCTION enforce_admin_for_address_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT := get_user_role();
  col TEXT;
  old_row JSONB := to_jsonb(OLD);
  new_row JSONB := to_jsonb(NEW);
BEGIN
  -- Admin-or-above, or no session at all (service role / system), can edit.
  IF role_name IS NULL
    OR role_name IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  THEN
    RETURN NEW;
  END IF;

  -- Otherwise, scan the address columns this trigger was configured with and
  -- reject the update if any of them actually changed.
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF (old_row ->> col) IS DISTINCT FROM (new_row ->> col) THEN
      RAISE EXCEPTION 'Only admins can change addresses (attempted to change % on %)', col, TG_TABLE_NAME
        USING ERRCODE = '42501',
              HINT = 'Ask your office manager or company owner to update this address.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Apply to each table that carries address data. Column lists are passed as
-- trigger arguments so the function stays table-agnostic.
-- `property_id` is included where it links a record to a canonical property
-- — swapping it is functionally "changing the address".
-- ============================================================================

DROP TRIGGER IF EXISTS enforce_admin_address_properties ON properties;
CREATE TRIGGER enforce_admin_address_properties
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'address_line1', 'address_line2', 'city', 'state', 'zip', 'latitude', 'longitude'
  );

DROP TRIGGER IF EXISTS enforce_admin_address_customers ON customers;
CREATE TRIGGER enforce_admin_address_customers
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'address_line1', 'address_line2', 'city', 'state', 'zip', 'property_id'
  );

DROP TRIGGER IF EXISTS enforce_admin_address_companies ON companies;
CREATE TRIGGER enforce_admin_address_companies
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'billing_address_line1', 'billing_address_line2', 'billing_city', 'billing_state', 'billing_zip',
    'service_address_line1', 'service_address_line2', 'service_city', 'service_state', 'service_zip'
  );

DROP TRIGGER IF EXISTS enforce_admin_address_site_surveys ON site_surveys;
CREATE TRIGGER enforce_admin_address_site_surveys
  BEFORE UPDATE ON site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'site_address', 'site_city', 'site_state', 'site_zip', 'property_id'
  );

DROP TRIGGER IF EXISTS enforce_admin_address_opportunities ON opportunities;
CREATE TRIGGER enforce_admin_address_opportunities
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'service_address_line1', 'service_address_line2', 'service_city', 'service_state', 'service_zip', 'property_id'
  );

DROP TRIGGER IF EXISTS enforce_admin_address_jobs ON jobs;
CREATE TRIGGER enforce_admin_address_jobs
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_for_address_change(
    'job_address', 'job_city', 'job_state', 'job_zip', 'property_id'
  );
