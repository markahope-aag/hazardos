-- Add 'video' to the job_documents category set. Walkthrough videos,
-- before/after walkthroughs, and customer-requested recordings are common
-- job artifacts that don't fit any of the existing categories.

ALTER TABLE job_documents DROP CONSTRAINT IF EXISTS job_documents_category_check;

ALTER TABLE job_documents ADD CONSTRAINT job_documents_category_check
  CHECK (category IN (
    'permit',
    'manifest',
    'clearance',
    'air_monitoring',
    'insurance',
    'regulatory',
    'customer_signoff',
    'correspondence',
    'video',
    'other'
  ));
