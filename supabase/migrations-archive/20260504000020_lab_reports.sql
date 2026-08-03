-- ============================================================================
-- Lab Reports
--
-- A lab report tracks a sample sent to an outside lab for analysis (asbestos
-- bulk, lead paint, mold air, etc.). The flow:
--   1. Field crew collects sample, office staff "orders" it (creates the
--      lab_reports row with the lab, sample type, and source address).
--   2. Lab returns the analysis as a PDF; staff uploads it to the row,
--      flipping status from 'ordered' to 'received'.
--   3. The report can be linked to an estimate, work order, and/or invoice
--      so the right paperwork follows the job through billing.
--
-- Linking is intentionally a set of nullable FKs rather than a join table —
-- the common case is one report per source-of-record at each stage, and a
-- report typically tracks with a single job through the funnel.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Labs catalog: which third-party labs the org sends samples to.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS labs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  contact_name     TEXT,
  contact_email    TEXT,
  contact_phone    TEXT,
  address          TEXT,
  notes            TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labs_org ON labs (organization_id);

ALTER TABLE labs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access labs" ON labs;
CREATE POLICY "Org access labs" ON labs
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- ----------------------------------------------------------------------------
-- Sample types and statuses.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_report_status') THEN
    CREATE TYPE lab_report_status AS ENUM ('ordered', 'received', 'cancelled');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_sample_type') THEN
    CREATE TYPE lab_sample_type AS ENUM (
      'asbestos_bulk',
      'asbestos_air',
      'lead_paint',
      'lead_dust',
      'lead_water',
      'lead_soil',
      'mold_air',
      'mold_surface',
      'silica',
      'other'
    );
  END IF;
END$$;

-- ----------------------------------------------------------------------------
-- Lab reports.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_number       TEXT NOT NULL,

  -- When the sample was sent / ordered. Required so the list view can
  -- always sort + filter by date.
  ordered_date        DATE NOT NULL,

  -- Lab analysing the sample. Nullable so a row can be created before
  -- the lab is chosen, but in practice the form will require it.
  lab_id              UUID REFERENCES labs(id) ON DELETE SET NULL,

  sample_type         lab_sample_type NOT NULL DEFAULT 'other',
  sample_description  TEXT,

  -- Address the sample was collected from. Free-form so the field crew
  -- can record either a customer site or, e.g., a lab-side reference.
  site_address        TEXT,
  site_city           TEXT,
  site_state          TEXT,
  site_zip            TEXT,

  -- Optional links into the rest of the funnel.
  estimate_id         UUID REFERENCES estimates(id)    ON DELETE SET NULL,
  work_order_id       UUID REFERENCES work_orders(id)  ON DELETE SET NULL,
  invoice_id          UUID REFERENCES invoices(id)     ON DELETE SET NULL,
  customer_id         UUID REFERENCES customers(id)    ON DELETE SET NULL,

  status              lab_report_status NOT NULL DEFAULT 'ordered',
  received_date       DATE,

  -- The returned report file once the lab sends it back.
  file_name           TEXT,
  storage_path        TEXT,
  mime_type           TEXT,
  size_bytes          BIGINT,

  notes               TEXT,
  created_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT lab_reports_org_number_unique UNIQUE (organization_id, report_number)
);

CREATE INDEX IF NOT EXISTS idx_lab_reports_org           ON lab_reports (organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_estimate     ON lab_reports (estimate_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_work_order   ON lab_reports (work_order_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_invoice      ON lab_reports (invoice_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_customer     ON lab_reports (customer_id);
CREATE INDEX IF NOT EXISTS idx_lab_reports_ordered_date ON lab_reports (ordered_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_reports_status       ON lab_reports (status);

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org access lab_reports" ON lab_reports;
CREATE POLICY "Org access lab_reports" ON lab_reports
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- updated_at trigger (mirrors what other tables in this repo do)
CREATE OR REPLACE FUNCTION set_lab_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_reports_updated_at ON lab_reports;
CREATE TRIGGER trg_lab_reports_updated_at
  BEFORE UPDATE ON lab_reports
  FOR EACH ROW
  EXECUTE FUNCTION set_lab_reports_updated_at();

-- ----------------------------------------------------------------------------
-- Per-org sequence for human-readable report numbers (LR-2026-001).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_lab_report_number(org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  year_str TEXT := to_char(NOW(), 'YYYY');
  next_seq INTEGER;
  prefix TEXT := 'LR-' || year_str || '-';
BEGIN
  SELECT COALESCE(
    MAX((regexp_replace(report_number, '^' || prefix, ''))::INTEGER),
    0
  ) + 1
  INTO next_seq
  FROM lab_reports
  WHERE organization_id = org_id
    AND report_number LIKE prefix || '%'
    AND report_number ~ ('^' || prefix || '\d+$');

  RETURN prefix || lpad(next_seq::TEXT, 3, '0');
END;
$$;

-- ----------------------------------------------------------------------------
-- Storage bucket for the returned lab-report PDFs.
-- Path convention: {org_id}/{lab_report_id}/{uuid}-{filename}.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('lab-reports', 'lab-reports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "lab-reports: org-scoped insert" ON storage.objects;
CREATE POLICY "lab-reports: org-scoped insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'lab-reports'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "lab-reports: org-scoped select" ON storage.objects;
CREATE POLICY "lab-reports: org-scoped select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'lab-reports'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "lab-reports: org-scoped update" ON storage.objects;
CREATE POLICY "lab-reports: org-scoped update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'lab-reports'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  )
  WITH CHECK (
    bucket_id = 'lab-reports'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

DROP POLICY IF EXISTS "lab-reports: org-scoped delete" ON storage.objects;
CREATE POLICY "lab-reports: org-scoped delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'lab-reports'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = get_user_organization_id()::text
  );

NOTIFY pgrst, 'reload schema';
