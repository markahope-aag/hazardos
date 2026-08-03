-- ============================================
-- Harden function search_path + tighten permissive RLS policy
-- ============================================
-- Supabase linter flagged the functions recreated in the 20260421000003
-- repair migration: they were copied verbatim from the originals, which
-- predate the project's function-search-path lockdown.
--
-- This migration re-defines each flagged function with:
--   * SET search_path = '' so they resolve identifiers against the
--     declared schema only (no hijack risk via temp-schema shadowing)
--   * Schema-qualified references (public.*, extensions.*) inside the
--     body so the empty search_path doesn't break lookups
--
-- It also tightens the one permissive RLS policy on feedback_surveys
-- that allowed unrestricted UPDATE from the anon role.

-- ============================================================================
-- From 20260201000010_jobs_system.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_crew_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.clock_in_at IS NOT NULL AND NEW.clock_out_at IS NOT NULL THEN
    NEW.hours_worked := EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 3600
                        - COALESCE(NEW.break_minutes, 0) / 60.0;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_change_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public.jobs
  SET
    change_order_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.job_change_orders
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'approved'
    ),
    final_amount = contract_amount + (
      SELECT COALESCE(SUM(amount), 0)
      FROM public.job_change_orders
      WHERE job_id = COALESCE(NEW.job_id, OLD.job_id)
      AND status = 'approved'
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.job_id, OLD.job_id);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_job_number(org_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  year_str VARCHAR(4);
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(job_number FROM 'JOB-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.jobs
  WHERE organization_id = org_id
  AND job_number LIKE 'JOB-' || year_str || '-%';

  RETURN 'JOB-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

-- ============================================================================
-- From 20260201000020_invoices.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_invoice_number(org_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  year_str VARCHAR(4);
  next_num INTEGER;
BEGIN
  year_str := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(MAX(
    CAST(SUBSTRING(invoice_number FROM 'INV-\d{4}-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE organization_id = org_id
  AND invoice_number LIKE 'INV-' || year_str || '-%';

  RETURN 'INV-' || year_str || '-' || LPAD(next_num::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_invoice_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  inv_id UUID;
  paid_total DECIMAL(12, 2);
  inv_total DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(amount), 0) INTO paid_total
  FROM public.payments WHERE invoice_id = inv_id;

  SELECT total INTO inv_total FROM public.invoices WHERE id = inv_id;

  UPDATE public.invoices
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
$$;

CREATE OR REPLACE FUNCTION public.recalculate_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  inv_id UUID;
  new_subtotal DECIMAL(12, 2);
  inv_tax_rate DECIMAL(5, 4);
  inv_discount DECIMAL(12, 2);
  inv_amount_paid DECIMAL(12, 2);
BEGIN
  inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT COALESCE(SUM(line_total), 0) INTO new_subtotal
  FROM public.invoice_line_items WHERE invoice_id = inv_id;

  SELECT tax_rate, discount_amount, amount_paid
  INTO inv_tax_rate, inv_discount, inv_amount_paid
  FROM public.invoices WHERE id = inv_id;

  UPDATE public.invoices
  SET
    subtotal = new_subtotal,
    tax_amount = new_subtotal * COALESCE(inv_tax_rate, 0),
    total = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0),
    balance_due = new_subtotal + (new_subtotal * COALESCE(inv_tax_rate, 0)) - COALESCE(inv_discount, 0) - COALESCE(inv_amount_paid, 0),
    updated_at = NOW()
  WHERE id = inv_id;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- From 20260202000001_customer_contacts.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sync_primary_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.customer_contacts
    SET is_primary = false, updated_at = now()
    WHERE customer_id = NEW.customer_id
      AND id != NEW.id
      AND is_primary = true;

    UPDATE public.customers
    SET
      name = NEW.name,
      email = NEW.email,
      phone = COALESCE(NEW.phone, NEW.mobile),
      updated_at = now()
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_primary_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  remaining_contact UUID;
BEGIN
  IF OLD.is_primary = true THEN
    SELECT id INTO remaining_contact
    FROM public.customer_contacts
    WHERE customer_id = OLD.customer_id
    ORDER BY
      CASE role
        WHEN 'primary' THEN 1
        WHEN 'billing' THEN 2
        WHEN 'site' THEN 3
        WHEN 'scheduling' THEN 4
        ELSE 5
      END,
      created_at ASC
    LIMIT 1;

    IF remaining_contact IS NOT NULL THEN
      UPDATE public.customer_contacts
      SET is_primary = true, updated_at = now()
      WHERE id = remaining_contact;
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

-- ============================================================================
-- From 20260203000001_platform_billing.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_jobs_count(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.organization_subscriptions
  SET jobs_this_month = jobs_this_month + 1,
      updated_at = NOW()
  WHERE organization_id = org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_monthly_job_counts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.organization_subscriptions
  SET jobs_this_month = 0,
      updated_at = NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.update_org_users_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.organization_subscriptions
  SET users_count = (
    SELECT COUNT(*) FROM public.profiles
    WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id)
  ),
  updated_at = NOW()
  WHERE organization_id = COALESCE(NEW.organization_id, OLD.organization_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================================
-- From 20260215000001_job_completion.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_job_time_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_completion_checklists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_job_completions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.initialize_job_checklist(p_job_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'safety', 'PPE Used Properly', 'All crew wore required PPE throughout the job', 1, true),
    (p_job_id, 'safety', 'Safety Perimeter Maintained', 'Work area was properly cordoned off', 2, true),
    (p_job_id, 'safety', 'No Incidents Reported', 'No safety incidents or near-misses occurred', 3, true),
    (p_job_id, 'safety', 'Air Quality Monitored', 'Air quality monitoring was performed as required', 4, false);

  INSERT INTO public.job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'quality', 'Work Meets Specifications', 'All work completed to specification and standards', 1, true),
    (p_job_id, 'quality', 'Materials Properly Contained', 'Hazardous materials properly contained and sealed', 2, true),
    (p_job_id, 'quality', 'Area Clearance Testing', 'Post-work testing confirms safe levels', 3, false);

  INSERT INTO public.job_completion_checklists (job_id, category, item_name, item_description, sort_order, is_required)
  VALUES
    (p_job_id, 'cleanup', 'Work Area Cleaned', 'All debris and waste removed from work area', 1, true),
    (p_job_id, 'cleanup', 'Equipment Cleaned', 'All equipment properly decontaminated', 2, true),
    (p_job_id, 'cleanup', 'Waste Properly Bagged', 'All hazardous waste properly bagged and labeled', 3, true),
    (p_job_id, 'cleanup', 'Disposal Manifests Completed', 'Disposal documentation is complete', 4, true);
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_completion_variance(p_completion_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_job_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_material_cost DECIMAL(12, 2);
BEGIN
  SELECT job_id INTO v_job_id FROM public.job_completions WHERE id = p_completion_id;

  SELECT COALESCE(SUM(hours), 0) INTO v_actual_hours
  FROM public.job_time_entries WHERE job_id = v_job_id;

  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM public.job_material_usage WHERE job_id = v_job_id;

  SELECT estimated_duration_hours, contract_amount
  INTO v_estimated_hours, v_estimated_material_cost
  FROM public.jobs WHERE id = v_job_id;

  UPDATE public.job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL
      THEN v_actual_hours - v_estimated_hours ELSE NULL END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100) ELSE NULL END,
    cost_variance = CASE WHEN v_estimated_material_cost IS NOT NULL
      THEN v_actual_material_cost - v_estimated_material_cost ELSE NULL END,
    cost_variance_percent = CASE WHEN v_estimated_material_cost IS NOT NULL AND v_estimated_material_cost > 0
      THEN ((v_actual_material_cost - v_estimated_material_cost) / v_estimated_material_cost * 100) ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_completion_id;
END;
$$;

-- ============================================================================
-- From 20260215000002_customer_feedback.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_feedback_token()
RETURNS VARCHAR(64)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  token VARCHAR(64);
  token_exists BOOLEAN;
BEGIN
  LOOP
    token := encode(extensions.gen_random_bytes(32), 'hex');

    SELECT EXISTS(SELECT 1 FROM public.feedback_surveys WHERE access_token = token) INTO token_exists;

    EXIT WHEN NOT token_exists;
  END LOOP;

  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_feedback_surveys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_survey_average_rating(survey_id UUID)
RETURNS DECIMAL(3, 2)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  total DECIMAL;
  count INTEGER;
BEGIN
  SELECT
    COALESCE(rating_overall, 0) +
    COALESCE(rating_quality, 0) +
    COALESCE(rating_communication, 0) +
    COALESCE(rating_timeliness, 0) +
    COALESCE(rating_value, 0),
    (CASE WHEN rating_overall IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_quality IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_communication IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_timeliness IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN rating_value IS NOT NULL THEN 1 ELSE 0 END)
  INTO total, count
  FROM public.feedback_surveys
  WHERE id = survey_id;

  IF count = 0 THEN
    RETURN NULL;
  END IF;

  RETURN total / count;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_feedback_stats(org_id UUID)
RETURNS TABLE (
  total_surveys BIGINT,
  completed_surveys BIGINT,
  avg_overall_rating DECIMAL(3, 2),
  avg_quality_rating DECIMAL(3, 2),
  avg_communication_rating DECIMAL(3, 2),
  avg_timeliness_rating DECIMAL(3, 2),
  nps_score DECIMAL(5, 2),
  testimonials_count BIGINT,
  response_rate DECIMAL(5, 2)
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_surveys,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_surveys,
    AVG(rating_overall)::DECIMAL(3, 2) as avg_overall_rating,
    AVG(rating_quality)::DECIMAL(3, 2) as avg_quality_rating,
    AVG(rating_communication)::DECIMAL(3, 2) as avg_communication_rating,
    AVG(rating_timeliness)::DECIMAL(3, 2) as avg_timeliness_rating,
    (
      (COUNT(*) FILTER (WHERE likelihood_to_recommend >= 9)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100) -
      (COUNT(*) FILTER (WHERE likelihood_to_recommend <= 6)::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE likelihood_to_recommend IS NOT NULL), 0) * 100)
    )::DECIMAL(5, 2) as nps_score,
    COUNT(*) FILTER (WHERE testimonial_approved = true)::BIGINT as testimonials_count,
    (COUNT(*) FILTER (WHERE status = 'completed')::DECIMAL / NULLIF(COUNT(*) FILTER (WHERE status != 'pending'), 0) * 100)::DECIMAL(5, 2) as response_rate
  FROM public.feedback_surveys
  WHERE organization_id = org_id;
END;
$$;

-- ============================================================================
-- From 20260220000002_sales_tools.sql
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (organization_id, name, color, stage_type, probability, sort_order)
  VALUES
    (NEW.id, 'New Lead', '#94a3b8', 'lead', 10, 1),
    (NEW.id, 'Qualified', '#3b82f6', 'qualified', 25, 2),
    (NEW.id, 'Proposal Sent', '#8b5cf6', 'proposal', 50, 3),
    (NEW.id, 'Negotiation', '#f59e0b', 'negotiation', 75, 4),
    (NEW.id, 'Won', '#22c55e', 'won', 100, 5),
    (NEW.id, 'Lost', '#ef4444', 'lost', 0, 6);
  RETURN NEW;
END;
$$;

-- ============================================================================
-- Tighten permissive RLS policy
-- ============================================================================
-- The original policy allowed any role to UPDATE any row in feedback_surveys
-- ("USING (true)", "Token validation done in application layer"). Trusting
-- the application layer isn't defense-in-depth — if the app leaks or a
-- malicious actor finds an endpoint, they could trample any row.
--
-- This version at least scopes the UPDATE to rows that are still in a
-- responsive state and not past their token expiry, and preserves those
-- constraints on WITH CHECK so a malicious update can't revive an
-- expired survey. Column-level gating (forbid changing organization_id,
-- access_token, etc.) belongs in a GRANT-level change; we keep the
-- status-and-expiry gate as the RLS layer's contribution.
DROP POLICY IF EXISTS "Public can update surveys by token" ON public.feedback_surveys;
CREATE POLICY "Public can update surveys by token"
  ON public.feedback_surveys FOR UPDATE
  USING (
    status IN ('pending', 'sent', 'viewed')
    AND token_expires_at > NOW()
  )
  WITH CHECK (
    status IN ('pending', 'sent', 'viewed', 'completed')
    AND token_expires_at > NOW()
  );

-- ============================================================================
-- stripe_webhook_events: add an explicit read-only policy
-- ============================================================================
-- RLS is enabled but no policy exists, so every non-service_role read is
-- rejected. That's functionally fine (the Stripe webhook handler writes
-- via the service role, which bypasses RLS) but flagged by the linter as
-- "enabled with no policy". Add a platform-owner read policy so intent
-- is explicit. Writes remain service-role-only, which is correct.
DROP POLICY IF EXISTS "Platform owners can view stripe webhook events" ON public.stripe_webhook_events;
CREATE POLICY "Platform owners can view stripe webhook events"
  ON public.stripe_webhook_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('platform_owner', 'platform_admin')
    )
  );
