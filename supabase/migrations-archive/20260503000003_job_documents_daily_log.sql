-- Two new job_documents categories for the project-canon Documents tab:
--
--   daily_log -- Crews submit a daily log after each shift (hours worked,
--                area covered, photos, incidents, consumables). These need
--                a first-class home on the job, not 'other'.
--   opp       -- Occupant Protection Plan: required for occupied-building
--                abatement work. One per job, lives on the job.

ALTER TABLE job_documents
  DROP CONSTRAINT IF EXISTS job_documents_category_check;

ALTER TABLE job_documents
  ADD CONSTRAINT job_documents_category_check
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
    'daily_log',
    'opp',
    'other'
  ));
