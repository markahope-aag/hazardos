-- ============================================================================
-- Organization documents: company-level credential storage + sharing.
--
-- Environmental remediation is a regulated industry — every prospect asks
-- for proof of license, EPA certification, asbestos abatement permit, COI,
-- bond, W-9. Today the tenant has nowhere to store these centrally and no
-- way to send them out other than fishing files out of email.
--
-- This adds a real table + private storage bucket with org-scoped RLS,
-- and a sister `organization_document_shares` audit table that records
-- every external send (who got which doc, when, did they open it). The
-- audit trail is the actual point — regulators care that you can prove
-- what you sent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  file_name           TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  mime_type           TEXT,
  size_bytes          BIGINT,

  -- Display label and document number — both shown in the share email
  -- so the recipient knows what they're looking at without opening the
  -- file. e.g. "California Asbestos Contractor License" / "ASB-1234567".
  display_name        TEXT NOT NULL,
  document_number     TEXT,

  -- Category is a string with a CHECK so new types can be added without
  -- another migration as the business runs into new permit shapes.
  category            TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'license',
    'certification',
    'insurance',
    'bond',
    'w9',
    'safety_plan',
    'references',
    'other'
  )),

  -- Issuance + expiration. Tracking expiration is the whole reason
  -- regulated companies want this — letting a license lapse mid-job is
  -- a fineable offense.
  issued_on           DATE,
  expires_on          DATE,
  issuing_authority   TEXT,

  notes               TEXT,

  uploaded_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_documents_org
  ON organization_documents (organization_id, category, expires_on);

CREATE INDEX IF NOT EXISTS idx_organization_documents_expires
  ON organization_documents (organization_id, expires_on)
  WHERE expires_on IS NOT NULL;

ALTER TABLE organization_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access organization_documents" ON organization_documents;
CREATE POLICY "Org access organization_documents" ON organization_documents
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP TRIGGER IF EXISTS update_organization_documents_updated_at ON organization_documents;
CREATE TRIGGER update_organization_documents_updated_at
  BEFORE UPDATE ON organization_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Audit log: one row per external send. Records the link expiry so the
-- tenant knows when the recipient's signed URL will stop working.
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_document_shares (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  document_id         UUID NOT NULL REFERENCES organization_documents(id) ON DELETE CASCADE,

  recipient_email     TEXT NOT NULL,
  recipient_name      TEXT,
  -- Optional linkage when sharing to a known contact/company. NULL when
  -- the tenant types in a one-off email.
  customer_id         UUID REFERENCES customers(id) ON DELETE SET NULL,
  company_id          UUID REFERENCES companies(id) ON DELETE SET NULL,

  message             TEXT,

  -- Signed-URL expiry handed to the recipient. Once past, the recipient
  -- needs a fresh share to access the file.
  link_expires_at     TIMESTAMPTZ NOT NULL,

  -- audit hooks for downstream open-tracking / revocation. Not used
  -- yet but populated by future webhook integrations.
  email_send_id       UUID REFERENCES email_sends(id) ON DELETE SET NULL,

  shared_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  shared_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_document_shares_doc
  ON organization_document_shares (document_id, shared_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_document_shares_org
  ON organization_document_shares (organization_id, shared_at DESC);

ALTER TABLE organization_document_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access organization_document_shares" ON organization_document_shares;
CREATE POLICY "Org access organization_document_shares" ON organization_document_shares
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================================================
-- Storage: private bucket with org-scoped RLS. Path convention is
-- {org_id}/{uuid}-{filename} — `(storage.foldername(name))[1] = org_id`
-- keeps each tenant's files isolated.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('organization-documents', 'organization-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "organization-documents: org-scoped insert" ON storage.objects;
CREATE POLICY "organization-documents: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'organization-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "organization-documents: org-scoped select" ON storage.objects;
CREATE POLICY "organization-documents: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'organization-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "organization-documents: org-scoped update" ON storage.objects;
CREATE POLICY "organization-documents: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'organization-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'organization-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "organization-documents: org-scoped delete" ON storage.objects;
CREATE POLICY "organization-documents: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'organization-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

NOTIFY pgrst, 'reload schema';
