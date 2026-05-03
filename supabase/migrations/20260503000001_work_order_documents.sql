-- ============================================================================
-- Work order documents: file attachments scoped to a single work order.
--
-- Job documents live on the job (permits, regulatory paperwork, manifests,
-- clearance reports) and outlive any single dispatch. Work-order documents
-- are the tighter set the crew needs in their hands the day-of: SDS sheets
-- for the materials they're hauling, equipment manuals for the rentals,
-- the access sheet (gate codes, parking, lockbox), pre-work site photos
-- the office wants the crew to see before arrival, signed acknowledgments
-- once they've reviewed the work order. Different lifetime, different
-- audience, different ownership — separate table.
--
-- Mirrors job_documents in shape: org-scoped RLS, private bucket with
-- {org_id}/{work_order_id}/{uuid}-{filename} storage convention.
-- ============================================================================

CREATE TABLE IF NOT EXISTS work_order_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_order_id       UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,

  file_name           TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  mime_type           TEXT,
  size_bytes          BIGINT,

  -- Same CHECK-constraint approach as job_documents — adding a new
  -- category is a one-line ALTER TABLE rather than a full enum migration.
  category            TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'sds',
    'manual',
    'access',
    'pre_work',
    'signed_acknowledgment',
    'other'
  )),

  notes               TEXT,

  uploaded_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_documents_work_order
  ON work_order_documents (work_order_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_order_documents_org_category
  ON work_order_documents (organization_id, category);

ALTER TABLE work_order_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access work_order_documents" ON work_order_documents;
CREATE POLICY "Org access work_order_documents" ON work_order_documents
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP TRIGGER IF EXISTS update_work_order_documents_updated_at ON work_order_documents;
CREATE TRIGGER update_work_order_documents_updated_at
  BEFORE UPDATE ON work_order_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Storage bucket — same pattern as job-documents. Path:
--   {org_id}/{work_order_id}/{uuid}-{safe_filename}
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('work-order-documents', 'work-order-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "work-order-documents: org-scoped insert" ON storage.objects;
CREATE POLICY "work-order-documents: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'work-order-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "work-order-documents: org-scoped select" ON storage.objects;
CREATE POLICY "work-order-documents: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'work-order-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "work-order-documents: org-scoped update" ON storage.objects;
CREATE POLICY "work-order-documents: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'work-order-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'work-order-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "work-order-documents: org-scoped delete" ON storage.objects;
CREATE POLICY "work-order-documents: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'work-order-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

NOTIFY pgrst, 'reload schema';
