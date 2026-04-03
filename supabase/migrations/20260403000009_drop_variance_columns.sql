-- Drop Ralph Wiggum Loop / variance columns from jobs
ALTER TABLE jobs DROP COLUMN IF EXISTS estimate_variance_pct;
ALTER TABLE jobs DROP COLUMN IF EXISTS variance_reason;
ALTER TABLE jobs DROP COLUMN IF EXISTS estimator_override_notes;
ALTER TABLE jobs DROP COLUMN IF EXISTS job_complexity_rating;
ALTER TABLE jobs DROP COLUMN IF EXISTS customer_satisfaction_score;

-- Drop the variance_reason enum type
DROP TYPE IF EXISTS variance_reason;

-- Drop the variance index
DROP INDEX IF EXISTS idx_jobs_variance;
