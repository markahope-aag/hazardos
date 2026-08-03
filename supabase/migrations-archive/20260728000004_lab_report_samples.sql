-- ============================================================================
-- Per-sample detail on a lab report.
--
-- lab_reports currently holds a single free-text `sample_description` for the
-- whole submission, but a real bulk asbestos submission is a numbered list:
-- each sample has its own description and location ("Insulation inside the
-- walls of the sunroom", "Pressed fiber board under the sunroom"), and the
-- lab returns a result per sample.
--
-- This table is what the chain-of-custody form prints from, and what the
-- returned analysis summary populates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS lab_report_samples (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lab_report_id       UUID NOT NULL REFERENCES lab_reports(id) ON DELETE CASCADE,

  -- The client's own sample number as written on the container. Kept as text
  -- because crews use "1", "1A", "B-3" and similar.
  sample_number       TEXT NOT NULL,
  description         TEXT NOT NULL,
  location            TEXT,

  -- Results, filled in when the lab reports back. Null until then.
  -- `result` mirrors the lab's summary column: NAD, or a detected type.
  result              TEXT,
  asbestos_pct        NUMERIC,
  non_asbestos_fibers TEXT,
  non_fibrous         TEXT,
  notes               TEXT,

  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per sample number within a report.
  CONSTRAINT lab_report_samples_number_unique UNIQUE (lab_report_id, sample_number)
);

CREATE INDEX IF NOT EXISTS idx_lab_report_samples_report
  ON lab_report_samples (lab_report_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lab_report_samples_org
  ON lab_report_samples (organization_id);

CREATE TRIGGER set_lab_report_samples_updated_at
  BEFORE UPDATE ON lab_report_samples
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE lab_report_samples ENABLE ROW LEVEL SECURITY;

-- Reads: any member of the owning org, matching lab_reports itself.
CREATE POLICY "lab_report_samples_select_org" ON lab_report_samples
  FOR SELECT USING (organization_id = get_user_organization_id());

-- Writes: TENANT_WRITE, the same tier lab_reports sits in. Samples are
-- office/estimator work, not field-tier.
CREATE POLICY "lab_report_samples_insert_write" ON lab_report_samples
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator'])
  );

CREATE POLICY "lab_report_samples_update_write" ON lab_report_samples
  FOR UPDATE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator'])
  ) WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator'])
  );

CREATE POLICY "lab_report_samples_delete_write" ON lab_report_samples
  FOR DELETE USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = ANY (ARRAY['platform_owner','platform_admin','tenant_owner','admin','estimator'])
  );

-- Fields the chain-of-custody form needs that lab_reports doesn't carry.
-- The submitting technician is who signs "Relinquished by"; the client
-- contacts are who the results go to.
ALTER TABLE lab_reports
  ADD COLUMN IF NOT EXISTS turnaround      TEXT,
  ADD COLUMN IF NOT EXISTS submitted_to    TEXT,
  ADD COLUMN IF NOT EXISTS relinquished_by TEXT;

COMMENT ON COLUMN lab_reports.turnaround IS
  'Requested lab turnaround as printed on the chain-of-custody form, e.g. "Same day", "24 hour".';
COMMENT ON COLUMN lab_reports.submitted_to IS
  'Free text block of who receives the results — often a client PM plus a project contact.';
COMMENT ON COLUMN lab_reports.relinquished_by IS
  'Name printed on the "Relinquished by" line of the chain-of-custody form.';
