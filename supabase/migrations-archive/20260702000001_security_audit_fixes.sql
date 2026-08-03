-- ============================================================================
-- Security audit fixes (2026-07-02)
--
-- Addresses findings from the codebase security audit:
--   1. feedback_surveys had world-open RLS policies (USING(true)) for public
--      SELECT and UPDATE, leaving token validation entirely to the app layer.
--      The public feedback route already reads/writes exclusively through the
--      SECURITY DEFINER RPCs get_feedback_survey_by_token() and submit_feedback(),
--      which validate the token internally and bypass RLS as the definer, so the
--      raw-table public policies are unnecessary and dangerous. Authenticated
--      org access is retained by the "Users can manage their org feedback surveys"
--      FOR ALL policy (organization_id = get_user_organization_id()).
--   2. invoices / invoice_line_items retained a leftover table-level GRANT to the
--      anon role from a PostgREST schema-cache workaround. RLS blocks anon reads
--      today, but the grant removes the defense-in-depth layer on the platform's
--      most sensitive financial tables. Revoke it (mirrors the explicit
--      REVOKE ... FROM anon already applied to the credential tables).
-- ============================================================================

-- 1. Remove world-open public policies on feedback_surveys.
DROP POLICY IF EXISTS "Public can view surveys by token" ON public.feedback_surveys;
DROP POLICY IF EXISTS "Public can update surveys by token" ON public.feedback_surveys;

-- 2. Revoke the leftover anon grant on the financial tables.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.invoices FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items FROM anon;
