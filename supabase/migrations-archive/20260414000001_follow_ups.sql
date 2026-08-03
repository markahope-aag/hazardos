-- ============================================================================
-- Follow-ups: polymorphic reminder/task list keyed by (entity_type, entity_id)
--
-- Single source of truth for "follow up with X about Y" across all CRM
-- entities. Replaces the need for per-table next_followup_date columns.
-- The legacy customers.next_followup_date / next_followup_note columns are
-- left in place for now and will be migrated into this table in a later
-- pass so we don't silently break anything reading them today.
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_ups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What this follow-up is about. entity_type is a string (not enum) so new
  -- entities can be added without a schema migration; the check keeps it
  -- constrained to values we actually support.
  entity_type     TEXT NOT NULL CHECK (entity_type IN (
    'estimate',
    'job',
    'opportunity',
    'customer',
    'contact',
    'site_survey',
    'invoice',
    'proposal'
  )),
  entity_id       UUID NOT NULL,

  -- When the follow-up is due. Timestamptz (not just date) so we can do
  -- "due in next 24h" without timezone headaches.
  due_date        TIMESTAMPTZ NOT NULL,
  note            TEXT,

  -- Who is supposed to do it (nullable = unassigned / anyone).
  assigned_to     UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Lifecycle
  completed_at    TIMESTAMPTZ,
  completed_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Audit
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: "give me the next pending follow-up for each of these entities".
-- entity_type first so per-list queries hit a narrow slice of the index.
CREATE INDEX IF NOT EXISTS idx_follow_ups_entity
  ON follow_ups (entity_type, entity_id, completed_at, due_date);

-- "What's due across the whole org" dashboard queries.
CREATE INDEX IF NOT EXISTS idx_follow_ups_org_pending
  ON follow_ups (organization_id, completed_at, due_date);

-- "What's on my plate" per-user queries.
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned
  ON follow_ups (assigned_to, completed_at, due_date)
  WHERE assigned_to IS NOT NULL;

-- ============================================================================
-- RLS: one org-scoped policy, same shape as every other tenant-owned table.
-- ============================================================================
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access follow_ups" ON follow_ups;
CREATE POLICY "Org access follow_ups" ON follow_ups
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- updated_at maintenance
DROP TRIGGER IF EXISTS update_follow_ups_updated_at ON follow_ups;
CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
