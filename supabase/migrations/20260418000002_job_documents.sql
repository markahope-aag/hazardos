-- ============================================================================
-- Job documents: first-class document attachment for jobs.
--
-- In abatement work the documents ARE the deliverable — permits, disposal
-- manifests, clearance reports, air monitoring, COIs, regulatory
-- notifications, customer sign-offs. Previously the only place to put a file
-- was the unused `attachments` JSONB on job_notes (easy to lose) or the
-- single-purpose `manifest_document_url` on job_disposal. This adds a real
-- table + a private storage bucket with org-scoped RLS so documents have a
-- home and show up on the job where people expect to find them.
-- ============================================================================

CREATE TABLE IF NOT EXISTS job_documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  file_name           TEXT NOT NULL,
  storage_path        TEXT NOT NULL,
  mime_type           TEXT,
  size_bytes          BIGINT,

  -- Category is a string with a CHECK (not an enum) so new categories can
  -- be added without a migration as the business uncovers more document
  -- types. 'other' is a deliberate escape hatch for one-offs.
  category            TEXT NOT NULL DEFAULT 'other' CHECK (category IN (
    'permit',
    'manifest',
    'clearance',
    'air_monitoring',
    'insurance',
    'regulatory',
    'customer_signoff',
    'correspondence',
    'other'
  )),

  notes               TEXT,

  uploaded_by         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Deletions update the row; updates to file_name / category / notes bump
  -- updated_at. Keeps the "last touched" ordering meaningful.
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_documents_job
  ON job_documents (job_id, uploaded_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_documents_org_category
  ON job_documents (organization_id, category);

ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access job_documents" ON job_documents;
CREATE POLICY "Org access job_documents" ON job_documents
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

DROP TRIGGER IF EXISTS update_job_documents_updated_at ON job_documents;
CREATE TRIGGER update_job_documents_updated_at
  BEFORE UPDATE ON job_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Storage: private bucket with org-scoped RLS. Path convention is
-- {org_id}/{job_id}/{uuid}-{filename} — same shape as the other buckets so
-- the `(storage.foldername(name))[1] = org_id` check keeps working.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('job-documents', 'job-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "job-documents: org-scoped insert" ON storage.objects;
CREATE POLICY "job-documents: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "job-documents: org-scoped select" ON storage.objects;
CREATE POLICY "job-documents: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "job-documents: org-scoped update" ON storage.objects;
CREATE POLICY "job-documents: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'job-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'job-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "job-documents: org-scoped delete" ON storage.objects;
CREATE POLICY "job-documents: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-documents'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

NOTIFY pgrst, 'reload schema';
