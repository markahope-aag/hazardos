-- ============================================
-- INVOICES SYSTEM
-- ============================================

-- ============================================
-- INVOICES TABLE
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

-- ============================================
-- INVOICE LINE ITEMS
-- ============================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit VARCHAR(50),
  unit_price DECIMAL(12, 2) NOT NULL,
  line_total DECIMAL(12, 2) NOT NULL,

  source_type VARCHAR(50),
  source_id UUID,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

  amount DECIMAL(12, 2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,

  qb_payment_id VARCHAR(100),
  qb_synced_at TIMESTAMPTZ,

  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(organization_id, invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(organization_id);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Invoices policies
DROP POLICY IF EXISTS "Users can view invoices in their organization" ON invoices;
CREATE POLICY "Users can view invoices in their organization" ON invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can manage invoices in their organization" ON invoices;
CREATE POLICY "Users can manage invoices in their organization" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = invoices.organization_id
    )
  );

-- Invoice line items policies
DROP POLICY IF EXISTS "Users can manage invoice line items" ON invoice_line_items;
CREATE POLICY "Users can manage invoice line items" ON invoice_line_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN profiles p ON p.organization_id = i.organization_id
      WHERE i.id = invoice_line_items.invoice_id
      AND p.id = auth.uid()
    )
  );

-- Payments policies
DROP POLICY IF EXISTS "Users can view payments in their organization" ON payments;
CREATE POLICY "Users can view payments in their organization" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = payments.organization_id
    )
  );

DROP POLICY IF EXISTS "Users can manage payments in their organization" ON payments;
CREATE POLICY "Users can manage payments in their organization" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.organization_id = payments.organization_id
    )
  );

-- Platform owner policies
DROP POLICY IF EXISTS "Platform owners can access all invoices" ON invoices;
CREATE POLICY "Platform owners can access all invoices" ON invoices
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

DROP POLICY IF EXISTS "Platform owners can access all payments" ON payments;
CREATE POLICY "Platform owners can access all payments" ON payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'platform_owner'
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  year_str VARCHAR(4);
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM invoices
  WHERE organization_id = org_id
  AND invoice_number LIKE 'INV-' || year_str || '-%';

  RETURN 'INV-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Auto-update balance when payment recorded
CREATE OR REPLACE FUNCTION update_invoice_balance()
RETURNS TRIGGER AS $$
DECLARE
  inv_id UUID;
  paid_total DECIMAL(12, 2);
  inv_total DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM payments WHERE invoice_id = inv_id;

  SELECT total INTO inv_total FROM invoices WHERE id = inv_id;

  UPDATE invoices
  SET
    amount_paid = paid_total,
    balance_due = inv_total - paid_total,
    status = CASE
      WHEN paid_total >= inv_total THEN 'paid'
      WHEN paid_total > 0 THEN 'partial'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_update_balance ON payments;
CREATE TRIGGER payment_update_balance
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_balance();

-- Auto-recalculate totals when line items change
CREATE OR REPLACE FUNCTION recalculate_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  inv_id UUID;
  new_subtotal DECIMAL(12, 2);
  inv_tax_rate DECIMAL(5, 4);
  inv_discount DECIMAL(12, 2);
  inv_amount_paid DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(line_total), 0) INTO new_subtotal
  FROM invoice_line_items WHERE invoice_id = inv_id;

  SELECT tax_rate, discount_amount, amount_paid
  INTO inv_tax_rate, inv_discount, inv_amount_paid
  FROM invoices WHERE id = inv_id;

  UPDATE invoices
  SET
    subtotal = new_subtotal,
    tax_amount = new_subtotal * COALESCE(inv_tax_rate, 0),
    total = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0),
    balance_due = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0) - COALESCE(inv_amount_paid, 0),
    updated_at = NOW()
  WHERE id = inv_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invoice_line_item_totals ON invoice_line_items;
CREATE TRIGGER invoice_line_item_totals
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION recalculate_invoice_totals();

-- Updated at trigger
DROP TRIGGER IF EXISTS set_updated_at_invoices ON invoices;
CREATE TRIGGER set_updated_at_invoices
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE invoices IS 'Customer invoices for completed jobs';
COMMENT ON TABLE invoice_line_items IS 'Line items for invoices';
COMMENT ON TABLE payments IS 'Payment records for invoices';
