-- ============================================================================
-- CO6: period close prevents re-editing past commission periods.
--
-- There was no period concept at all — pay_period was just a filter column
-- and nothing stopped a closed month's earnings from being changed. This
-- adds a commission_periods table (one row per org per YYYY-MM month that
-- has been explicitly closed) and a trigger on commission_earnings that
-- blocks INSERT/UPDATE/DELETE for any earning whose month is closed.
--
-- The period key is derived from earning_date's month, so closing a period
-- locks every earning dated in that month regardless of whether pay_period
-- was populated.
-- ============================================================================

CREATE TABLE IF NOT EXISTS commission_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  status VARCHAR(20) NOT NULL DEFAULT 'closed', -- open, closed
  closed_by UUID REFERENCES profiles(id),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, period)
);

CREATE INDEX IF NOT EXISTS idx_commission_periods_org ON commission_periods(organization_id);

ALTER TABLE commission_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view org commission periods" ON commission_periods;
CREATE POLICY "Users view org commission periods" ON commission_periods
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.organization_id = commission_periods.organization_id)
  );

DROP POLICY IF EXISTS "Admins manage org commission periods" ON commission_periods;
CREATE POLICY "Admins manage org commission periods" ON commission_periods
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = commission_periods.organization_id
        AND p.role IN ('platform_owner', 'platform_admin', 'tenant_owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Platform owners access all commission periods" ON commission_periods;
CREATE POLICY "Platform owners access all commission periods" ON commission_periods
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'platform_owner')
  );

-- Enforcement: block any change to an earning whose month is closed.
CREATE OR REPLACE FUNCTION enforce_commission_period_lock()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  period_key TEXT;
  org UUID;
  closed BOOLEAN;
BEGIN
  org := COALESCE(NEW.organization_id, OLD.organization_id);
  period_key := to_char(COALESCE(NEW.earning_date, OLD.earning_date), 'YYYY-MM');

  SELECT EXISTS (
    SELECT 1 FROM commission_periods cp
    WHERE cp.organization_id = org
      AND cp.period = period_key
      AND cp.status = 'closed'
  ) INTO closed;

  IF closed THEN
    RAISE EXCEPTION 'Commission period % is closed and cannot be modified', period_key
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS commission_period_lock ON commission_earnings;
CREATE TRIGGER commission_period_lock
  BEFORE INSERT OR UPDATE OR DELETE ON commission_earnings
  FOR EACH ROW EXECUTE FUNCTION enforce_commission_period_lock();

DROP TRIGGER IF EXISTS set_commission_periods_updated_at ON commission_periods;
CREATE TRIGGER set_commission_periods_updated_at
  BEFORE UPDATE ON commission_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
