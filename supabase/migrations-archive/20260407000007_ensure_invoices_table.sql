-- ============================================
-- Ensure invoices table exists
-- It may have been lost during the jobs table CASCADE rebuild
-- ============================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- References
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Invoice identification
  invoice_number VARCHAR(50) NOT NULL,

  -- Status: draft, sent, viewed, partial, paid, overdue, void
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  -- Dates
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,

  -- Amounts
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5, 4) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  balance_due DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Terms
  payment_terms VARCHAR(100),
  notes TEXT,

  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  sent_via VARCHAR(50),
  viewed_at TIMESTAMPTZ,

  -- QuickBooks sync
  qb_invoice_id VARCHAR(100),
  qb_synced_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view invoices in their organization" ON invoices;
CREATE POLICY "Users can view invoices in their organization"
  ON invoices FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;
CREATE POLICY "Users can manage invoices in their organization"
  ON invoices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_organization_id ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
