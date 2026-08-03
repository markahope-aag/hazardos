-- Add 'survey_completed' to the opportunity_status enum so downstream
-- triggers can mark an opportunity once its linked site survey wraps up.
-- Split from the trigger migration because ALTER TYPE ADD VALUE needs
-- to commit before the value can be referenced in other DDL.

DO $$ BEGIN
    ALTER TYPE opportunity_status ADD VALUE IF NOT EXISTS 'survey_completed' AFTER 'assessment_scheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
