-- ============================================
-- Proposals: verbal-approval support
-- ============================================
-- When a customer calls in and approves an estimate verbally, an admin
-- should be able to record that in-app. The proposal still moves to
-- "signed" status (so downstream job creation/invoicing works unchanged)
-- but with metadata that makes the admin-recorded path auditable and
-- visually distinguishable from a digital signature.

ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS approval_method VARCHAR(50) DEFAULT 'digital_signature',
  ADD COLUMN IF NOT EXISTS verbal_approval_note TEXT,
  ADD COLUMN IF NOT EXISTS approved_by_user_id UUID REFERENCES profiles(id);

COMMENT ON COLUMN proposals.approval_method IS
  'How the proposal was approved: "digital_signature" (customer signed via portal) or "verbal" (admin recorded customer''s verbal approval).';
COMMENT ON COLUMN proposals.verbal_approval_note IS
  'Free-text note documenting the circumstances of a verbal approval (who called, when, what they said). Required when approval_method = ''verbal''.';
COMMENT ON COLUMN proposals.approved_by_user_id IS
  'For verbal approvals, the profile of the admin who recorded the approval. Null for digital signatures.';

-- Backfill existing signed rows so the default doesn't mislabel old records.
UPDATE proposals
SET approval_method = 'digital_signature'
WHERE approval_method IS NULL
  AND status = 'signed';
