-- ============================================================================
-- Estimate ↔ organization_documents join.
--
-- Lets estimators attach licenses, certifications, insurance certs, and
-- other credential documents to an estimate. When the proposal is sent
-- to the customer, the send route inlines signed URLs to each attached
-- document so the prospect gets proof of qualification together with
-- the bid — without anyone having to dig through email for the right
-- COI.
--
-- Held in a join table so a single document can be attached to many
-- estimates without duplication, and removing a credential from the
-- catalog cleans up every reference.
-- ============================================================================

CREATE TABLE IF NOT EXISTS estimate_attached_documents (
  estimate_id      UUID NOT NULL REFERENCES estimates(id)              ON DELETE CASCADE,
  document_id      UUID NOT NULL REFERENCES organization_documents(id) ON DELETE CASCADE,

  -- Denormalized for RLS — avoids a join through estimates on every
  -- query and keeps the policy expression cheap.
  organization_id  UUID NOT NULL REFERENCES organizations(id)          ON DELETE CASCADE,

  attached_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attached_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (estimate_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_estimate_attached_documents_estimate
  ON estimate_attached_documents (estimate_id);

CREATE INDEX IF NOT EXISTS idx_estimate_attached_documents_document
  ON estimate_attached_documents (document_id);

ALTER TABLE estimate_attached_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access estimate_attached_documents" ON estimate_attached_documents;
CREATE POLICY "Org access estimate_attached_documents" ON estimate_attached_documents
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

NOTIFY pgrst, 'reload schema';
