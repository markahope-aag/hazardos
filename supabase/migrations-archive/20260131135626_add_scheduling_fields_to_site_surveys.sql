-- Add scheduling fields to site_surveys table
-- This enables appointment scheduling and tracking functionality

-- Create appointment status enum
DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add scheduling fields to site_surveys
ALTER TABLE site_surveys 
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS scheduled_time_start TIME,
ADD COLUMN IF NOT EXISTS scheduled_time_end TIME,
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS appointment_status appointment_status DEFAULT 'scheduled';

-- Create indexes for performance and scheduling queries
CREATE INDEX IF NOT EXISTS idx_site_surveys_scheduled_date ON site_surveys(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_site_surveys_assigned_to ON site_surveys(assigned_to);
CREATE INDEX IF NOT EXISTS idx_site_surveys_appointment_status ON site_surveys(appointment_status);

-- Composite index for scheduling dashboard queries
CREATE INDEX IF NOT EXISTS idx_site_surveys_scheduling ON site_surveys(scheduled_date, appointment_status, assigned_to);

-- Add comments to document the fields
COMMENT ON COLUMN site_surveys.scheduled_date IS 'Date when the site survey is scheduled';
COMMENT ON COLUMN site_surveys.scheduled_time_start IS 'Start time for the scheduled appointment';
COMMENT ON COLUMN site_surveys.scheduled_time_end IS 'End time for the scheduled appointment';
COMMENT ON COLUMN site_surveys.assigned_to IS 'Profile ID of the technician assigned to conduct the survey';
COMMENT ON COLUMN site_surveys.appointment_status IS 'Current status of the scheduled appointment';