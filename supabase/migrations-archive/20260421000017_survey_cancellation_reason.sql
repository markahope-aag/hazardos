-- ============================================
-- site_surveys: require a reason when cancelling
-- ============================================
-- Cancelling a survey now captures a free-text reason, who did it,
-- and when. Enforced at the DB level via a CHECK constraint so
-- nothing outside the app can mark a survey cancelled without an
-- explanation.

ALTER TABLE site_surveys
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id);

-- A cancelled survey must have a non-empty reason. Drop-and-recreate
-- so re-applying the migration is safe.
ALTER TABLE site_surveys DROP CONSTRAINT IF EXISTS site_surveys_cancellation_reason_required;
ALTER TABLE site_surveys
  ADD CONSTRAINT site_surveys_cancellation_reason_required
  CHECK (
    status <> 'cancelled'
    OR (cancellation_reason IS NOT NULL AND LENGTH(TRIM(cancellation_reason)) > 0)
  );

COMMENT ON COLUMN site_surveys.cancellation_reason IS
  'Required free-text reason when status is cancelled. Enforced by site_surveys_cancellation_reason_required CHECK constraint.';
COMMENT ON COLUMN site_surveys.cancelled_at IS 'Timestamp of cancellation';
COMMENT ON COLUMN site_surveys.cancelled_by IS 'Profile that recorded the cancellation';
