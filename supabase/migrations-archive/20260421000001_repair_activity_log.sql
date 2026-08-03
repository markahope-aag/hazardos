-- ============================================
-- Repair: ensure activity_log exists
-- ============================================
-- The original migration 20260201000030_activity_log.sql is marked applied
-- in supabase_migrations.schema_migrations on some environments but the
-- table is missing (likely dropped manually). The auto-activity trigger
-- added in 20260418000007 then fails every INSERT/UPDATE on a tracked
-- entity (e.g. site_surveys) with "relation 'activity_log' does not exist".
--
-- This migration is idempotent: it no-ops on environments where
-- activity_log already exists, and reconstructs the full original schema
-- (indexes + RLS) where it doesn't.

CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  user_id UUID REFERENCES profiles(id),
  user_name VARCHAR(255),

  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),

  old_values JSONB,
  new_values JSONB,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org ON activity_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org activity" ON activity_log;
CREATE POLICY "Users can view their org activity"
  ON activity_log FOR SELECT
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "Users can create activity logs" ON activity_log;
CREATE POLICY "Users can create activity logs"
  ON activity_log FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());
