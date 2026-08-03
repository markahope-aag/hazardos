-- ============================================
-- Repair: Create sales tables that were missed
-- This is idempotent (IF NOT EXISTS everywhere)
-- ============================================

-- Pipeline stages
CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  stage_type VARCHAR(50) NOT NULL,
  probability INTEGER DEFAULT 0,
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities (without optional FKs to tables that may not exist)
CREATE TABLE IF NOT EXISTS opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  estimated_value DECIMAL(12,2),
  weighted_value DECIMAL(12,2),
  expected_close_date DATE,
  actual_close_date DATE,
  owner_id UUID REFERENCES profiles(id),
  estimate_id UUID,
  proposal_id UUID,
  job_id UUID,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  outcome VARCHAR(20),
  loss_reason VARCHAR(100),
  loss_notes TEXT,
  competitor VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunity history
CREATE TABLE IF NOT EXISTS opportunity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_active ON pipeline_stages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_company ON opportunities(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_opportunity_history_opp ON opportunity_history(opportunity_id);

-- RLS
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_history ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'Org access pipeline_stages') THEN
    CREATE POLICY "Org access pipeline_stages" ON pipeline_stages FOR ALL
      USING (organization_id = get_user_organization_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunities' AND policyname = 'Org access opportunities') THEN
    CREATE POLICY "Org access opportunities" ON opportunities FOR ALL
      USING (organization_id = get_user_organization_id());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'opportunity_history' AND policyname = 'Org access opportunity_history') THEN
    CREATE POLICY "Org access opportunity_history" ON opportunity_history FOR ALL
      USING (EXISTS (
        SELECT 1 FROM opportunities o
        WHERE o.id = opportunity_history.opportunity_id
        AND o.organization_id = get_user_organization_id()
      ));
  END IF;
END $$;

-- Grants
GRANT ALL ON pipeline_stages TO authenticated;
GRANT ALL ON pipeline_stages TO service_role;
GRANT ALL ON opportunities TO authenticated;
GRANT ALL ON opportunities TO service_role;
GRANT ALL ON opportunity_history TO authenticated;
GRANT ALL ON opportunity_history TO service_role;

-- Updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_opportunities_updated_at') THEN
    CREATE TRIGGER set_opportunities_updated_at
      BEFORE UPDATE ON opportunities
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Default pipeline stages function
CREATE OR REPLACE FUNCTION create_default_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pipeline_stages (organization_id, name, color, stage_type, probability, sort_order)
  VALUES
    (NEW.id, 'New Lead', '#94a3b8', 'lead', 10, 1),
    (NEW.id, 'Qualified', '#3b82f6', 'qualified', 25, 2),
    (NEW.id, 'Proposal Sent', '#8b5cf6', 'proposal', 50, 3),
    (NEW.id, 'Negotiation', '#f59e0b', 'negotiation', 75, 4),
    (NEW.id, 'Won', '#22c55e', 'won', 100, 5),
    (NEW.id, 'Lost', '#ef4444', 'lost', 0, 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_pipeline_stages_for_new_org') THEN
    CREATE TRIGGER create_pipeline_stages_for_new_org
      AFTER INSERT ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION create_default_pipeline_stages();
  END IF;
END $$;

-- Seed default stages for existing orgs that don't have them
INSERT INTO pipeline_stages (organization_id, name, color, stage_type, probability, sort_order)
SELECT o.id, s.name, s.color, s.stage_type, s.probability, s.sort_order
FROM organizations o
CROSS JOIN (VALUES
  ('New Lead', '#94a3b8', 'lead', 10, 1),
  ('Qualified', '#3b82f6', 'qualified', 25, 2),
  ('Proposal Sent', '#8b5cf6', 'proposal', 50, 3),
  ('Negotiation', '#f59e0b', 'negotiation', 75, 4),
  ('Won', '#22c55e', 'won', 100, 5),
  ('Lost', '#ef4444', 'lost', 0, 6)
) AS s(name, color, stage_type, probability, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps WHERE ps.organization_id = o.id
);
