-- Performance indexes for query patterns identified in codebase audit
-- Each index is wrapped in a DO block so missing tables don't block others

-- ============================================
-- PRIORITY 1 — High-traffic query paths
-- ============================================

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoices_customer_status
    ON invoices(customer_id, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_jobs_org_customer_status
    ON jobs(organization_id, customer_id, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_customers_org_created_status
    ON customers(organization_id, created_at DESC, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_opportunities_outcome_updated
    ON opportunities(organization_id, outcome, updated_at DESC)
    WHERE outcome IS NOT NULL;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================
-- PRIORITY 2 — Medium-traffic query paths
-- ============================================

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_site_surveys_customer_status
    ON site_surveys(customer_id, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_job_time_entries_job_profile
    ON job_time_entries(job_id, profile_id, work_date DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_type
    ON invoice_line_items(invoice_id, source_type, sort_order);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_approval_requests_org_status
    ON approval_requests(organization_id, final_status, requested_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ============================================
-- PRIORITY 3 — Lower-traffic optimizations
-- ============================================

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_companies_org_created
    ON companies(organization_id, created_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_estimates_site_survey_status
    ON estimates(site_survey_id, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_job_notes_job_type
    ON job_notes(job_id, note_type, created_at DESC);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_commission_earnings_user_period
    ON commission_earnings(user_id, earning_date DESC, status);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
