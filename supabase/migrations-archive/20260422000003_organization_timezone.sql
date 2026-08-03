-- Per-tenant timezone. Remediation crews usually operate in a single
-- metro's timezone, so picking one setting per organization covers the
-- realistic case. Used throughout the app for "today" calculations,
-- schedule displays, and period boundaries so the dashboard reflects
-- the customer's clock rather than the server's.
--
-- Default 'America/Chicago' because HazardOS customers are US-based and
-- US Central sits in the middle; any customer can override in Settings.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Chicago';
