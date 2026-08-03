-- Add missing site_survey_status enum values
-- The original enum only had: draft, submitted, estimated, quoted, scheduled, completed
-- The UI and TypeScript types reference: reviewed, in_progress, cancelled

DO $$ BEGIN
    ALTER TYPE site_survey_status ADD VALUE IF NOT EXISTS 'reviewed' AFTER 'submitted';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE site_survey_status ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE site_survey_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
