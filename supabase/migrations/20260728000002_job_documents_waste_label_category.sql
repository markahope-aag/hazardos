-- Add 'waste_label' to the job_documents category set.
--
-- Waste container labels are generated as a printable Avery 5162 sheet and
-- attached to every container leaving the site. They sit alongside the waste
-- manifest in the compliance pack but are a distinct artifact: the manifest
-- travels with the load, the labels travel on the containers.

ALTER TABLE job_documents DROP CONSTRAINT IF EXISTS job_documents_category_check;

ALTER TABLE job_documents ADD CONSTRAINT job_documents_category_check
  CHECK (category IN (
    'permit',
    'manifest',
    'waste_label',
    'clearance',
    'air_monitoring',
    'insurance',
    'regulatory',
    'customer_signoff',
    'correspondence',
    'video',
    'daily_log',
    'opp',
    'other'
  ));
