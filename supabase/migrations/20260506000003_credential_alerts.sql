-- ============================================================================
-- Credential expiry alert log — de-duplication for the daily sweep.
--
-- The sweep alerts as a credential crosses each threshold bucket (30/14/7/0
-- days). One row per (credential, threshold) guarantees a bucket is only ever
-- alerted once, so a worker/admin isn't re-notified every day. When a
-- credential is renewed the service clears its rows so a future lapse alerts
-- again. Rows are inserted by the cron (service role); clients only read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS credential_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  credential_id UUID NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  threshold_days INTEGER NOT NULL,
  notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT credential_alerts_unique UNIQUE (credential_id, threshold_days)
);

CREATE INDEX IF NOT EXISTS idx_credential_alerts_org ON credential_alerts (organization_id);
CREATE INDEX IF NOT EXISTS idx_credential_alerts_credential ON credential_alerts (credential_id);

ALTER TABLE credential_alerts ENABLE ROW LEVEL SECURITY;

-- Read: any org member. Delete: admins/owners (used to reset dedup on renewal).
-- Inserts come from the cron via the service role, which bypasses RLS.
DROP POLICY IF EXISTS "credential_alerts_select" ON credential_alerts;
CREATE POLICY "credential_alerts_select" ON credential_alerts FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "credential_alerts_delete" ON credential_alerts;
CREATE POLICY "credential_alerts_delete" ON credential_alerts FOR DELETE
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  );

REVOKE ALL ON credential_alerts FROM anon;
GRANT SELECT, DELETE ON credential_alerts TO authenticated;
