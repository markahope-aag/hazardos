-- Performance optimization indexes
-- These indexes improve query performance for common search and filter operations

-- Full-text search index on customers for name/company search
-- Uses GIN index with tsvector for efficient text search
CREATE INDEX IF NOT EXISTS idx_customers_search
ON customers USING gin(to_tsvector('english', name || ' ' || COALESCE(company_name, '')));

-- Composite index for jobs filtering by status and date
-- Optimizes dashboard queries that filter by organization, status, and scheduled date
CREATE INDEX IF NOT EXISTS idx_jobs_status_date
ON jobs(organization_id, status, scheduled_date);

-- Additional performance indexes for common query patterns

-- Index for customer lookup by organization and status
CREATE INDEX IF NOT EXISTS idx_customers_org_status
ON customers(organization_id, status);

-- Index for estimates by organization and status
CREATE INDEX IF NOT EXISTS idx_estimates_org_status
ON estimates(organization_id, status);

-- Index for invoices by organization and status
CREATE INDEX IF NOT EXISTS idx_invoices_org_status
ON invoices(organization_id, status);

-- Index for proposals by organization and status
CREATE INDEX IF NOT EXISTS idx_proposals_org_status
ON proposals(organization_id, status);

-- Index for site surveys by organization and status
CREATE INDEX IF NOT EXISTS idx_site_surveys_org_status
ON site_surveys(organization_id, status);

-- Index for notifications by user and read status
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
ON notifications(user_id, is_read) WHERE is_read = false;

-- Index for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
ON audit_log(organization_id, created_at DESC);

-- Index for job time entries lookup
CREATE INDEX IF NOT EXISTS idx_job_time_entries_job
ON job_time_entries(job_id, work_date);

-- Index for job completion photos
CREATE INDEX IF NOT EXISTS idx_job_completion_photos_job
ON job_completion_photos(job_id, created_at);
