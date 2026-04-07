-- Trigger to keep company stats (total_jobs_completed, lifetime_value, average_job_value)
-- in sync when jobs or invoices are created/updated/deleted.
--
-- This solves the data integrity issue where companies show 0 jobs / no value
-- even when their contacts have completed work.

-- Function: recalculate company stats from jobs linked through customers
CREATE OR REPLACE FUNCTION update_company_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC(12,2);
BEGIN
  -- Get the company_id from the customer linked to this job
  SELECT c.company_id INTO v_company_id
  FROM public.customers c
  WHERE c.id = COALESCE(NEW.customer_id, OLD.customer_id)
    AND c.company_id IS NOT NULL;

  -- If no company linked, nothing to update
  IF v_company_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count completed jobs for all customers under this company
  SELECT COUNT(*) INTO v_total_jobs
  FROM public.jobs j
  JOIN public.customers c ON c.id = j.customer_id
  WHERE c.company_id = v_company_id
    AND j.status = 'completed';

  -- Sum revenue from completed jobs
  SELECT COALESCE(SUM(j.actual_revenue), 0) INTO v_total_revenue
  FROM public.jobs j
  JOIN public.customers c ON c.id = j.customer_id
  WHERE c.company_id = v_company_id
    AND j.status = 'completed';

  -- Update the company record
  UPDATE public.companies SET
    total_jobs_completed = v_total_jobs,
    lifetime_value = v_total_revenue,
    average_job_value = CASE WHEN v_total_jobs > 0 THEN v_total_revenue / v_total_jobs ELSE 0 END,
    updated_at = NOW()
  WHERE id = v_company_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Also update customer stats when jobs change
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_customer_id UUID;
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC(12,2);
  v_last_job_date DATE;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  IF v_customer_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Count completed jobs
  SELECT COUNT(*), COALESCE(SUM(actual_revenue), 0), MAX(scheduled_start_date)
  INTO v_total_jobs, v_total_revenue, v_last_job_date
  FROM public.jobs
  WHERE customer_id = v_customer_id
    AND status = 'completed';

  -- Update customer record
  UPDATE public.customers SET
    total_jobs = v_total_jobs,
    lifetime_value = v_total_revenue,
    last_job_date = v_last_job_date,
    updated_at = NOW()
  WHERE id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on jobs table for company stats
DROP TRIGGER IF EXISTS update_company_stats_on_job_change ON jobs;
CREATE TRIGGER update_company_stats_on_job_change
  AFTER INSERT OR UPDATE OF status, actual_revenue, customer_id
  OR DELETE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_company_stats();

-- Trigger on jobs table for customer stats
DROP TRIGGER IF EXISTS update_customer_stats_on_job_change ON jobs;
CREATE TRIGGER update_customer_stats_on_job_change
  AFTER INSERT OR UPDATE OF status, actual_revenue, customer_id
  OR DELETE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_stats();

-- Backfill: recalculate stats for all companies with linked customers who have jobs
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT c.company_id
    FROM public.customers c
    JOIN public.jobs j ON j.customer_id = c.id
    WHERE c.company_id IS NOT NULL
  LOOP
    UPDATE public.companies SET
      total_jobs_completed = (
        SELECT COUNT(*) FROM public.jobs j
        JOIN public.customers c ON c.id = j.customer_id
        WHERE c.company_id = r.company_id AND j.status = 'completed'
      ),
      lifetime_value = (
        SELECT COALESCE(SUM(j.actual_revenue), 0) FROM public.jobs j
        JOIN public.customers c ON c.id = j.customer_id
        WHERE c.company_id = r.company_id AND j.status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = r.company_id;

    -- Also set average_job_value
    UPDATE public.companies SET
      average_job_value = CASE WHEN total_jobs_completed > 0 THEN lifetime_value / total_jobs_completed ELSE 0 END
    WHERE id = r.company_id;
  END LOOP;
END $$;

-- Backfill: recalculate customer stats
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT customer_id FROM public.jobs WHERE customer_id IS NOT NULL
  LOOP
    UPDATE public.customers SET
      total_jobs = (
        SELECT COUNT(*) FROM public.jobs WHERE customer_id = r.customer_id AND status = 'completed'
      ),
      lifetime_value = (
        SELECT COALESCE(SUM(actual_revenue), 0) FROM public.jobs WHERE customer_id = r.customer_id AND status = 'completed'
      ),
      last_job_date = (
        SELECT MAX(scheduled_start_date) FROM public.jobs WHERE customer_id = r.customer_id AND status = 'completed'
      ),
      updated_at = NOW()
    WHERE id = r.customer_id;
  END LOOP;
END $$;
