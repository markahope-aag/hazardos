-- ============================================================================
-- CO4: commission approval workflow — add the missing "reject" path.
--
-- commission_earnings.status was pending → approved → paid only; a reviewer
-- could approve but never reject. status is a plain VARCHAR(20) with no CHECK
-- constraint, so 'rejected' is already storable — this migration only adds
-- the audit columns for who rejected it, when, and why.
-- ============================================================================

ALTER TABLE commission_earnings
  ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN commission_earnings.status IS 'pending, approved, rejected, paid';
