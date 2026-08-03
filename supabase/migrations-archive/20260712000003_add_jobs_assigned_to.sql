-- ============================================================================
-- Fix: manual job creation fails with "column jobs.assigned_to does not
-- exist" (Postgres 42703).
--
-- lib/validations/jobs.ts (createJobSchema / createJobFromProposalSchema),
-- lib/services/jobs-service.ts (JobsService.create/createFromProposal), the
-- create_job_from_proposal RPC (20260702000005), and the /jobs/new form all
-- require and insert an `assigned_to` column on `jobs` — but no migration
-- ever added it. 20260403000006_enhance_jobs.sql added `crew_lead_id`
-- instead, and the app code was apparently never reconciled with that
-- rename: every job-creation write path (manual create, create-from-
-- proposal) has been failing with a hard DB error since.
--
-- Nullable + ON DELETE SET NULL matches the sibling `crew_lead_id` column
-- and `site_surveys.assigned_to` — "required at creation" is enforced by
-- the Zod schemas, not a NOT NULL constraint, so a technician being
-- deactivated later doesn't orphan the row.
-- ============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON jobs(assigned_to) WHERE assigned_to IS NOT NULL;
