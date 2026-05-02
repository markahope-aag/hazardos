-- Versioning for surveys and estimates
-- Date: 2026-05-02
--
-- Adds parent/root pointers + version numbers to site_surveys and estimates
-- so users can create revised versions of either. The "root_id" denormalises
-- the chain root onto every row, which makes "version X of Y" a single
-- MAX(version) GROUP BY root_id query instead of a recursive CTE.
--
-- Also makes estimates.site_survey_id nullable so an estimate can exist
-- without a survey, and adds the bulletproof duplicate guard for the
-- auto-create-on-submit flow: at most one parent-less estimate per survey.

-- ============================================================================
-- site_surveys: parent + root + version
-- ============================================================================

ALTER TABLE site_surveys
  ADD COLUMN IF NOT EXISTS parent_survey_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS survey_root_id UUID REFERENCES site_surveys(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_site_surveys_parent ON site_surveys(parent_survey_id);
CREATE INDEX IF NOT EXISTS idx_site_surveys_root ON site_surveys(survey_root_id);

-- BEFORE INSERT trigger: derive survey_root_id from parent (or self) when
-- the caller didn't provide one. Keeps callers out of the business of
-- maintaining the chain root.
CREATE OR REPLACE FUNCTION set_survey_root_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.survey_root_id IS NULL THEN
    IF NEW.parent_survey_id IS NULL THEN
      NEW.survey_root_id := NEW.id;
    ELSE
      SELECT survey_root_id INTO NEW.survey_root_id
      FROM site_surveys
      WHERE id = NEW.parent_survey_id;

      IF NEW.survey_root_id IS NULL THEN
        NEW.survey_root_id := NEW.parent_survey_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_survey_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM site_surveys
    WHERE survey_root_id = NEW.survey_root_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS site_surveys_set_root ON site_surveys;
CREATE TRIGGER site_surveys_set_root
  BEFORE INSERT ON site_surveys
  FOR EACH ROW EXECUTE FUNCTION set_survey_root_id();

-- Backfill existing rows: each existing survey is its own chain root.
UPDATE site_surveys SET survey_root_id = id WHERE survey_root_id IS NULL;

ALTER TABLE site_surveys
  ALTER COLUMN survey_root_id SET NOT NULL;

-- One version number per chain.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_site_surveys_chain_version
  ON site_surveys(survey_root_id, version);

-- ============================================================================
-- estimates: parent + root, nullable site_survey_id, duplicate guard
-- ============================================================================

ALTER TABLE estimates
  ADD COLUMN IF NOT EXISTS parent_estimate_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimate_root_id UUID REFERENCES estimates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- version column already exists (INTEGER DEFAULT 1) — make sure it's NOT NULL.
ALTER TABLE estimates
  ALTER COLUMN version SET NOT NULL;

ALTER TABLE estimates
  ALTER COLUMN site_survey_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_parent ON estimates(parent_estimate_id);
CREATE INDEX IF NOT EXISTS idx_estimates_root ON estimates(estimate_root_id);

CREATE OR REPLACE FUNCTION set_estimate_root_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estimate_root_id IS NULL THEN
    IF NEW.parent_estimate_id IS NULL THEN
      NEW.estimate_root_id := NEW.id;
    ELSE
      SELECT estimate_root_id INTO NEW.estimate_root_id
      FROM estimates
      WHERE id = NEW.parent_estimate_id;

      IF NEW.estimate_root_id IS NULL THEN
        NEW.estimate_root_id := NEW.parent_estimate_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_estimate_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM estimates
    WHERE estimate_root_id = NEW.estimate_root_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS estimates_set_root ON estimates;
CREATE TRIGGER estimates_set_root
  BEFORE INSERT ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_estimate_root_id();

-- Backfill chain root for existing estimates first — every row is its own
-- chain root by default.
UPDATE estimates SET estimate_root_id = id WHERE estimate_root_id IS NULL;

-- Reconcile pre-existing duplicate estimates: any survey that already has
-- multiple estimates gets converted into a single revision chain. The
-- oldest stays as v1 (parent_estimate_id remains NULL); each newer one
-- points at the prior in the chain and bumps version. estimate_root_id
-- collapses to the v1 of the chain so MAX(version) GROUP BY root_id still
-- yields the correct "Y" for "X of Y".
WITH ordered AS (
  SELECT
    id,
    site_survey_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY site_survey_id ORDER BY created_at, id) AS rn,
    LAG(id) OVER (PARTITION BY site_survey_id ORDER BY created_at, id) AS prev_id,
    FIRST_VALUE(id) OVER (PARTITION BY site_survey_id ORDER BY created_at, id) AS first_id
  FROM estimates
  WHERE site_survey_id IS NOT NULL
    AND site_survey_id IN (
      SELECT site_survey_id FROM estimates
      WHERE site_survey_id IS NOT NULL
      GROUP BY site_survey_id HAVING COUNT(*) > 1
    )
)
UPDATE estimates e
SET parent_estimate_id = ordered.prev_id,
    estimate_root_id = ordered.first_id,
    version = ordered.rn
FROM ordered
WHERE e.id = ordered.id AND ordered.rn > 1;

ALTER TABLE estimates
  ALTER COLUMN estimate_root_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_estimates_chain_version
  ON estimates(estimate_root_id, version);

-- The bulletproof duplicate guard for auto-create-on-submit: at most one
-- parent-less ("v1") estimate per survey. Revisions (parent_estimate_id
-- IS NOT NULL) are exempt — that's how customer-driven revisions are
-- expressed without creating a new chain.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_estimates_v1_per_survey
  ON estimates(site_survey_id)
  WHERE parent_estimate_id IS NULL AND site_survey_id IS NOT NULL;

COMMENT ON COLUMN site_surveys.parent_survey_id IS 'Pointer to the previous survey version this revises. NULL for v1.';
COMMENT ON COLUMN site_surveys.survey_root_id IS 'The v1 of this survey chain — denormalised for cheap version-of-version queries.';
COMMENT ON COLUMN site_surveys.version IS 'Version number within survey_root_id chain. Trigger increments on insert when parent is set.';
COMMENT ON COLUMN site_surveys.revision_notes IS 'Optional reason for creating this revision.';

COMMENT ON COLUMN estimates.parent_estimate_id IS 'Pointer to the previous estimate version this revises. NULL for v1.';
COMMENT ON COLUMN estimates.estimate_root_id IS 'The v1 of this estimate chain — denormalised for cheap version-of-version queries.';
COMMENT ON COLUMN estimates.revision_notes IS 'Optional reason for creating this revision.';
