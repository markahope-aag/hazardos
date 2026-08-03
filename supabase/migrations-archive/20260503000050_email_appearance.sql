-- Per-org email appearance settings. Today every email caller
-- builds inline HTML with a hardcoded orange header and the org
-- name interpolated — the system literally cannot be branded
-- without a code change. These columns drive a shared template
-- wrapper so a tenant can customize the look from Settings → Email
-- without touching code.
--
-- Kept as discrete columns (rather than a single JSONB) so they
-- match the existing email_* columns on organizations and stay
-- queryable / typed. If we add lots more knobs later, we can fold
-- them into a single email_template_config JSONB at that point.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS email_header_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_accent_color VARCHAR(20),
  ADD COLUMN IF NOT EXISTS email_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS email_signature TEXT;

COMMENT ON COLUMN organizations.email_header_color IS
  'Hex color for the banner at the top of emails (e.g. #f97316). Falls back to a neutral default when null.';
COMMENT ON COLUMN organizations.email_accent_color IS
  'Hex color for CTA buttons in emails. Falls back to header color when null.';
COMMENT ON COLUMN organizations.email_logo_url IS
  'URL of an image to render in the email header. Falls back to text-only header when null.';
COMMENT ON COLUMN organizations.email_signature IS
  'Free-text signature appended below every email body — typically address, phone, license number.';
