-- ============================================================================
-- I13: "Invoice link to customer — opens a clean view (no internal details)"
--
-- No customer-facing invoice view existed at all: invoices had no
-- access_token column, no public route, no portal page. Proposals already
-- have this exact pattern (access_token + a SELECT policy gated on the
-- token), but mirroring that approach for invoices would mean opening RLS
-- on customers/organizations to anon too — those tables have no anon-safe
-- policy today, and adding one broadens the blast radius for every other
-- anon-reachable query, not just this one.
--
-- Instead: a single SECURITY DEFINER function does the token lookup and
-- returns an explicit allowlist of customer-facing fields. anon never gets
-- direct table access to invoices/customers/organizations — only whatever
-- this function chooses to expose.
-- ============================================================================

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS access_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_access_token
  ON invoices(access_token) WHERE access_token IS NOT NULL;

CREATE OR REPLACE FUNCTION get_invoice_for_portal(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  inv_id UUID;
BEGIN
  SELECT
    jsonb_build_object(
      'invoice_number', i.invoice_number,
      'status', i.status,
      'invoice_date', i.invoice_date,
      'due_date', i.due_date,
      'subtotal', i.subtotal,
      'tax_rate', i.tax_rate,
      'tax_amount', i.tax_amount,
      'discount_amount', i.discount_amount,
      'total', i.total,
      'amount_paid', i.amount_paid,
      'balance_due', i.balance_due,
      'payment_terms', i.payment_terms,
      'notes', i.notes,
      'customer', jsonb_build_object(
        'name', c.name,
        'company_name', c.company_name,
        'email', c.email,
        'phone', c.phone,
        'address_line1', c.address_line1,
        'city', c.city,
        'state', c.state,
        'zip', c.zip
      ),
      'job', CASE WHEN j.id IS NULL THEN NULL ELSE jsonb_build_object(
        'job_number', j.job_number,
        'job_address', j.job_address,
        'job_city', j.job_city,
        'job_state', j.job_state
      ) END,
      'organization', jsonb_build_object(
        'name', o.name,
        'email', o.email,
        'phone', o.phone,
        'address', o.address,
        'city', o.city,
        'state', o.state,
        'zip', o.zip,
        'website', o.website
      ),
      'line_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'description', li.description,
          'quantity', li.quantity,
          'unit', li.unit,
          'unit_price', li.unit_price,
          'line_total', li.line_total
        ) ORDER BY li.sort_order)
        FROM invoice_line_items li
        WHERE li.invoice_id = i.id
      ), '[]'::jsonb)
    ),
    i.id
  INTO result, inv_id
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
  JOIN organizations o ON o.id = i.organization_id
  LEFT JOIN jobs j ON j.id = i.job_id
  WHERE i.access_token = p_token
    AND i.access_token_expires_at IS NOT NULL
    AND i.access_token_expires_at > NOW();

  IF inv_id IS NOT NULL THEN
    UPDATE invoices SET viewed_at = COALESCE(viewed_at, NOW()) WHERE id = inv_id;
  END IF;

  RETURN result;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_invoice_for_portal(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_invoice_for_portal(TEXT) TO anon, authenticated;
