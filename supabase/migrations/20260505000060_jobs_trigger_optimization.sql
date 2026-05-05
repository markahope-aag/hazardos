-- Trigger optimization on the `jobs` table.
--
-- Problem #1: redundant updated_at triggers
--   `update_jobs_updated_at` (initial_schema) and `jobs_updated_at` (later
--   migrations) both BEFORE UPDATE, both set NEW.updated_at = now().
--   Each row UPDATE pays for both. Drop the duplicate.
--
-- Problem #2: O(N) stat recalc on every job change
--   `update_company_stats` and `update_customer_stats` re-COUNT and re-SUM
--   the customer's / company's entire job history on every INSERT, every
--   UPDATE-of-status/revenue/customer_id, and every DELETE. For a customer
--   with N jobs, a bulk update of N jobs costs ~N² scans.
--
--   This migration replaces them with incremental triggers that look at
--   the OLD vs NEW state and apply ±1 / ±actual_revenue deltas. The
--   recalc-from-scratch logic lives on as `recalc_customer_stats(uuid)` /
--   `recalc_company_stats(uuid)` for one-off backfills and repair.

-- ============================================================================
-- 1. Drop the duplicate updated_at trigger. The remaining one
--    (`update_jobs_updated_at` from the initial schema) handles it.
-- ============================================================================
DROP TRIGGER IF EXISTS jobs_updated_at ON jobs;

-- ============================================================================
-- 2. Repair functions — full recalc, used for backfill and as an
--    occasional self-heal hook. Same logic as the old triggers, but no
--    longer wired to fire on every row change.
-- ============================================================================
CREATE OR REPLACE FUNCTION recalc_customer_stats(p_customer_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC(12, 2);
  v_last_job_date DATE;
BEGIN
  IF p_customer_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*),
         COALESCE(SUM(actual_revenue), 0),
         MAX(scheduled_start_date)
    INTO v_total_jobs, v_total_revenue, v_last_job_date
  FROM jobs
  WHERE customer_id = p_customer_id
    AND status = 'completed';

  UPDATE customers SET
    total_jobs     = v_total_jobs,
    lifetime_value = v_total_revenue,
    last_job_date  = v_last_job_date,
    updated_at     = NOW()
  WHERE id = p_customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION recalc_company_stats(p_company_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_jobs INTEGER;
  v_total_revenue NUMERIC(12, 2);
BEGIN
  IF p_company_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*), COALESCE(SUM(j.actual_revenue), 0)
    INTO v_total_jobs, v_total_revenue
  FROM jobs j
  JOIN customers c ON c.id = j.customer_id
  WHERE c.company_id = p_company_id
    AND j.status = 'completed';

  UPDATE companies SET
    total_jobs_completed = v_total_jobs,
    lifetime_value       = v_total_revenue,
    average_job_value    = CASE WHEN v_total_jobs > 0
                                THEN v_total_revenue / v_total_jobs
                                ELSE 0 END,
    updated_at           = NOW()
  WHERE id = p_company_id;
END;
$$;

-- service_role only — this is admin/maintenance work.
REVOKE EXECUTE ON FUNCTION recalc_customer_stats(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION recalc_company_stats(UUID)  FROM anon, authenticated;

-- ============================================================================
-- 3. Incremental customer-stats trigger.
--    Cost per row change: at most 2 single-row UPDATE on customers (when
--    customer_id changes, the old customer needs decrement + the new one
--    needs increment), plus 1 MAX() lookup *only when* a state change
--    can actually move last_job_date.
-- ============================================================================
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Did the OLD row count toward stats? (UPDATE/DELETE only)
  old_contrib BOOLEAN := (TG_OP IN ('UPDATE','DELETE')
                          AND OLD.status = 'completed'
                          AND OLD.customer_id IS NOT NULL);
  -- Does the NEW row count toward stats? (INSERT/UPDATE only)
  new_contrib BOOLEAN := (TG_OP IN ('INSERT','UPDATE')
                          AND NEW.status = 'completed'
                          AND NEW.customer_id IS NOT NULL);
  old_rev NUMERIC := COALESCE(CASE WHEN TG_OP <> 'INSERT' THEN OLD.actual_revenue END, 0);
  new_rev NUMERIC := COALESCE(CASE WHEN TG_OP <> 'DELETE' THEN NEW.actual_revenue END, 0);
BEGIN
  -- Subtract the OLD contribution from its owning customer.
  IF old_contrib THEN
    UPDATE customers SET
      total_jobs     = GREATEST(COALESCE(total_jobs, 0) - 1, 0),
      lifetime_value = GREATEST(COALESCE(lifetime_value, 0) - old_rev, 0),
      updated_at     = NOW()
    WHERE id = OLD.customer_id;
  END IF;

  -- Add the NEW contribution to its (possibly different) owning customer.
  IF new_contrib THEN
    UPDATE customers SET
      total_jobs     = COALESCE(total_jobs, 0) + 1,
      lifetime_value = COALESCE(lifetime_value, 0) + new_rev,
      updated_at     = NOW()
    WHERE id = NEW.customer_id;
  END IF;

  -- last_job_date is a MAX, so increments are easy but decrements may
  -- need a fresh MAX query. Only recompute when the OLD contribution
  -- could have been the max for that customer.
  IF old_contrib AND (
        TG_OP = 'DELETE'
     OR NOT new_contrib
     OR NEW.customer_id <> OLD.customer_id
     OR COALESCE(NEW.scheduled_start_date, '0001-01-01'::DATE)
        <> COALESCE(OLD.scheduled_start_date, '0001-01-01'::DATE)
  ) THEN
    UPDATE customers SET last_job_date = (
      SELECT MAX(scheduled_start_date)
      FROM jobs
      WHERE customer_id = OLD.customer_id
        AND status = 'completed'
    )
    WHERE id = OLD.customer_id;
  END IF;

  -- For new contributions, just push the MAX up.
  IF new_contrib AND NEW.scheduled_start_date IS NOT NULL THEN
    UPDATE customers
       SET last_job_date = GREATEST(
             COALESCE(last_job_date, NEW.scheduled_start_date),
             NEW.scheduled_start_date
           )
     WHERE id = NEW.customer_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 4. Incremental company-stats trigger.
--    Same pattern. The company is resolved through the customer link, so
--    a change to customer_id potentially moves the row from one company
--    to another (or null).
-- ============================================================================
CREATE OR REPLACE FUNCTION update_company_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_company UUID;
  new_company UUID;
  old_rev NUMERIC := COALESCE(CASE WHEN TG_OP <> 'INSERT' THEN OLD.actual_revenue END, 0);
  new_rev NUMERIC := COALESCE(CASE WHEN TG_OP <> 'DELETE' THEN NEW.actual_revenue END, 0);
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.status = 'completed' AND OLD.customer_id IS NOT NULL THEN
    SELECT company_id INTO old_company FROM customers WHERE id = OLD.customer_id;
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.status = 'completed' AND NEW.customer_id IS NOT NULL THEN
    SELECT company_id INTO new_company FROM customers WHERE id = NEW.customer_id;
  END IF;

  -- Subtract OLD contribution.
  IF old_company IS NOT NULL THEN
    UPDATE companies SET
      total_jobs_completed = GREATEST(COALESCE(total_jobs_completed, 0) - 1, 0),
      lifetime_value       = GREATEST(COALESCE(lifetime_value, 0) - old_rev, 0),
      average_job_value    = CASE WHEN GREATEST(COALESCE(total_jobs_completed, 0) - 1, 0) > 0
                                  THEN GREATEST(COALESCE(lifetime_value, 0) - old_rev, 0)
                                       / GREATEST(COALESCE(total_jobs_completed, 0) - 1, 0)
                                  ELSE 0 END,
      updated_at = NOW()
    WHERE id = old_company;
  END IF;

  -- Add NEW contribution.
  IF new_company IS NOT NULL THEN
    UPDATE companies SET
      total_jobs_completed = COALESCE(total_jobs_completed, 0) + 1,
      lifetime_value       = COALESCE(lifetime_value, 0) + new_rev,
      average_job_value    = (COALESCE(lifetime_value, 0) + new_rev)
                              / (COALESCE(total_jobs_completed, 0) + 1),
      updated_at = NOW()
    WHERE id = new_company;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- 5. One-shot backfill so the new incremental counters start from a
--    consistent baseline. Runs the full-recalc helpers across every
--    customer + company that has ever had a job.
-- ============================================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT DISTINCT customer_id FROM jobs WHERE customer_id IS NOT NULL LOOP
    PERFORM recalc_customer_stats(r.customer_id);
  END LOOP;
  FOR r IN
    SELECT DISTINCT c.company_id
    FROM customers c
    JOIN jobs j ON j.customer_id = c.id
    WHERE c.company_id IS NOT NULL
  LOOP
    PERFORM recalc_company_stats(r.company_id);
  END LOOP;
END $$;
