-- ============================================
-- SALES TOOLS
-- Phase 6: Sales Pipeline, Commissions, Approvals
-- ============================================

-- ============================================
-- SALES PIPELINE
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  color VARCHAR(20) DEFAULT '#6366f1',
  stage_type VARCHAR(50) NOT NULL, -- lead, qualified, proposal, negotiation, won, lost
  probability INTEGER DEFAULT 0, -- 0-100
  sort_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  estimate_id UUID REFERENCES estimates(id),
  proposal_id UUID REFERENCES proposals(id),
  job_id UUID REFERENCES jobs(id),

  outcome VARCHAR(20), -- won, lost, abandoned
  loss_reason VARCHAR(100),
  loss_notes TEXT,
  competitor VARCHAR(200),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS opportunity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMMISSIONS
-- ============================================

CREATE TABLE IF NOT EXISTS commission_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(100) NOT NULL,
  commission_type VARCHAR(20) NOT NULL, -- percentage, flat, tiered
  base_rate DECIMAL(5,2),
  tiers JSONB, -- [{ min, max, rate }]
  applies_to VARCHAR(50) DEFAULT 'won', -- won, invoiced, paid
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  plan_id UUID NOT NULL REFERENCES commission_plans(id),

  opportunity_id UUID REFERENCES opportunities(id),
  job_id UUID REFERENCES jobs(id),
  invoice_id UUID REFERENCES invoices(id),

  base_amount DECIMAL(12,2) NOT NULL,
  commission_rate DECIMAL(5,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL,

  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  earning_date DATE NOT NULL,
  pay_period VARCHAR(20),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TWO-LEVEL APPROVALS
-- ============================================

CREATE TABLE IF NOT EXISTS approval_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entity_type VARCHAR(50) NOT NULL, -- estimate, discount, proposal
  threshold_amount DECIMAL(12,2) NOT NULL,
  approval_level INTEGER NOT NULL, -- 1 or 2
  approver_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, entity_type, approval_level)
);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  amount DECIMAL(12,2),

  requested_by UUID NOT NULL REFERENCES profiles(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),

  -- Level 1
  level1_status VARCHAR(20) DEFAULT 'pending',
  level1_approver UUID REFERENCES profiles(id),
  level1_at TIMESTAMPTZ,
  level1_notes TEXT,

  -- Level 2 (if required)
  requires_level2 BOOLEAN DEFAULT false,
  level2_status VARCHAR(20),
  level2_approver UUID REFERENCES profiles(id),
  level2_at TIMESTAMPTZ,
  level2_notes TEXT,

  final_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_org ON pipeline_stages(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_active ON pipeline_stages(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_history_opp ON opportunity_history(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_commission_plans_org ON commission_plans(organization_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_user ON commission_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_earnings_status ON commission_earnings(status);
CREATE INDEX IF NOT EXISTS idx_approval_thresholds_org ON approval_thresholds(organization_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_entity ON approval_requests(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(final_status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Pipeline stages - org access
CREATE POLICY "Org access pipeline_stages" ON pipeline_stages FOR ALL
  USING (organization_id = get_user_organization_id());

-- Opportunities - org access
CREATE POLICY "Org access opportunities" ON opportunities FOR ALL
  USING (organization_id = get_user_organization_id());

-- Opportunity history - org access via opportunity
CREATE POLICY "Org access opportunity_history" ON opportunity_history FOR ALL
  USING (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_history.opportunity_id
    AND o.organization_id = get_user_organization_id()
  ));

-- Commission plans - org access
CREATE POLICY "Org access commission_plans" ON commission_plans FOR ALL
  USING (organization_id = get_user_organization_id());

-- Commission earnings: users see own, admins see all
CREATE POLICY "Users see own commissions" ON commission_earnings FOR SELECT
  USING (organization_id = get_user_organization_id()
    AND (user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    )));

CREATE POLICY "Admins manage commissions" ON commission_earnings FOR ALL
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    ));

-- Approval thresholds - org access for admins
CREATE POLICY "Admins manage approval_thresholds" ON approval_thresholds FOR ALL
  USING (organization_id = get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'tenant_owner')
    ));

CREATE POLICY "Users view approval_thresholds" ON approval_thresholds FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Approval requests - org access
CREATE POLICY "Org access approval_requests" ON approval_requests FOR ALL
  USING (organization_id = get_user_organization_id());

-- ============================================
-- DEFAULT PIPELINE STAGES (per org)
-- ============================================
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

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_pipeline_stages_for_new_org') THEN
    CREATE TRIGGER create_pipeline_stages_for_new_org
      AFTER INSERT ON organizations
      FOR EACH ROW
      EXECUTE FUNCTION create_default_pipeline_stages();
  END IF;
END $$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
