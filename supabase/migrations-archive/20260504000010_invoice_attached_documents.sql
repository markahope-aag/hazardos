-- ============================================================================
-- Invoice ↔ job_documents join.
--
-- Lets the user pick documents already uploaded to the linked job (lab
-- reports, clearance reports, manifests, photos, etc.) and have them
-- attached to the invoice email when it's sent. Staff don't have to
-- duplicate the upload — the lab report already lives on the job, so the
-- invoice just references it.
--
-- Invoices without a linked job won't have anything to attach yet; the
-- UI shows an empty state in that case.
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_attached_documents (
  invoice_id       UUID NOT NULL REFERENCES invoices(id)       ON DELETE CASCADE,
  job_document_id  UUID NOT NULL REFERENCES job_documents(id)  ON DELETE CASCADE,

  -- Denormalized for RLS — same pattern as estimate_attached_documents:
  -- avoids a join through invoices on every query and keeps the policy
  -- expression cheap.
  organization_id  UUID NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,

  attached_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  attached_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (invoice_id, job_document_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_attached_documents_invoice
  ON invoice_attached_documents (invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_attached_documents_document
  ON invoice_attached_documents (job_document_id);

ALTER TABLE invoice_attached_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access invoice_attached_documents" ON invoice_attached_documents;
CREATE POLICY "Org access invoice_attached_documents" ON invoice_attached_documents
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

NOTIFY pgrst, 'reload schema';
