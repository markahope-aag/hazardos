-- Ensure organization_ai_settings table exists
-- Fixes trigger failure on org creation when table is missing

CREATE TABLE IF NOT EXISTS organization_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  ai_enabled BOOLEAN DEFAULT false,
  consent_given BOOLEAN DEFAULT false,
  consent_given_by UUID REFERENCES profiles(id),
  consent_given_at TIMESTAMP WITH TIME ZONE,
  pii_redaction_enabled BOOLEAN DEFAULT true,
  data_retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE organization_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies (idempotent)
DO $$ BEGIN
  CREATE POLICY "Users can view their org AI settings"
    ON organization_ai_settings FOR SELECT
    USING (organization_id = get_user_organization_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update their org AI settings"
    ON organization_ai_settings FOR UPDATE
    USING (organization_id = get_user_organization_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION create_org_ai_settings()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.organization_ai_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill for any existing orgs missing settings
INSERT INTO organization_ai_settings (organization_id)
SELECT id FROM organizations
WHERE id NOT IN (SELECT organization_id FROM organization_ai_settings)
ON CONFLICT (organization_id) DO NOTHING;
