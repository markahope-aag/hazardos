-- ============================================
-- REPORTING INFRASTRUCTURE
-- Phase 6: Advanced Reporting
-- ============================================

-- Saved reports (user-created custom reports)
CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id),

  -- Report definition
  name VARCHAR(200) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL, -- sales, jobs, leads, revenue, custom

  -- Configuration stored as JSON
  config JSONB NOT NULL DEFAULT '{}',
  -- {
  --   date_range: { type: 'last_30_days', start?, end? },
  --   filters: [{ field, operator, value }],
  --   grouping: { field, interval },
  --   metrics: ['revenue', 'count'],
  --   columns: [{ field, label, visible, format }],
  --   chart_type: 'bar' | 'line' | 'pie'
  -- }

  -- Sharing
  is_shared BOOLEAN DEFAULT false,

  -- Scheduling
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_frequency VARCHAR(20), -- daily, weekly, monthly
  schedule_recipients TEXT[],
  last_sent_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Report export history
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_id UUID REFERENCES saved_reports(id) ON DELETE SET NULL,
  exported_by UUID NOT NULL REFERENCES profiles(id),

  report_name VARCHAR(200) NOT NULL,
  export_format VARCHAR(20) NOT NULL, -- xlsx, csv, pdf
  file_path TEXT,
  file_size INTEGER,
  parameters JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MATERIALIZED VIEWS FOR FAST REPORTING
-- ============================================

-- Sales performance by rep by month
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sales_performance AS
SELECT
  p.organization_id,
  p.id as user_id,
  p.full_name,
  DATE_TRUNC('month', pr.created_at) as month,

  COUNT(DISTINCT pr.id) as proposals_sent,
  COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END) as proposals_won,
  COUNT(DISTINCT CASE WHEN pr.status = 'rejected' THEN pr.id END) as proposals_lost,

  COALESCE(SUM(CASE WHEN pr.status = 'signed' THEN pr.total END), 0) as revenue_won,
  COALESCE(AVG(CASE WHEN pr.status = 'signed' THEN pr.total END), 0) as avg_deal_size,

  CASE
    WHEN COUNT(DISTINCT CASE WHEN pr.status IN ('signed', 'rejected') THEN pr.id END) > 0
    THEN ROUND(
      COUNT(DISTINCT CASE WHEN pr.status = 'signed' THEN pr.id END)::NUMERIC /
      COUNT(DISTINCT CASE WHEN pr.status IN ('signed', 'rejected') THEN pr.id END) * 100, 1
    )
    ELSE 0
  END as win_rate

FROM profiles p
LEFT JOIN proposals pr ON pr.created_by = p.id
WHERE p.role IN ('admin', 'owner', 'sales', 'tenant_owner')
GROUP BY p.organization_id, p.id, p.full_name, DATE_TRUNC('month', pr.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sales_perf ON mv_sales_performance(organization_id, user_id, month);

-- Job cost analysis
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_job_costs AS
SELECT
  j.organization_id,
  j.id as job_id,
  j.job_number,
  j.title,
  j.hazard_types,
  DATE_TRUNC('month', j.completed_at) as month,
  c.company_name as customer_name,

  e.total as estimated_total,
  COALESCE(jc.actual_labor_cost, 0) as actual_labor,
  COALESCE(jc.actual_material_cost, 0) as actual_materials,
  COALESCE(jc.actual_total, 0) as actual_total,

  COALESCE(i.total, 0) as invoiced,
  COALESCE(i.amount_paid, 0) as collected,

  COALESCE(e.total, 0) - COALESCE(jc.actual_total, 0) as variance,
  CASE WHEN e.total > 0
    THEN ROUND((COALESCE(e.total, 0) - COALESCE(jc.actual_total, 0)) / e.total * 100, 1)
    ELSE 0
  END as variance_pct

FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id
LEFT JOIN estimates e ON j.estimate_id = e.id
LEFT JOIN job_completions jc ON j.id = jc.job_id
LEFT JOIN invoices i ON i.job_id = j.id
WHERE j.status = 'completed';

CREATE INDEX IF NOT EXISTS idx_mv_job_costs ON mv_job_costs(organization_id, month);

-- Lead source ROI
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_lead_source_roi AS
SELECT
  c.organization_id,
  c.source,
  DATE_TRUNC('month', c.created_at) as month,

  COUNT(DISTINCT c.id) as leads,
  COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as converted,

  COALESCE(SUM(i.total), 0) as total_revenue,

  ROUND(
    COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END)::NUMERIC /
    NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
  ) as conversion_rate,

  ROUND(
    COALESCE(SUM(i.total), 0)::NUMERIC /
    NULLIF(COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END), 0), 2
  ) as avg_revenue_per_conversion

FROM customers c
LEFT JOIN invoices i ON c.id = i.customer_id AND i.status = 'paid'
GROUP BY c.organization_id, c.source, DATE_TRUNC('month', c.created_at);

CREATE INDEX IF NOT EXISTS idx_mv_lead_roi ON mv_lead_source_roi(organization_id, month);

-- Function to refresh views
CREATE OR REPLACE FUNCTION refresh_report_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_job_costs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_source_roi;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES & RLS
-- ============================================
CREATE INDEX IF NOT EXISTS idx_saved_reports_org ON saved_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_report_exports_org ON report_exports(organization_id);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- Users can view own and shared reports
CREATE POLICY "Users can view own and shared reports"
  ON saved_reports FOR SELECT
  USING (organization_id = get_user_organization_id()
    AND (created_by = auth.uid() OR is_shared = true));

-- Users can manage own reports
CREATE POLICY "Users can manage own reports"
  ON saved_reports FOR ALL
  USING (organization_id = get_user_organization_id() AND created_by = auth.uid());

-- Users can view org exports
CREATE POLICY "Users can view org exports"
  ON report_exports FOR SELECT
  USING (organization_id = get_user_organization_id());

-- Users can create exports
CREATE POLICY "Users can create exports"
  ON report_exports FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
CREATE TRIGGER set_saved_reports_updated_at
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
