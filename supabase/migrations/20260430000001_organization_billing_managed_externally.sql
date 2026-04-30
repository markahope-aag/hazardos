-- Allow specific orgs (e.g. AHS) to opt out of the in-app SaaS billing tab.
-- These customers are on a manual or custom billing arrangement, so the
-- Stripe-driven Billing settings page is misleading for them.
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS billing_managed_externally BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN organizations.billing_managed_externally IS
    'When TRUE, the in-app Billing settings tab is hidden for this organization. Used for customers on custom billing arrangements outside the standard SaaS flow.';

-- Apply the flag to AHS. Match on common name variants so this is robust
-- to whichever exact form was used at signup.
UPDATE organizations
SET billing_managed_externally = TRUE
WHERE name ILIKE 'AHS'
   OR name ILIKE 'AHS %'
   OR name ILIKE '% AHS'
   OR name ILIKE '% AHS %'
   OR name ILIKE '%Asbestos Hazard%';
