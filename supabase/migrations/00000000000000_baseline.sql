


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."account_status" AS ENUM (
    'prospect',
    'active',
    'inactive',
    'churned'
);


ALTER TYPE "public"."account_status" OWNER TO "postgres";


CREATE TYPE "public"."appointment_status" AS ENUM (
    'scheduled',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'no_show'
);


ALTER TYPE "public"."appointment_status" OWNER TO "postgres";


CREATE TYPE "public"."company_type" AS ENUM (
    'residential_property_mgr',
    'commercial_property_mgr',
    'general_contractor',
    'industrial',
    'hoa',
    'government',
    'direct_homeowner',
    'other'
);


ALTER TYPE "public"."company_type" OWNER TO "postgres";


CREATE TYPE "public"."contact_category" AS ENUM (
    'property_owner',
    'homeowner',
    'realtor',
    'project_manager',
    'designated_person',
    'landlord',
    'contractor',
    'other'
);


ALTER TYPE "public"."contact_category" OWNER TO "postgres";


CREATE TYPE "public"."contact_role" AS ENUM (
    'decision_maker',
    'influencer',
    'billing',
    'property_manager',
    'site_contact',
    'other'
);


ALTER TYPE "public"."contact_role" OWNER TO "postgres";


CREATE TYPE "public"."contact_status" AS ENUM (
    'active',
    'inactive',
    'do_not_contact',
    'archived'
);


ALTER TYPE "public"."contact_status" OWNER TO "postgres";


CREATE TYPE "public"."containment_level" AS ENUM (
    'type_i',
    'type_ii',
    'type_iii'
);


ALTER TYPE "public"."containment_level" OWNER TO "postgres";


CREATE TYPE "public"."credential_applies_to" AS ENUM (
    'worker',
    'asset'
);


ALTER TYPE "public"."credential_applies_to" OWNER TO "postgres";


CREATE TYPE "public"."credential_category" AS ENUM (
    'worker_license',
    'rrp_certification',
    'respirator_fit_test',
    'medical_clearance',
    'equipment_calibration',
    'other'
);


ALTER TYPE "public"."credential_category" OWNER TO "postgres";


CREATE TYPE "public"."customer_source" AS ENUM (
    'phone',
    'website',
    'mail',
    'referral',
    'other'
);


ALTER TYPE "public"."customer_source" OWNER TO "postgres";


CREATE TYPE "public"."customer_status" AS ENUM (
    'inquiry',
    'prospect',
    'customer',
    'inactive',
    'past_customer'
);


ALTER TYPE "public"."customer_status" OWNER TO "postgres";


CREATE TYPE "public"."disposal_hazard_type" AS ENUM (
    'asbestos_friable',
    'asbestos_non_friable',
    'mold',
    'lead',
    'other'
);


ALTER TYPE "public"."disposal_hazard_type" OWNER TO "postgres";


CREATE TYPE "public"."estimate_status" AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'sent',
    'accepted',
    'rejected',
    'expired',
    'converted'
);


ALTER TYPE "public"."estimate_status" OWNER TO "postgres";


CREATE TYPE "public"."hazard_type" AS ENUM (
    'asbestos',
    'mold',
    'lead',
    'vermiculite',
    'other'
);


ALTER TYPE "public"."hazard_type" OWNER TO "postgres";


CREATE TYPE "public"."lab_report_status" AS ENUM (
    'ordered',
    'received',
    'cancelled'
);


ALTER TYPE "public"."lab_report_status" OWNER TO "postgres";


CREATE TYPE "public"."lab_sample_type" AS ENUM (
    'asbestos_bulk',
    'asbestos_air',
    'lead_paint',
    'lead_dust',
    'lead_water',
    'lead_soil',
    'mold_air',
    'mold_surface',
    'silica',
    'other'
);


ALTER TYPE "public"."lab_sample_type" OWNER TO "postgres";


CREATE TYPE "public"."line_item_type" AS ENUM (
    'labor',
    'equipment',
    'material',
    'disposal',
    'travel',
    'permit',
    'testing',
    'other'
);


ALTER TYPE "public"."line_item_type" OWNER TO "postgres";


CREATE TYPE "public"."opportunity_status" AS ENUM (
    'new',
    'assessment_scheduled',
    'survey_completed',
    'estimate_sent',
    'won',
    'lost',
    'no_decision'
);


ALTER TYPE "public"."opportunity_status" OWNER TO "postgres";


CREATE TYPE "public"."property_type" AS ENUM (
    'residential_single_family',
    'residential_multi_family',
    'commercial',
    'industrial',
    'government'
);


ALTER TYPE "public"."property_type" OWNER TO "postgres";


CREATE TYPE "public"."proposal_status" AS ENUM (
    'draft',
    'sent',
    'viewed',
    'signed',
    'expired',
    'declined'
);


ALTER TYPE "public"."proposal_status" OWNER TO "postgres";


CREATE TYPE "public"."regulatory_trigger" AS ENUM (
    'inspection_required',
    'sale_pending',
    'tenant_complaint',
    'insurance_claim',
    'voluntary'
);


ALTER TYPE "public"."regulatory_trigger" OWNER TO "postgres";


CREATE TYPE "public"."site_survey_status" AS ENUM (
    'draft',
    'submitted',
    'reviewed',
    'estimated',
    'quoted',
    'scheduled',
    'in_progress',
    'completed',
    'cancelled',
    'archived'
);


ALTER TYPE "public"."site_survey_status" OWNER TO "postgres";


CREATE TYPE "public"."sms_message_type" AS ENUM (
    'appointment_reminder',
    'job_status',
    'lead_notification',
    'payment_reminder',
    'estimate_follow_up',
    'general',
    'incoming_message',
    'marketing'
);


ALTER TYPE "public"."sms_message_type" OWNER TO "postgres";


CREATE TYPE "public"."sms_status" AS ENUM (
    'queued',
    'sending',
    'sent',
    'delivered',
    'failed',
    'undelivered'
);


ALTER TYPE "public"."sms_status" OWNER TO "postgres";


CREATE TYPE "public"."urgency_level" AS ENUM (
    'routine',
    'urgent',
    'emergency'
);


ALTER TYPE "public"."urgency_level" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'estimator',
    'technician',
    'viewer',
    'platform_owner',
    'platform_admin',
    'tenant_owner'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."_debug_list_profiles_policies"() RETURNS TABLE("policy_name" "text", "command" "text", "using_expr" "text", "check_expr" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT
    pol.polname::text,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END,
    pg_get_expr(pol.polqual, pol.polrelid, true)::text,
    pg_get_expr(pol.polwithcheck, pol.polrelid, true)::text
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE cls.relname = 'profiles' AND nsp.nspname = 'public'
  ORDER BY pol.polname;
$$;


ALTER FUNCTION "public"."_debug_list_profiles_policies"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."allow_first_org_creation"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_profile_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if user has a profile yet
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) INTO v_profile_exists;

  -- If no profile, this is initial signup - allow org creation
  IF NOT v_profile_exists THEN
    RETURN TRUE;
  END IF;

  -- Otherwise use the normal rate limit check
  RETURN can_create_organization();
EXCEPTION WHEN undefined_table THEN
  -- Profiles table doesn't exist, allow creation
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."allow_first_org_creation"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."job_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "status" character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    "estimated_hours" numeric(8,2),
    "estimated_material_cost" numeric(12,2),
    "estimated_total" numeric(12,2),
    "actual_hours" numeric(8,2),
    "actual_material_cost" numeric(12,2),
    "actual_labor_cost" numeric(12,2),
    "actual_total" numeric(12,2),
    "hours_variance" numeric(8,2),
    "hours_variance_percent" numeric(5,2),
    "cost_variance" numeric(12,2),
    "cost_variance_percent" numeric(5,2),
    "field_notes" "text",
    "issues_encountered" "text",
    "recommendations" "text",
    "submitted_at" timestamp with time zone,
    "submitted_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "review_notes" "text",
    "rejection_reason" "text",
    "customer_signed" boolean DEFAULT false,
    "customer_signed_at" timestamp with time zone,
    "customer_signature_name" character varying(255),
    "customer_signature_data" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_completions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_job_completion"("p_job_id" "uuid", "p_reviewed_by" "uuid", "p_review_notes" "text" DEFAULT NULL::"text") RETURNS "public"."job_completions"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_completion public.job_completions;
BEGIN
  UPDATE public.job_completions
     SET status = 'approved',
         reviewed_at = now(),
         reviewed_by = p_reviewed_by,
         review_notes = p_review_notes
   WHERE job_id = p_job_id
   RETURNING * INTO v_completion;

  IF v_completion.id IS NULL THEN
    RAISE EXCEPTION 'No job completion found for job %', p_job_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.jobs
     SET status = 'completed',
         actual_end_date = (now())::date
   WHERE id = p_job_id;

  RETURN v_completion;
END;
$$;


ALTER FUNCTION "public"."approve_job_completion"("p_job_id" "uuid", "p_reviewed_by" "uuid", "p_review_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_invoice_on_job_completion"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing      uuid;
  v_amount        numeric;
  v_line_items    jsonb := '[]'::jsonb;
  v_co            RECORD;
  v_discount      numeric := 0;
  v_contact_type  text;
  v_company_terms text;
  v_due_days      int;
  v_terms_label   text;
  v_created_by    uuid;
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing FROM invoices WHERE job_id = NEW.id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Base contract only (NOT final_amount, which already includes approved
  -- change orders that we itemize separately below — see migration header).
  v_amount := COALESCE(NEW.contract_amount, NEW.final_amount);
  IF v_amount IS NOT NULL AND v_amount <> 0 THEN
    v_line_items := v_line_items || jsonb_build_object(
      'description', 'Remediation services - Job #' || NEW.job_number,
      'quantity',    1,
      'unit',        'job',
      'unit_price',  v_amount,
      'source_type', 'job',
      'source_id',   NEW.id
    );
  END IF;

  FOR v_co IN
    SELECT id, description, amount
    FROM job_change_orders
    WHERE job_id = NEW.id AND status = 'approved'
  LOOP
    v_line_items := v_line_items || jsonb_build_object(
      'description', 'Change Order: ' || v_co.description,
      'quantity',    1,
      'unit',        'each',
      'unit_price',  v_co.amount,
      'source_type', 'change_order',
      'source_id',   v_co.id
    );
  END LOOP;

  IF v_line_items = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  IF NEW.estimate_id IS NOT NULL THEN
    SELECT COALESCE(discount_amount, 0) INTO v_discount
    FROM estimates WHERE id = NEW.estimate_id;
    v_discount := COALESCE(v_discount, 0);
  END IF;

  SELECT c.contact_type, co.payment_terms
    INTO v_contact_type, v_company_terms
  FROM customers c
  LEFT JOIN companies co ON co.id = c.company_id
  WHERE c.id = NEW.customer_id;

  IF v_company_terms IS NOT NULL AND v_company_terms ~* 'Net\s+\d+' THEN
    v_due_days    := (regexp_match(v_company_terms, 'Net\s+(\d+)', 'i'))[1]::int;
    v_terms_label := v_company_terms;
  ELSIF v_company_terms IS NOT NULL AND v_company_terms <> '' THEN
    v_due_days    := 30;
    v_terms_label := v_company_terms;
  ELSIF v_contact_type = 'commercial' THEN
    v_due_days    := 30;
    v_terms_label := 'Net 30';
  ELSE
    v_due_days    := 15;
    v_terms_label := 'Net 15';
  END IF;

  v_created_by := COALESCE(auth.uid(), NEW.created_by);

  PERFORM create_invoice_from_job(
    NEW.id,
    (CURRENT_DATE + v_due_days),
    v_terms_label,
    v_discount,
    v_line_items,
    v_created_by
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_invoice_on_job_completion"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_completion_variance"("p_completion_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."calculate_completion_variance"("p_completion_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_completion_variance_by_job"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_completion_id UUID;
  v_actual_hours DECIMAL(8, 2);
  v_actual_material_cost DECIMAL(12, 2);
  v_actual_labor_cost DECIMAL(12, 2);
  v_actual_equipment_cost DECIMAL(12, 2);
  v_actual_total DECIMAL(12, 2);
  v_estimated_hours DECIMAL(8, 2);
  v_estimated_total DECIMAL(12, 2);
  v_revenue DECIMAL(12, 2);
BEGIN
  -- Runs as postgres and bypasses RLS, so an end user must be shown to own the
  -- job. auth.uid() is NULL for the service-role client and for direct
  -- connections, which are the trusted server paths.
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM jobs
      WHERE id = p_job_id
        AND organization_id = get_user_organization_id()
    ) THEN
      RAISE EXCEPTION 'job not found in your organization'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT id, estimated_total INTO v_completion_id, v_estimated_total
  FROM job_completions WHERE job_id = p_job_id;
  IF v_completion_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(hours), 0),
         COALESCE(SUM(hours * COALESCE(hourly_rate, 0)), 0)
  INTO v_actual_hours, v_actual_labor_cost
  FROM job_time_entries WHERE job_id = p_job_id;

  SELECT COALESCE(SUM(total_cost), 0) INTO v_actual_material_cost
  FROM job_material_usage WHERE job_id = p_job_id;

  SELECT COALESCE(SUM(rental_total), 0) INTO v_actual_equipment_cost
  FROM job_equipment WHERE job_id = p_job_id;

  v_actual_total := v_actual_labor_cost + v_actual_material_cost + v_actual_equipment_cost;

  SELECT estimated_duration_hours, COALESCE(actual_revenue, contract_amount, final_amount)
  INTO v_estimated_hours, v_revenue
  FROM jobs WHERE id = p_job_id;

  UPDATE job_completions
  SET
    actual_hours = v_actual_hours,
    actual_material_cost = v_actual_material_cost,
    actual_labor_cost = v_actual_labor_cost,
    actual_total = v_actual_total,
    hours_variance = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN v_actual_hours - v_estimated_hours ELSE NULL END,
    hours_variance_percent = CASE WHEN v_estimated_hours IS NOT NULL AND v_estimated_hours > 0
      THEN ((v_actual_hours - v_estimated_hours) / v_estimated_hours * 100)::DECIMAL(5, 2) ELSE NULL END,
    cost_variance = CASE WHEN v_estimated_total IS NOT NULL AND v_estimated_total > 0
      THEN v_actual_total - v_estimated_total ELSE NULL END,
    cost_variance_percent = CASE WHEN v_estimated_total IS NOT NULL AND v_estimated_total > 0
      THEN ((v_actual_total - v_estimated_total) / v_estimated_total * 100)::DECIMAL(5, 2) ELSE NULL END,
    updated_at = NOW()
  WHERE id = v_completion_id;

  UPDATE jobs
  SET
    actual_cost = v_actual_total,
    gross_margin_pct = CASE
      WHEN v_revenue IS NOT NULL AND v_revenue > 0
      THEN (((v_revenue - v_actual_total) / NULLIF(v_revenue, 0)) * 100)::DECIMAL(5, 2)
      ELSE NULL
    END,
    updated_at = NOW()
  WHERE id = p_job_id;
END;
$$;


ALTER FUNCTION "public"."calculate_completion_variance_by_job"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_crew_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."calculate_crew_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_survey_average_rating"("survey_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."calculate_survey_average_rating"("survey_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_create_organization"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
  v_org_count INTEGER;
  v_max_orgs INTEGER := 1;  -- Default: 1 org per user
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Count how many orgs this user owns
  SELECT COUNT(*) INTO v_org_count
  FROM profiles
  WHERE id = v_user_id
    AND role IN ('owner', 'tenant_owner');

  -- Platform owners can create unlimited orgs
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = v_user_id
    AND role IN ('platform_owner', 'platform_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN v_org_count < v_max_orgs;
EXCEPTION WHEN undefined_table THEN
  -- Profiles table doesn't exist, allow creation
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_create_organization"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_ai_enabled"("p_organization_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT ai_enabled INTO v_enabled
  FROM organization_ai_settings
  WHERE organization_id = p_organization_id;

  RETURN COALESCE(v_enabled, false);
END;
$$;


ALTER FUNCTION "public"."check_ai_enabled"("p_organization_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_ai_feature_enabled"("p_organization_id" "uuid", "p_feature" character varying) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_settings organization_ai_settings%ROWTYPE;
BEGIN
  SELECT * INTO v_settings
  FROM organization_ai_settings
  WHERE organization_id = p_organization_id;

  IF NOT FOUND OR NOT v_settings.ai_enabled THEN
    RETURN false;
  END IF;

  CASE p_feature
    WHEN 'photo_analysis' THEN RETURN v_settings.photo_analysis_enabled;
    WHEN 'estimate_suggestions' THEN RETURN v_settings.estimate_suggestions_enabled;
    WHEN 'voice_transcription' THEN RETURN v_settings.voice_transcription_enabled;
    ELSE RETURN false;
  END CASE;
END;
$$;


ALTER FUNCTION "public"."check_ai_feature_enabled"("p_organization_id" "uuid", "p_feature" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_increment_rate_limit"("p_key_id" "uuid", OUT "allowed" boolean, OUT "remaining" integer, OUT "reset_at" timestamp with time zone, OUT "current_count" integer) RETURNS "record"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_rate_limit INTEGER;
  v_current_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_new_reset_at TIMESTAMPTZ;
  v_now TIMESTAMPTZ;
BEGIN
  v_now := NOW();
  
  -- Lock the row for atomic read-modify-write
  -- This prevents concurrent requests from bypassing rate limits
  SELECT 
    rate_limit,
    COALESCE(rate_limit_count, 0),
    rate_limit_reset_at
  INTO 
    v_rate_limit,
    v_current_count,
    v_reset_at
  FROM api_keys
  WHERE id = p_key_id
    AND is_active = true
    AND revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > v_now)
  FOR UPDATE; -- Critical: locks the row to prevent race conditions
  
  -- If key not found or invalid, deny request
  IF NOT FOUND THEN
    allowed := false;
    remaining := 0;
    reset_at := v_now;
    current_count := 0;
    RETURN;
  END IF;
  
  -- Check if we need to reset the rate limit window
  IF v_reset_at IS NULL OR v_reset_at <= v_now THEN
    -- Reset the rate limit window (1 hour from now)
    v_new_reset_at := v_now + INTERVAL '1 hour';
    v_current_count := 0;
    
    -- Update with new reset time and count = 1 (for this request)
    UPDATE api_keys 
    SET 
      rate_limit_count = 1,
      rate_limit_reset_at = v_new_reset_at,
      last_used_at = v_now
    WHERE id = p_key_id;
    
    allowed := true;
    remaining := v_rate_limit - 1;
    reset_at := v_new_reset_at;
    current_count := 1;
    RETURN;
  END IF;
  
  -- Check if we're over the rate limit
  IF v_current_count >= v_rate_limit THEN
    allowed := false;
    remaining := 0;
    reset_at := v_reset_at;
    current_count := v_current_count;
    RETURN;
  END IF;
  
  -- We're under the limit, increment the counter atomically
  UPDATE api_keys 
  SET 
    rate_limit_count = rate_limit_count + 1,
    last_used_at = v_now
  WHERE id = p_key_id;
  
  allowed := true;
  remaining := v_rate_limit - v_current_count - 1;
  reset_at := v_reset_at;
  current_count := v_current_count + 1;
END;
$$;


ALTER FUNCTION "public"."check_and_increment_rate_limit"("p_key_id" "uuid", OUT "allowed" boolean, OUT "remaining" integer, OUT "reset_at" timestamp with time zone, OUT "current_count" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_and_increment_rate_limit"("p_key_id" "uuid", OUT "allowed" boolean, OUT "remaining" integer, OUT "reset_at" timestamp with time zone, OUT "current_count" integer) IS 'Atomically checks and increments API key rate limit counter using row-level locking to prevent race conditions';



CREATE OR REPLACE FUNCTION "public"."check_tenant_limits"("org_id" "uuid", "limit_type" character varying) RETURNS boolean
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
    org_record organizations%ROWTYPE;
    current_month DATE;
    usage_record tenant_usage%ROWTYPE;
BEGIN
    SELECT * INTO org_record FROM organizations WHERE id = org_id;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    IF org_record.status != 'active' THEN RETURN FALSE; END IF;
    current_month := DATE_TRUNC('month', NOW());
    SELECT * INTO usage_record FROM tenant_usage WHERE organization_id = org_id AND month_year = current_month;
    CASE limit_type
        WHEN 'assessments' THEN RETURN COALESCE(usage_record.assessments_created, 0) < org_record.max_assessments_per_month;
        WHEN 'users' THEN RETURN (SELECT COUNT(*) FROM profiles WHERE organization_id = org_id AND is_active = TRUE) < org_record.max_users;
        ELSE RETURN TRUE;
    END CASE;
END;
$$;


ALTER FUNCTION "public"."check_tenant_limits"("org_id" "uuid", "limit_type" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_expired_notifications"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_notifications"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_opportunity_to_job"("p_opportunity_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_opp        RECORD;
  v_customer   RECORD;
  v_existing   uuid;
  v_job_number text;
  v_address    text;
  v_job_id     uuid;
BEGIN
  SELECT * INTO v_opp FROM opportunities WHERE id = p_opportunity_id;
  IF v_opp.id IS NULL THEN
    RAISE EXCEPTION 'Opportunity not found';
  END IF;

  IF v_opp.job_id IS NOT NULL THEN
    RETURN v_opp.job_id;
  END IF;
  SELECT id INTO v_existing FROM jobs WHERE opportunity_id = p_opportunity_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_opp.customer_id;

  v_address := COALESCE(
    NULLIF(v_opp.service_address_line1, ''),
    NULLIF(v_customer.address_line1, ''),
    'Address pending — set when scheduling'
  );

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-'
                  || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  INSERT INTO jobs (
    organization_id, customer_id, opportunity_id,
    job_number, name, status,
    scheduled_start_date, job_address, job_city, job_state, job_zip,
    created_by
  ) VALUES (
    v_opp.organization_id, v_opp.customer_id, v_opp.id,
    v_job_number,
    COALESCE(NULLIF(v_opp.name, ''), 'Job from opportunity'),
    'scheduled',
    CURRENT_DATE,
    v_address,
    COALESCE(NULLIF(v_opp.service_city, ''),  v_customer.city),
    COALESCE(NULLIF(v_opp.service_state, ''), v_customer.state),
    COALESCE(NULLIF(v_opp.service_zip, ''),   v_customer.zip),
    auth.uid()
  )
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."convert_opportunity_to_job"("p_opportunity_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_credential_types"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO credential_types (
    organization_id, name, category, applies_to, issuing_authority,
    default_valid_days, warning_lead_days,
    required_for_hazard_types, required_for_containment_levels
  ) VALUES
    (NEW.id, 'Asbestos Worker License',      'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_i','type_ii','type_iii']),
    (NEW.id, 'Asbestos Supervisor License',  'worker_license',      'worker', NULL,  365, 30, ARRAY['asbestos'], ARRAY['type_ii','type_iii']),
    (NEW.id, 'Lead (RRP) Certification',     'rrp_certification',   'worker', 'EPA', 1825, 60, ARRAY['lead'],     NULL),
    (NEW.id, 'Respirator Fit Test',          'respirator_fit_test', 'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']),
    (NEW.id, 'Medical Clearance (OSHA)',     'medical_clearance',   'worker', NULL,  365, 30, NULL,              ARRAY['type_i','type_ii','type_iii']);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_default_credential_types"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_default_pipeline_stages"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_default_pipeline_stages"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invoice_from_job"("p_job_id" "uuid", "p_due_date" "date", "p_payment_terms" "text", "p_discount_amount" numeric, "p_line_items" "jsonb", "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_customer_id uuid;
  v_job_status text;
  v_invoice_id uuid;
  v_invoice_number varchar(50);
  v_item jsonb;
  v_qty numeric;
  v_sort integer := 0;
BEGIN
  -- Lock the job row so two concurrent invoicings can't both pass the
  -- completed-status guard and each create an invoice.
  SELECT organization_id, customer_id, status
    INTO v_org_id, v_customer_id, v_job_status
  FROM jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job % not found', p_job_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Server-side enforcement of the same guard the service/UI apply: an open
  -- job's contract amount can still move, so invoicing is gated on completion.
  -- Re-checked here under the lock in case status changed since the read.
  IF v_job_status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot invoice job %: status is %, expected completed',
      p_job_id, v_job_status USING ERRCODE = 'check_violation';
  END IF;

  v_invoice_number := generate_invoice_number(v_org_id);

  INSERT INTO invoices (
    organization_id, invoice_number, customer_id, job_id,
    due_date, payment_terms, discount_amount, status, created_by
  ) VALUES (
    v_org_id, v_invoice_number, v_customer_id, p_job_id,
    p_due_date, NULLIF(p_payment_terms, ''), COALESCE(p_discount_amount, 0),
    'draft', p_created_by
  )
  RETURNING id INTO v_invoice_id;

  FOR v_item IN
    SELECT * FROM jsonb_array_elements(COALESCE(p_line_items, '[]'::jsonb))
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::numeric, 1);
    INSERT INTO invoice_line_items (
      invoice_id, description, quantity, unit, unit_price, line_total,
      source_type, source_id, sort_order
    ) VALUES (
      v_invoice_id,
      v_item->>'description',
      v_qty,
      NULLIF(v_item->>'unit', ''),
      (v_item->>'unit_price')::numeric,
      v_qty * (v_item->>'unit_price')::numeric,
      NULLIF(v_item->>'source_type', ''),
      NULLIF(v_item->>'source_id', '')::uuid,
      v_sort
    );
    v_sort := v_sort + 1;
  END LOOP;

  UPDATE jobs
  SET status = 'invoiced', updated_at = NOW()
  WHERE id = p_job_id;

  RETURN v_invoice_id;
END;
$$;


ALTER FUNCTION "public"."create_invoice_from_job"("p_job_id" "uuid", "p_due_date" "date", "p_payment_terms" "text", "p_discount_amount" numeric, "p_line_items" "jsonb", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_from_proposal"("p_proposal_id" "uuid", "p_job" "jsonb", "p_created_by" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_proposal_status text;
  v_job_id uuid;
BEGIN
  SELECT organization_id, status
    INTO v_org_id, v_proposal_status
  FROM proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal % not found', p_proposal_id USING ERRCODE = 'no_data_found';
  END IF;

  IF v_proposal_status = 'converted' THEN
    RAISE EXCEPTION 'Proposal % is already converted', p_proposal_id
      USING ERRCODE = 'unique_violation';
  END IF;

  INSERT INTO jobs (
    organization_id, job_number, customer_id, proposal_id, estimate_id,
    site_survey_id, assigned_to, scheduled_start_date, scheduled_start_time,
    estimated_duration_hours, job_address, job_city, job_state, job_zip,
    access_notes, hazard_types, contract_amount, final_amount, gate_code,
    lockbox_code, contact_onsite_name, contact_onsite_phone, status, created_by
  ) VALUES (
    v_org_id,
    p_job->>'job_number',
    (p_job->>'customer_id')::uuid,
    p_proposal_id,
    NULLIF(p_job->>'estimate_id', '')::uuid,
    NULLIF(p_job->>'site_survey_id', '')::uuid,
    NULLIF(p_job->>'assigned_to', '')::uuid,
    NULLIF(p_job->>'scheduled_start_date', '')::date,
    NULLIF(p_job->>'scheduled_start_time', '')::time,
    NULLIF(p_job->>'estimated_duration_hours', '')::numeric,
    NULLIF(p_job->>'job_address', ''),
    NULLIF(p_job->>'job_city', ''),
    NULLIF(p_job->>'job_state', ''),
    NULLIF(p_job->>'job_zip', ''),
    NULLIF(p_job->>'access_notes', ''),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_job->'hazard_types', '[]'::jsonb))), '{}'),
    NULLIF(p_job->>'contract_amount', '')::numeric,
    NULLIF(p_job->>'final_amount', '')::numeric,
    NULLIF(p_job->>'gate_code', ''),
    NULLIF(p_job->>'lockbox_code', ''),
    NULLIF(p_job->>'contact_onsite_name', ''),
    NULLIF(p_job->>'contact_onsite_phone', ''),
    'scheduled',
    p_created_by
  )
  RETURNING id INTO v_job_id;

  UPDATE proposals SET status = 'converted' WHERE id = p_proposal_id;

  RETURN v_job_id;
END;
$$;


ALTER FUNCTION "public"."create_job_from_proposal"("p_proposal_id" "uuid", "p_job" "jsonb", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_job_from_signed_proposal"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_survey RECORD;
  v_job_number TEXT;
  v_existing_job_id UUID;
BEGIN
  IF NEW.status != 'signed' OR OLD.status IS NOT DISTINCT FROM 'signed' THEN
    RETURN NEW;
  END IF;

  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_existing_job_id FROM jobs WHERE proposal_id = NEW.id LIMIT 1;
  IF v_existing_job_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.site_address, s.site_city, s.site_state, s.site_zip
    INTO v_survey
  FROM estimates e
  JOIN site_surveys s ON s.id = e.site_survey_id
  WHERE e.id = NEW.estimate_id;

  v_job_number := 'JOB-' || to_char(NOW(), 'MMDDYYYY') || '-' || substr(encode(extensions.gen_random_bytes(3), 'hex'), 1, 6);

  INSERT INTO jobs (
    organization_id, customer_id, estimate_id, proposal_id,
    job_number, name, status,
    scheduled_start_date, job_address, job_city, job_state, job_zip
  ) VALUES (
    NEW.organization_id, NEW.customer_id, NEW.estimate_id, NEW.id,
    v_job_number,
    'Job from proposal ' || NEW.proposal_number,
    'scheduled',
    CURRENT_DATE + 3,
    COALESCE(v_survey.site_address, 'Address pending -- see proposal ' || NEW.proposal_number),
    v_survey.site_city, v_survey.site_state, v_survey.site_zip
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_job_from_signed_proposal"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text",
    "entity_type" character varying(50),
    "entity_id" "uuid",
    "action_url" "text",
    "action_label" character varying(100),
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "email_sent" boolean DEFAULT false,
    "email_sent_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Notification types:
- job_assigned: When a crew member is assigned to a job
- job_completed: When a job is marked as completed
- job_completion_review: When a completion needs admin review
- proposal_signed: When a customer signs a proposal
- proposal_viewed: When a customer views a proposal
- invoice_paid: When an invoice is paid
- invoice_overdue: When an invoice becomes overdue
- invoice_viewed: When a customer views an invoice
- feedback_received: When customer feedback is submitted
- testimonial_pending: When a testimonial needs approval
- system: System announcements
- reminder: Scheduled reminders';



CREATE OR REPLACE FUNCTION "public"."create_notification_for_role"("p_organization_id" "uuid", "p_role" character varying, "p_type" character varying, "p_title" character varying, "p_message" "text" DEFAULT NULL::"text", "p_entity_type" character varying DEFAULT NULL::character varying, "p_entity_id" "uuid" DEFAULT NULL::"uuid", "p_action_url" "text" DEFAULT NULL::"text", "p_priority" character varying DEFAULT 'normal'::character varying) RETURNS SETOF "public"."notifications"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  FOR v_user_id IN
    SELECT id FROM profiles
    WHERE organization_id = p_organization_id
    AND role = p_role
  LOOP
    RETURN QUERY
    INSERT INTO notifications (
      organization_id,
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      action_url,
      priority
    ) VALUES (
      p_organization_id,
      v_user_id,
      p_type,
      p_title,
      p_message,
      p_entity_type,
      p_entity_id,
      p_action_url,
      p_priority
    )
    RETURNING *;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_notification_for_role"("p_organization_id" "uuid", "p_role" character varying, "p_type" character varying, "p_title" character varying, "p_message" "text", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action_url" "text", "p_priority" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_org_ai_settings"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.organization_ai_settings (organization_id)
  VALUES (NEW.id)
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_org_ai_settings"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "address" "text",
    "city" character varying(100),
    "state" character varying(50),
    "zip" character varying(20),
    "phone" character varying(20),
    "email" character varying(255),
    "website" character varying(255),
    "license_number" character varying(100),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "subscription_tier" character varying(20) DEFAULT 'starter'::character varying,
    "trial_ends_at" timestamp with time zone,
    "max_users" integer DEFAULT 5,
    "max_assessments_per_month" integer DEFAULT 50,
    "features" "jsonb" DEFAULT '{}'::"jsonb",
    "billing_email" character varying(255),
    "billing_address" "jsonb",
    "ai_features_enabled" boolean DEFAULT false,
    "ai_consent_date" timestamp with time zone,
    "ai_consent_user_id" "uuid",
    "stripe_customer_id" character varying(100),
    "subscription_status" character varying(50) DEFAULT 'trialing'::character varying,
    "is_platform_admin" boolean DEFAULT false,
    "white_label_enabled" boolean DEFAULT false,
    "white_label_config" "jsonb" DEFAULT '{}'::"jsonb",
    "timezone" "text" DEFAULT 'America/Chicago'::"text" NOT NULL,
    "email_from_name" "text",
    "email_reply_to" "text",
    "email_domain" "text",
    "email_domain_status" "text",
    "email_domain_provider_id" "text",
    "email_domain_records" "jsonb",
    "email_domain_verified_at" timestamp with time zone,
    "photo_retention_days" integer DEFAULT 1095 NOT NULL,
    "billing_managed_externally" boolean DEFAULT false NOT NULL,
    "email_header_color" character varying(20),
    "email_accent_color" character varying(20),
    "email_logo_url" "text",
    "email_signature" "text",
    "opp_defaults" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "credential_assignment_enforcement" "text" DEFAULT 'warn'::"text" NOT NULL,
    CONSTRAINT "organizations_credential_assignment_enforcement_check" CHECK (("credential_assignment_enforcement" = ANY (ARRAY['warn'::"text", 'block'::"text"]))),
    CONSTRAINT "organizations_email_domain_status_check" CHECK ((("email_domain_status" IS NULL) OR ("email_domain_status" = ANY (ARRAY['pending'::"text", 'verified'::"text", 'failed'::"text"])))),
    CONSTRAINT "organizations_photo_retention_days_check" CHECK ((("photo_retention_days" >= 90) AND ("photo_retention_days" <= 3650))),
    CONSTRAINT "organizations_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'suspended'::character varying, 'cancelled'::character varying, 'trial'::character varying])::"text"[]))),
    CONSTRAINT "organizations_subscription_tier_check" CHECK ((("subscription_tier")::"text" = ANY ((ARRAY['trial'::character varying, 'starter'::character varying, 'professional'::character varying, 'enterprise'::character varying])::"text"[])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."organizations"."photo_retention_days" IS 'How long survey photos (originals + stamped) are retained before deletion. Default 3 years (1095 days). Min 90, max 3650.';



COMMENT ON COLUMN "public"."organizations"."billing_managed_externally" IS 'When TRUE, the in-app Billing settings tab is hidden for this organization. Used for customers on custom billing arrangements outside the standard SaaS flow.';



COMMENT ON COLUMN "public"."organizations"."email_header_color" IS 'Hex color for the banner at the top of emails (e.g. #f97316). Falls back to a neutral default when null.';



COMMENT ON COLUMN "public"."organizations"."email_accent_color" IS 'Hex color for CTA buttons in emails. Falls back to header color when null.';



COMMENT ON COLUMN "public"."organizations"."email_logo_url" IS 'URL of an image to render in the email header. Falls back to text-only header when null.';



COMMENT ON COLUMN "public"."organizations"."email_signature" IS 'Free-text signature appended below every email body — typically address, phone, license number.';



COMMENT ON COLUMN "public"."organizations"."opp_defaults" IS 'OPP wizard boilerplate. Keys: containment, ventilation, work_practices, final_cleaning.';



CREATE OR REPLACE FUNCTION "public"."create_organization_for_onboarding"("p_org" "jsonb") RETURNS "public"."organizations"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_org_id uuid;
  v_org_id uuid := gen_random_uuid();
  v_org organizations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT organization_id INTO v_existing_org_id
  FROM profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_existing_org_id IS NOT NULL THEN
    RAISE EXCEPTION 'User already belongs to an organization' USING ERRCODE = 'unique_violation';
  END IF;

  -- INSERT without RETURNING: only the INSERT WITH CHECK is evaluated here,
  -- not the SELECT policy. (RETURNING would apply the SELECT policy, which the
  -- caller can't satisfy until their profile is linked below.)
  INSERT INTO organizations (
    id, name, email, phone, address, city, state, zip, license_number,
    status, subscription_tier
  ) VALUES (
    v_org_id,
    p_org->>'name',
    COALESCE(NULLIF(p_org->>'email', ''), NULL),
    NULLIF(p_org->>'phone', ''),
    NULLIF(p_org->>'address', ''),
    NULLIF(p_org->>'city', ''),
    NULLIF(p_org->>'state', ''),
    NULLIF(p_org->>'zip', ''),
    NULLIF(p_org->>'license_number', ''),
    'active',
    'trial'
  );

  -- Link the caller to the new org. Now get_user_organization_id() resolves to
  -- v_org_id for this caller, so the org is visible to the SELECT below.
  UPDATE profiles
  SET organization_id = v_org_id, role = 'tenant_owner'
  WHERE id = v_user_id;

  SELECT * INTO v_org FROM organizations WHERE id = v_org_id;
  RETURN v_org;
END;
$$;


ALTER FUNCTION "public"."create_organization_for_onboarding"("p_org" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cron_has_recent_problem"("cron_name_in" "text", "sla_minutes" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  last_ok TIMESTAMPTZ;
  last_status TEXT;
BEGIN
  SELECT MAX(started_at) INTO last_ok
  FROM cron_runs
  WHERE cron_name = cron_name_in AND status = 'ok';

  IF last_ok IS NULL OR last_ok < NOW() - (sla_minutes || ' minutes')::INTERVAL THEN
    RETURN TRUE;
  END IF;

  SELECT status INTO last_status
  FROM cron_runs
  WHERE cron_name = cron_name_in
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN last_status IN ('failed', 'partial');
END;
$$;


ALTER FUNCTION "public"."cron_has_recent_problem"("cron_name_in" "text", "sla_minutes" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."dashboard_previous_outstanding_ar"("p_org" "uuid", "p_invoice_cutoff" timestamp with time zone, "p_payment_cutoff" "date") RETURNS numeric
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(SUM(GREATEST(inv.total - COALESCE(pay.paid, 0), 0)), 0)
  FROM invoices inv
  LEFT JOIN (
    SELECT invoice_id, SUM(amount) AS paid
    FROM payments
    WHERE organization_id = p_org
      AND payment_date <= p_payment_cutoff
    GROUP BY invoice_id
  ) pay ON pay.invoice_id = inv.id
  WHERE inv.organization_id = p_org
    AND inv.created_at <= p_invoice_cutoff
    AND inv.status <> 'void';
$$;


ALTER FUNCTION "public"."dashboard_previous_outstanding_ar"("p_org" "uuid", "p_invoice_cutoff" timestamp with time zone, "p_payment_cutoff" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_admin_for_address_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  role_name TEXT := get_user_role();
  col TEXT;
  old_row JSONB := to_jsonb(OLD);
  new_row JSONB := to_jsonb(NEW);
BEGIN
  -- Admin-or-above, or no session at all (service role / system), can edit.
  IF role_name IS NULL
    OR role_name IN ('admin', 'tenant_owner', 'platform_owner', 'platform_admin')
  THEN
    RETURN NEW;
  END IF;

  -- Otherwise, scan the address columns this trigger was configured with and
  -- reject the update if any of them actually changed.
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF (old_row ->> col) IS DISTINCT FROM (new_row ->> col) THEN
      RAISE EXCEPTION 'Only admins can change addresses (attempted to change % on %)', col, TG_TABLE_NAME
        USING ERRCODE = '42501',
              HINT = 'Ask your office manager or company owner to update this address.';
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_admin_for_address_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_commission_period_lock"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."enforce_commission_period_lock"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_invoice_content_locked"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF OLD.status <> 'draft' AND (
       NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
    OR NEW.tax_rate        IS DISTINCT FROM OLD.tax_rate
    OR NEW.due_date        IS DISTINCT FROM OLD.due_date
    OR NEW.invoice_date    IS DISTINCT FROM OLD.invoice_date
    OR NEW.customer_id     IS DISTINCT FROM OLD.customer_id
    OR NEW.job_id          IS DISTINCT FROM OLD.job_id
  ) THEN
    RAISE EXCEPTION
      'Invoice % is finalized (status: %); its amounts and dates cannot be edited. Void the invoice and issue a new one instead.',
      OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enforce_invoice_content_locked"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_invoice_line_items_locked"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  v_invoice_id uuid;
  v_status text;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT status INTO v_status FROM public.invoices WHERE id = v_invoice_id;

  -- If the parent invoice no longer exists (nothing to protect) allow it.
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION
      'Invoice % is finalized (status: %); its line items cannot be added, changed, or removed. Void the invoice and issue a new one instead.',
      v_invoice_id, v_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."enforce_invoice_line_items_locked"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_primary_contact"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."ensure_primary_contact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_access_token"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;


ALTER FUNCTION "public"."generate_access_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_estimate_number"("org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'EST') INTO prefix
  FROM organizations WHERE id = org_id;

  SELECT COALESCE(MAX(
    CASE
      WHEN estimate_number ~ '^[A-Z]+-[0-9]+$'
      THEN CAST(SPLIT_PART(estimate_number, '-', 2) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM estimates WHERE organization_id = org_id;

  result := prefix || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN result;
END;
$_$;


ALTER FUNCTION "public"."generate_estimate_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_feedback_token"() RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_feedback_token"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invoice_number"("org_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_invoice_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_job_number"("org_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."generate_job_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $_$
DECLARE
  year_str TEXT := to_char(NOW(), 'YYYY');
  next_seq INTEGER;
  prefix TEXT := 'LR-' || year_str || '-';
BEGIN
  SELECT COALESCE(
    MAX((regexp_replace(report_number, '^' || prefix, ''))::INTEGER),
    0
  ) + 1
  INTO next_seq
  FROM lab_reports
  WHERE organization_id = org_id
    AND report_number LIKE prefix || '%'
    AND report_number ~ ('^' || prefix || '\d+$');

  RETURN prefix || lpad(next_seq::TEXT, 3, '0');
END;
$_$;


ALTER FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_proposal_number"("org_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  prefix TEXT;
  next_num INTEGER;
  result TEXT;
BEGIN
  SELECT COALESCE(UPPER(LEFT(name, 3)), 'PRO') INTO prefix
  FROM organizations WHERE id = org_id;

  SELECT COALESCE(MAX(
    CASE
      WHEN proposal_number ~ '^[A-Z]+-P[0-9]+$'
      THEN CAST(SUBSTRING(SPLIT_PART(proposal_number, '-P', 2) FROM '[0-9]+') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num
  FROM proposals WHERE organization_id = org_id;

  result := prefix || '-P' || LPAD(next_num::TEXT, 5, '0');
  RETURN result;
END;
$_$;


ALTER FUNCTION "public"."generate_proposal_number"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_work_order_number"("p_organization_id" "uuid", "p_job_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  base TEXT;
  est_number TEXT;
  job_num TEXT;
  candidate TEXT;
  suffix INT := 2;
BEGIN
  -- Prefer the estimate's number — EST-1210-4212026 → WO-1210-4212026.
  SELECT e.estimate_number
    INTO est_number
    FROM public.jobs j
    LEFT JOIN public.estimates e ON e.id = j.estimate_id
    WHERE j.id = p_job_id;

  IF est_number IS NOT NULL AND est_number LIKE 'EST-%' THEN
    base := 'WO-' || SUBSTRING(est_number FROM 5);
  ELSE
    SELECT job_number INTO job_num FROM public.jobs WHERE id = p_job_id;
    IF job_num IS NOT NULL AND job_num LIKE 'JOB-%' THEN
      base := 'WO-' || SUBSTRING(job_num FROM 5);
    ELSE
      base := 'WO-' || TO_CHAR(NOW(), 'MMDDYYYY');
    END IF;
  END IF;

  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public.work_orders
    WHERE organization_id = p_organization_id AND work_order_number = candidate
  ) LOOP
    candidate := base || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;


ALTER FUNCTION "public"."generate_work_order_number"("p_organization_id" "uuid", "p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
WITH scoped AS (
  SELECT e.*
  FROM public.estimates e
  WHERE e.organization_id = public.get_user_organization_id()
    AND (
      p_location_id IS NULL
      OR (p_location_id = '00000000-0000-0000-0000-000000000000'::uuid
          AND e.location_id IS NULL)
      OR e.location_id = p_location_id
    )
),
latest_per_chain AS (
  SELECT DISTINCT ON (estimate_root_id) *
  FROM scoped
  ORDER BY estimate_root_id, version DESC
),
open_set AS (
  SELECT * FROM latest_per_chain
  WHERE status IN ('draft','pending_approval','approved','sent','accepted')
),
decided_set AS (
  SELECT id, status
  FROM latest_per_chain
  WHERE status IN ('sent','accepted','rejected','expired','converted')
),
decided_with_jobs AS (
  -- "Won" = decided estimate that produced a non-cancelled job. Counts
  -- the chain once even if it has multiple jobs attached.
  SELECT DISTINCT d.id
  FROM decided_set d
  JOIN public.jobs j ON j.estimate_id = d.id
  WHERE j.status <> 'cancelled'
)
SELECT jsonb_build_object(
  'open',         (SELECT COUNT(*) FROM open_set),
  'draft',        (SELECT COUNT(*) FROM latest_per_chain WHERE status = 'draft'),
  'overdue',      (SELECT COUNT(*) FROM latest_per_chain
                   WHERE status = 'sent'
                     AND valid_until IS NOT NULL
                     AND valid_until < CURRENT_DATE),
  'win_rate',     CASE
                    WHEN (SELECT COUNT(*) FROM decided_set) = 0 THEN 0
                    ELSE LEAST(
                      100,
                      ROUND(
                        100.0 * (SELECT COUNT(*) FROM decided_with_jobs)
                              / (SELECT COUNT(*) FROM decided_set)
                      )::int
                    )
                  END,
  'avg_value',    COALESCE(
                    (SELECT AVG(total) FROM open_set WHERE total > 0),
                    0
                  ),
  'total_value',  COALESCE((SELECT SUM(total) FROM open_set), 0),
  'total_count',  (SELECT COUNT(*) FROM latest_per_chain)
);
$$;


ALTER FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid") IS 'Aggregated estimate metrics for the Estimates list KPIs. Scoped to the caller''s organization. Pass NULL for all locations, the zero-uuid sentinel for ''unassigned'', or a location_id to scope further.';



CREATE OR REPLACE FUNCTION "public"."get_feedback_stats"("org_id" "uuid") RETURNS TABLE("total_surveys" bigint, "completed_surveys" bigint, "avg_overall_rating" numeric, "avg_quality_rating" numeric, "avg_communication_rating" numeric, "avg_timeliness_rating" numeric, "nps_score" numeric, "testimonials_count" bigint, "response_rate" numeric)
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_feedback_stats"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_survey RECORD;
BEGIN
  SELECT
    fs.id,
    fs.status,
    fs.token_expires_at,
    fs.rating_overall,
    fs.rating_quality,
    fs.rating_communication,
    fs.rating_timeliness,
    fs.rating_value,
    fs.would_recommend,
    fs.likelihood_to_recommend,
    fs.feedback_text,
    fs.improvement_suggestions,
    fs.testimonial_text,
    fs.testimonial_permission,
    j.job_number,
    o.name AS organization_name,
    -- Was o.logo_url, which does not exist on organizations.
    o.email_logo_url AS organization_logo,
    c.first_name AS customer_first_name
  INTO v_survey
  FROM feedback_surveys fs
  JOIN jobs j ON j.id = fs.job_id
  JOIN organizations o ON o.id = fs.organization_id
  LEFT JOIN customers c ON c.id = fs.customer_id
  WHERE fs.access_token = p_token
    AND fs.token_expires_at > NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- Mark as viewed on first access.
  IF v_survey.status = 'sent' OR v_survey.status = 'pending' THEN
    UPDATE feedback_surveys
    SET viewed_at = NOW(),
        status = 'viewed'
    WHERE access_token = p_token;
  END IF;

  RETURN json_build_object(
    'success', true,
    'survey', json_build_object(
      'id', v_survey.id,
      'status', v_survey.status,
      'expires_at', v_survey.token_expires_at,
      'rating_overall', v_survey.rating_overall,
      'rating_quality', v_survey.rating_quality,
      'rating_communication', v_survey.rating_communication,
      'rating_timeliness', v_survey.rating_timeliness,
      'rating_value', v_survey.rating_value,
      'would_recommend', v_survey.would_recommend,
      'likelihood_to_recommend', v_survey.likelihood_to_recommend,
      'feedback_text', v_survey.feedback_text,
      'improvement_suggestions', v_survey.improvement_suggestions,
      'testimonial_text', v_survey.testimonial_text,
      'testimonial_permission', v_survey.testimonial_permission,
      'job_number', v_survey.job_number,
      'organization_name', v_survey.organization_name,
      'organization_logo', v_survey.organization_logo,
      'customer_first_name', v_survey.customer_first_name
    )
  );
EXCEPTION WHEN undefined_table THEN
  RETURN json_build_object('success', false, 'error', 'Feedback system not configured');
END;
$$;


ALTER FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invoice_for_portal"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_invoice_for_portal"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_pipeline_metrics"() RETURNS TABLE("stage_id" "uuid", "stage_name" "text", "count" bigint, "value" numeric, "weighted" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public'
    AS $$
  SELECT
    ps.id AS stage_id,
    ps.name AS stage_name,
    COUNT(o.id) AS count,
    COALESCE(SUM(o.estimated_value), 0) AS value,
    COALESCE(SUM(o.weighted_value), 0) AS weighted
  FROM public.pipeline_stages ps
  LEFT JOIN public.opportunities o
    ON o.stage_id = ps.id
   AND o.organization_id = ps.organization_id
   AND o.outcome IS NULL
  WHERE ps.organization_id = get_user_organization_id()
  GROUP BY ps.id, ps.name, ps.sort_order
  ORDER BY ps.sort_order;
$$;


ALTER FUNCTION "public"."get_pipeline_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_proposal_by_token"("p_token" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_proposal proposals%ROWTYPE;
  v_result JSONB;
BEGIN
  IF p_token IS NULL OR btrim(p_token) = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_proposal FROM proposals WHERE access_token = p_token;

  IF v_proposal.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_proposal.access_token_expires_at IS NULL
     OR v_proposal.access_token_expires_at <= now() THEN
    RETURN jsonb_build_object('expired', true);
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'proposal_number', p.proposal_number,
    'status', p.status,
    'access_token_expires_at', p.access_token_expires_at,
    'cover_letter', p.cover_letter,
    'terms_and_conditions', p.terms_and_conditions,
    'payment_terms', p.payment_terms,
    'exclusions', p.exclusions,
    'inclusions', p.inclusions,
    'valid_until', p.valid_until,
    'sent_at', p.sent_at,
    'signed_at', p.signed_at,
    'signer_name', p.signer_name,
    'viewed_count', p.viewed_count,
    'estimate', CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', e.id,
      'estimate_number', e.estimate_number,
      'project_name', e.project_name,
      'scope_of_work', e.scope_of_work,
      'subtotal', e.subtotal,
      'markup_percent', e.markup_percent,
      'markup_amount', e.markup_amount,
      'discount_percent', e.discount_percent,
      'discount_amount', e.discount_amount,
      'tax_percent', e.tax_percent,
      'tax_amount', e.tax_amount,
      'total', e.total,
      'estimated_duration_days', e.estimated_duration_days,
      'estimated_start_date', e.estimated_start_date,
      'estimated_end_date', e.estimated_end_date,
      'site_survey', CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', s.id,
        'job_name', s.job_name,
        'site_address', s.site_address,
        'site_city', s.site_city,
        'site_state', s.site_state,
        'site_zip', s.site_zip,
        'hazard_type', s.hazard_type
      ) END,
      'line_items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', li.id,
          'item_type', li.item_type,
          'category', li.category,
          'description', li.description,
          'quantity', li.quantity,
          'unit', li.unit,
          'unit_price', li.unit_price,
          'total_price', li.total_price,
          'is_optional', li.is_optional,
          'is_included', li.is_included,
          'sort_order', li.sort_order
        ) ORDER BY li.sort_order)
        FROM estimate_line_items li WHERE li.estimate_id = e.id
      ), '[]'::jsonb)
    ) END,
    'customer', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', c.id,
      'company_name', c.company_name,
      'first_name', c.first_name,
      'last_name', c.last_name,
      'email', c.email,
      'phone', c.phone
    ) END,
    'organization', CASE WHEN o.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', o.id,
      'name', o.name,
      'address', o.address,
      'city', o.city,
      'state', o.state,
      'zip', o.zip,
      'phone', o.phone,
      'email', o.email,
      'website', o.website
    ) END
  )
  INTO v_result
  FROM proposals p
  LEFT JOIN estimates e ON e.id = p.estimate_id
  LEFT JOIN site_surveys s ON s.id = e.site_survey_id
  LEFT JOIN customers c ON c.id = p.customer_id
  LEFT JOIN organizations o ON o.id = p.organization_id
  WHERE p.id = v_proposal.id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_proposal_by_token"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_top_slow_queries"("order_by" "text" DEFAULT 'total_time'::"text", "limit_n" integer DEFAULT 50) RETURNS TABLE("query" "text", "calls" bigint, "total_exec_ms" double precision, "mean_exec_ms" double precision, "min_exec_ms" double precision, "max_exec_ms" double precision, "stddev_exec_ms" double precision, "rows_returned" bigint, "shared_blks_hit" bigint, "shared_blks_read" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $_$
BEGIN
  -- Whitelist the order_by argument so the dynamic SQL can't be coerced
  -- into anything unexpected.
  IF order_by NOT IN ('total_time', 'mean_time', 'calls', 'max_time') THEN
    RAISE EXCEPTION 'Invalid order_by: %', order_by;
  END IF;

  IF limit_n < 1 OR limit_n > 500 THEN
    RAISE EXCEPTION 'limit_n must be between 1 and 500';
  END IF;

  RETURN QUERY EXECUTE format($q$
    SELECT
      pss.query,
      pss.calls,
      pss.total_exec_time     AS total_exec_ms,
      pss.mean_exec_time      AS mean_exec_ms,
      pss.min_exec_time       AS min_exec_ms,
      pss.max_exec_time       AS max_exec_ms,
      pss.stddev_exec_time    AS stddev_exec_ms,
      pss.rows                AS rows_returned,
      pss.shared_blks_hit,
      pss.shared_blks_read
    FROM pg_stat_statements pss
    JOIN pg_database d ON d.oid = pss.dbid
    WHERE d.datname = current_database()
      -- Hide pg_stat_statements meta-queries (admin/maintenance noise).
      AND pss.query NOT ILIKE '%%pg_stat_statements%%'
      AND pss.query NOT ILIKE '%%information_schema%%'
    ORDER BY %s DESC
    LIMIT %s
  $q$,
    CASE order_by
      WHEN 'total_time' THEN 'pss.total_exec_time'
      WHEN 'mean_time'  THEN 'pss.mean_exec_time'
      WHEN 'max_time'   THEN 'pss.max_exec_time'
      WHEN 'calls'      THEN 'pss.calls'
    END,
    limit_n
  );
END;
$_$;


ALTER FUNCTION "public"."get_top_slow_queries"("order_by" "text", "limit_n" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_top_slow_queries"("order_by" "text", "limit_n" integer) IS 'Top N entries from pg_stat_statements for the current database. Service-role only — exposes raw query text that can include schema and partial filter context.';



CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_customer_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_jobs INT;
  v_invoices INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN OLD; -- trusted server/admin context
  END IF;

  SELECT count(*) INTO v_jobs FROM jobs WHERE customer_id = OLD.id;
  SELECT count(*) INTO v_invoices FROM invoices WHERE customer_id = OLD.id;

  IF v_jobs > 0 OR v_invoices > 0 THEN
    RAISE EXCEPTION
      'Cannot delete this contact: % job(s) and % invoice(s) are linked and would be permanently destroyed (including any disposal manifests and payments). Reassign or remove those first.',
      v_jobs, v_invoices
      USING ERRCODE = 'raise_exception';
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."guard_customer_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_site_survey_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_proposals INT;
  v_jobs INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN OLD; -- trusted server/admin context
  END IF;

  SELECT count(*) INTO v_proposals
  FROM proposals p
  JOIN estimates e ON e.id = p.estimate_id
  WHERE e.site_survey_id = OLD.id
    AND (p.signed_at IS NOT NULL OR p.status IN ('sent', 'viewed', 'signed', 'accepted'));

  SELECT count(*) INTO v_jobs
  FROM jobs j
  JOIN estimates e ON e.id = j.estimate_id
  WHERE e.site_survey_id = OLD.id;

  IF v_proposals > 0 OR v_jobs > 0 THEN
    RAISE EXCEPTION
      'Cannot delete this survey: it has produced % sent/signed proposal(s) and % job(s) that would be permanently destroyed. Delete those first if you really intend to.',
      v_proposals, v_jobs
      USING ERRCODE = 'raise_exception';
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."guard_site_survey_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_email TEXT;
    v_token TEXT;
    v_invite_id UUID;
    v_invite_org UUID;
    v_invite_role user_role;
    v_role user_role;
BEGIN
    v_email := COALESCE(NEW.email, '');
    v_first_name := NEW.raw_user_meta_data->>'first_name';
    v_last_name := NEW.raw_user_meta_data->>'last_name';
    v_token := NULLIF(btrim(COALESCE(NEW.raw_user_meta_data->>'invite_token', '')), '');

    -- Scalars, not a RECORD: these read as NULL when the SELECT is skipped.
    IF v_token IS NOT NULL THEN
        SELECT id, organization_id, role
        INTO v_invite_id, v_invite_org, v_invite_role
        FROM public.tenant_invitations
        WHERE token = v_token
          AND expires_at > NOW()
          AND accepted_at IS NULL
          AND lower(email) = lower(v_email)
        LIMIT 1;
    END IF;

    IF v_invite_id IS NOT NULL THEN
        v_role := v_invite_role;

        -- Never let an invitation confer platform access.
        IF v_role IN ('platform_owner', 'platform_admin') THEN
            RAISE WARNING 'invitation % carried privileged role %; downgraded to viewer',
                v_invite_id, v_invite_role;
            v_role := 'viewer'::user_role;
        END IF;

        INSERT INTO public.profiles (
            id, organization_id, email, first_name, last_name, role, is_platform_user
        ) VALUES (
            NEW.id,
            v_invite_org,
            v_email,
            v_first_name,
            v_last_name,
            v_role,
            (v_invite_org = '00000000-0000-0000-0000-000000000001')
        );

        UPDATE public.tenant_invitations
        SET accepted_at = NOW()
        WHERE id = v_invite_id;
    ELSE
        -- No usable invitation: profile with no organization. Onboarding
        -- assigns one when they create an org.
        INSERT INTO public.profiles (
            id, email, first_name, last_name, role, is_platform_user
        ) VALUES (
            NEW.id,
            v_email,
            v_first_name,
            v_last_name,
            'estimator'::user_role,
            FALSE
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  inserted INTEGER;
  cat CONSTANT TEXT := 'nari-madison';
  src CONSTANT TEXT := 'nari-madison-2026';
BEGIN
  -- Verify the caller actually belongs to this org. Avoids letting a
  -- compromised session seed events into someone else's calendar.
  IF p_organization_id <> get_user_organization_id() THEN
    RAISE EXCEPTION 'Cannot seed events for an organization you do not belong to';
  END IF;

  INSERT INTO industry_events (
    organization_id, category, title, start_at, end_at, all_day,
    location, description, registration_url, source, source_ref
  )
  VALUES
    -- Jan 24–25: Build & Remodel Expo (2-day all-weekend event)
    (p_organization_id, cat, 'Build & Remodel Expo',
     '2026-01-24 00:00:00-06', '2026-01-25 23:59:59-06', true,
     'Madison Marriott West Convention Center',
     'All weekend event', 'https://narimadison.org', src, 'expo-jan'),

    -- Feb 16: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-02-16 10:30:00-06', '2026-02-16 13:00:00-06', false,
     'Madison Marriott West',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-feb'),

    -- Mar 1–7: Women in Construction Week (full week)
    (p_organization_id, cat, 'Women in Construction Week',
     '2026-03-01 00:00:00-06', '2026-03-07 23:59:59-06', true,
     NULL, 'Industry awareness week',
     'https://narimadison.org', src, 'wic-week'),

    -- Mar 5: Women in Construction Wisconsin BuildX Conference
    (p_organization_id, cat, 'Women in Construction Wisconsin BuildX Conference',
     '2026-03-05 08:00:00-06', '2026-03-05 17:00:00-06', false,
     'Monona Terrace, Madison', NULL,
     'https://narimadison.org', src, 'buildx'),

    -- Mar 16: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-03-16 16:30:00-05', '2026-03-16 19:30:00-05', false,
     'Madison Marriott West',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-mar'),

    -- Apr 9: Trivia Night
    (p_organization_id, cat, 'Trivia Night',
     '2026-04-09 18:00:00-05', '2026-04-09 21:00:00-05', false,
     'Walk Your Plans', 'Evening event',
     'https://narimadison.org', src, 'trivia'),

    -- Apr 20: General Membership Meeting / Networking (lunch, no workshop)
    (p_organization_id, cat, 'General Membership Meeting / Networking Event',
     '2026-04-20 11:30:00-05', '2026-04-20 13:00:00-05', false,
     'Kitchen Ideas Center',
     'Lunch event – No workshop – 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-apr'),

    -- May (whole month): Home Improvement Month
    (p_organization_id, cat, 'Home Improvement Month',
     '2026-05-01 00:00:00-05', '2026-05-31 23:59:59-05', true,
     NULL, 'Industry awareness month',
     'https://narimadison.org', src, 'him-month'),

    -- May 1: Spring Sporting Clay Event (all day)
    (p_organization_id, cat, 'Spring Sporting Clay Event',
     '2026-05-01 08:00:00-05', '2026-05-01 17:00:00-05', false,
     'Milford Hills', 'All day event',
     'https://narimadison.org', src, 'clay-spring'),

    -- May 18: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-05-18 16:30:00-05', '2026-05-18 19:30:00-05', false,
     'Ferguson Home',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-may'),

    -- Jun 12: Golf Outing (all day)
    (p_organization_id, cat, 'Golf Outing',
     '2026-06-12 08:00:00-05', '2026-06-12 17:00:00-05', false,
     'The Oaks Golf Course', 'All day event',
     'https://narimadison.org', src, 'golf'),

    -- Jul 20: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-07-20 10:30:00-05', '2026-07-20 13:00:00-05', false,
     'Madison Marriott West',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-jul'),

    -- Aug 17: NARI Networking Night (4–7 pm)
    (p_organization_id, cat, 'NARI Networking Night',
     '2026-08-17 16:00:00-05', '2026-08-17 19:00:00-05', false,
     'Wisconsin Brewing Company', 'Open House 4–7 pm',
     'https://narimadison.org', src, 'networking-night'),

    -- Sep 21: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-09-21 10:30:00-05', '2026-09-21 13:00:00-05', false,
     'Gerhard''s Kitchen & Bath Store',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-sep'),

    -- Sep 25: Fall Sporting Clay Event (all day)
    (p_organization_id, cat, 'Fall Sporting Clay Event',
     '2026-09-25 08:00:00-05', '2026-09-25 17:00:00-05', false,
     'Milford Hills', 'All day event',
     'https://narimadison.org', src, 'clay-fall'),

    -- Oct 8: RotY (Remodeler of the Year) Award Entries Due
    (p_organization_id, cat, 'RotY Award Entries Due',
     '2026-10-08 00:00:00-05', '2026-10-08 23:59:59-05', true,
     NULL, 'Remodeler of the Year award entries due',
     'https://narimadison.org', src, 'roty-due'),

    -- Oct 19: General Membership Meeting (dinner)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-10-19 16:30:00-05', '2026-10-19 19:30:00-05', false,
     'Madison Marriott West',
     'Dinner event – 4:30 pm workshop and 5:30 pm dinner',
     'https://narimadison.org', src, 'gmm-oct'),

    -- Nov 9: General Membership Meeting (lunch)
    (p_organization_id, cat, 'General Membership Meeting',
     '2026-11-09 10:30:00-06', '2026-11-09 13:00:00-06', false,
     'DoubleTree by Hilton Madison East',
     'Lunch event – 10:30 am workshop and 11:30 am lunch',
     'https://narimadison.org', src, 'gmm-nov'),

    -- Nov 19: Celebrating Excellence Awards Event
    (p_organization_id, cat, 'Celebrating Excellence Awards Event',
     '2026-11-19 18:00:00-06', '2026-11-19 21:00:00-06', false,
     'Madison Marriott West', 'Evening event',
     'https://narimadison.org', src, 'awards'),

    -- Dec 14: Annual Meeting and Vendor Fair Event
    (p_organization_id, cat, 'Annual Meeting and Vendor Fair',
     '2026-12-14 18:00:00-06', '2026-12-14 21:00:00-06', false,
     'Madison Marriott West', 'Evening event',
     'https://narimadison.org', src, 'annual-meeting')
  ON CONFLICT (organization_id, source, source_ref) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$;


ALTER FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") IS 'Idempotent seed: NARI of Madison 2026 calendar (18 events). Callable from authenticated requests for the caller''s own organization only.';



CREATE OR REPLACE FUNCTION "public"."increment_jobs_count"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.organization_subscriptions
  SET jobs_this_month = jobs_this_month + 1,
      updated_at = NOW()
  WHERE organization_id = org_id;
END;
$$;


ALTER FUNCTION "public"."increment_jobs_count"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_tenant_usage"("p_organization_id" "uuid", "p_metric" character varying, "p_increment" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_current_month VARCHAR(7);
BEGIN
  v_current_month := to_char(NOW(), 'YYYY-MM');

  INSERT INTO tenant_usage (organization_id, month, metric, usage_count, last_updated)
  VALUES (p_organization_id, v_current_month, p_metric, p_increment, NOW())
  ON CONFLICT (organization_id, month, metric)
  DO UPDATE SET
    usage_count = tenant_usage.usage_count + p_increment,
    last_updated = NOW();
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, silently ignore
  NULL;
END;
$$;


ALTER FUNCTION "public"."increment_tenant_usage"("p_organization_id" "uuid", "p_metric" character varying, "p_increment" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inherit_creator_default_location"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.location_id IS NULL AND auth.uid() IS NOT NULL THEN
    SELECT default_location_id INTO NEW.location_id
    FROM profiles
    WHERE id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."inherit_creator_default_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inherit_job_attribution"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_opp RECORD;
BEGIN
  -- Only on insert, and only if attribution fields are empty
  IF TG_OP = 'INSERT' AND NEW.first_touch_source IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    SELECT
      lead_source, lead_source_detail,
      first_touch_source, first_touch_medium, first_touch_campaign,
      last_touch_source, last_touch_medium, last_touch_campaign,
      converting_touch_source, converting_touch_medium, converting_touch_campaign,
      first_touch_date
    INTO v_opp
    FROM opportunities WHERE id = NEW.opportunity_id;

    NEW.lead_source := COALESCE(NEW.lead_source, v_opp.lead_source);
    NEW.attributed_lead_source := COALESCE(NEW.attributed_lead_source, v_opp.lead_source);
    NEW.attributed_lead_source_detail := COALESCE(NEW.attributed_lead_source_detail, v_opp.lead_source_detail);
    NEW.first_touch_source := v_opp.first_touch_source;
    NEW.first_touch_medium := v_opp.first_touch_medium;
    NEW.first_touch_campaign := v_opp.first_touch_campaign;
    NEW.last_touch_source := v_opp.last_touch_source;
    NEW.last_touch_medium := v_opp.last_touch_medium;
    NEW.last_touch_campaign := v_opp.last_touch_campaign;
    NEW.converting_touch_source := v_opp.converting_touch_source;
    NEW.converting_touch_medium := v_opp.converting_touch_medium;
    NEW.converting_touch_campaign := v_opp.converting_touch_campaign;
  END IF;

  -- Inherit company from opportunity if not set
  IF NEW.company_id IS NULL AND NEW.opportunity_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id FROM opportunities WHERE id = NEW.opportunity_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."inherit_job_attribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."inherit_opportunity_attribution"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_contact RECORD;
  v_company RECORD;
BEGIN
  -- Only on insert, and only if first_touch fields are empty
  IF TG_OP = 'INSERT' AND NEW.first_touch_source IS NULL THEN
    -- Try contact first
    IF NEW.customer_id IS NOT NULL THEN
      SELECT lead_source, lead_source_detail, utm_source, utm_medium, utm_campaign, first_touch_date
      INTO v_contact
      FROM customers WHERE id = NEW.customer_id;

      NEW.lead_source := COALESCE(NEW.lead_source, v_contact.lead_source);
      NEW.lead_source_detail := COALESCE(NEW.lead_source_detail, v_contact.lead_source_detail);
      NEW.first_touch_source := COALESCE(NEW.first_touch_source, v_contact.utm_source);
      NEW.first_touch_medium := COALESCE(NEW.first_touch_medium, v_contact.utm_medium);
      NEW.first_touch_campaign := COALESCE(NEW.first_touch_campaign, v_contact.utm_campaign);
      NEW.first_touch_date := COALESCE(NEW.first_touch_date, v_contact.first_touch_date);
    END IF;

    -- Then try company (fills any remaining gaps)
    IF NEW.company_id IS NOT NULL THEN
      SELECT lead_source, lead_source_detail, utm_source, utm_medium, utm_campaign, first_touch_date
      INTO v_company
      FROM companies WHERE id = NEW.company_id;

      NEW.lead_source := COALESCE(NEW.lead_source, v_company.lead_source);
      NEW.lead_source_detail := COALESCE(NEW.lead_source_detail, v_company.lead_source_detail);
      NEW.first_touch_source := COALESCE(NEW.first_touch_source, v_company.utm_source);
      NEW.first_touch_medium := COALESCE(NEW.first_touch_medium, v_company.utm_medium);
      NEW.first_touch_campaign := COALESCE(NEW.first_touch_campaign, v_company.utm_campaign);
      NEW.first_touch_date := COALESCE(NEW.first_touch_date, v_company.first_touch_date);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."inherit_opportunity_attribution"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_job_checklist"("p_job_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."initialize_job_checklist"("p_job_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."initialize_notification_preferences"("p_user_id" "uuid", "p_org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  notification_types TEXT[] := ARRAY[
    'job_assigned',
    'job_completed',
    'job_completion_review',
    'proposal_signed',
    'proposal_viewed',
    'invoice_paid',
    'invoice_overdue',
    'invoice_viewed',
    'payment_failed',
    'feedback_received',
    'testimonial_pending',
    'sms_received',
    'system',
    'reminder'
  ];
  nt TEXT;
BEGIN
  FOREACH nt IN ARRAY notification_types
  LOOP
    INSERT INTO public.notification_preferences
      (user_id, organization_id, notification_type, in_app, email, push)
    VALUES (p_user_id, p_org_id, nt, true, true, false)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."initialize_notification_preferences"("p_user_id" "uuid", "p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_platform_user"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    is_platform BOOLEAN;
BEGIN
    SELECT COALESCE(p.is_platform_user, false) INTO is_platform
    FROM public.profiles p WHERE p.id = auth.uid();
    RETURN COALESCE(is_platform, false);
END;
$$;


ALTER FUNCTION "public"."is_platform_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_job_completion_to_job"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE jobs
     SET completion_id = NEW.id
   WHERE id = NEW.job_id
     AND completion_id IS DISTINCT FROM NEW.id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."link_job_completion_to_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_ai_usage"("p_organization_id" "uuid", "p_service_name" character varying, "p_operation" character varying, "p_provider" character varying, "p_model_version" character varying DEFAULT NULL::character varying, "p_customer_id" "uuid" DEFAULT NULL::"uuid", "p_related_entity_type" character varying DEFAULT NULL::character varying, "p_related_entity_id" "uuid" DEFAULT NULL::"uuid", "p_input_tokens" integer DEFAULT NULL::integer, "p_output_tokens" integer DEFAULT NULL::integer, "p_data_categories" "text"[] DEFAULT NULL::"text"[], "p_pii_redacted" boolean DEFAULT false, "p_processing_time_ms" integer DEFAULT NULL::integer, "p_success" boolean DEFAULT true, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_usage_log (
    organization_id,
    user_id,
    service_name,
    operation,
    provider,
    model_version,
    customer_id,
    related_entity_type,
    related_entity_id,
    input_token_count,
    output_token_count,
    data_categories,
    pii_redacted,
    processing_time_ms,
    success,
    error_message
  )
  VALUES (
    p_organization_id,
    auth.uid(),
    p_service_name,
    p_operation,
    p_provider,
    p_model_version,
    p_customer_id,
    p_related_entity_type,
    p_related_entity_id,
    p_input_tokens,
    p_output_tokens,
    p_data_categories,
    p_pii_redacted,
    p_processing_time_ms,
    p_success,
    p_error_message
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;


ALTER FUNCTION "public"."log_ai_usage"("p_organization_id" "uuid", "p_service_name" character varying, "p_operation" character varying, "p_provider" character varying, "p_model_version" character varying, "p_customer_id" "uuid", "p_related_entity_type" character varying, "p_related_entity_id" "uuid", "p_input_tokens" integer, "p_output_tokens" integer, "p_data_categories" "text"[], "p_pii_redacted" boolean, "p_processing_time_ms" integer, "p_success" boolean, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit_event"("p_organization_id" "uuid", "p_action" character varying, "p_resource_type" character varying DEFAULT NULL::character varying, "p_resource_id" "uuid" DEFAULT NULL::"uuid", "p_old_values" "jsonb" DEFAULT NULL::"jsonb", "p_new_values" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
    INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id, old_values, new_values, ip_address, created_at)
    VALUES (p_organization_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_old_values, p_new_values, inet_client_addr(), NOW());
END;
$$;


ALTER FUNCTION "public"."log_audit_event"("p_organization_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_entity_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  entity_type_name TEXT := TG_ARGV[0];
  current_user_id UUID := auth.uid();
  current_org_id UUID := get_user_organization_id();
  current_user_name TEXT;

  new_row JSONB := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  old_row JSONB := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  canonical JSONB := COALESCE(new_row, old_row);

  action_name TEXT;
  entity_name TEXT;
  entity_id_val UUID;
  changes JSONB;
BEGIN
  -- No user session → system write. Skip silently.
  IF current_user_id IS NULL OR current_org_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  action_name := CASE TG_OP
    WHEN 'INSERT' THEN 'created'
    WHEN 'UPDATE' THEN 'updated'
    WHEN 'DELETE' THEN 'deleted'
  END;

  -- For UPDATE, ignore pure updated_at bumps so cascades and trivial
  -- touches don't spam the feed.
  IF TG_OP = 'UPDATE' THEN
    SELECT jsonb_object_agg(key, value) INTO changes
    FROM jsonb_each(new_row) AS n(key, value)
    WHERE NOT (old_row ? n.key AND old_row -> n.key = n.value);

    IF changes IS NULL THEN
      RETURN NEW;
    END IF;

    changes := changes - 'updated_at';
    IF changes = '{}'::jsonb OR changes IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Resolve actor display name (nullable — the feed falls back to the id).
  SELECT full_name INTO current_user_name FROM profiles WHERE id = current_user_id;

  -- Pick a human-friendly entity_name from common columns. Each table
  -- tends to have one of these; the order matters — `name` is most
  -- common but shouldn't trump a more specific identifier like
  -- `invoice_number` for entities that have one.
  entity_name := COALESCE(
    canonical ->> 'job_number',
    canonical ->> 'invoice_number',
    canonical ->> 'estimate_number',
    canonical ->> 'proposal_number',
    canonical ->> 'change_order_number',
    canonical ->> 'name',
    canonical ->> 'title',
    canonical ->> 'address_line1',
    canonical ->> 'site_address',
    canonical ->> 'job_address',
    canonical ->> 'file_name'
  );

  entity_id_val := (canonical ->> 'id')::UUID;

  INSERT INTO activity_log (
    organization_id, user_id, user_name,
    action, entity_type, entity_id, entity_name,
    old_values, new_values
  ) VALUES (
    current_org_id,
    current_user_id,
    current_user_name,
    action_name,
    entity_type_name,
    entity_id_val,
    entity_name,
    -- For updates we only store the diff, not the whole row — activity_log
    -- isn't a backup, it's a feed. For deletes we keep the whole OLD so
    -- "what was in this thing before it was removed" is answerable.
    CASE
      WHEN TG_OP = 'INSERT' THEN NULL
      WHEN TG_OP = 'UPDATE' THEN (
        SELECT jsonb_object_agg(key, old_row -> key)
        FROM jsonb_object_keys(changes) AS k(key)
      )
      ELSE old_row
    END,
    CASE
      WHEN TG_OP = 'DELETE' THEN NULL
      WHEN TG_OP = 'UPDATE' THEN changes
      ELSE new_row
    END
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."log_entity_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_platform_access"("p_action" character varying, "p_target_org_id" "uuid", "p_resource_type" character varying, "p_resource_id" "uuid" DEFAULT NULL::"uuid", "p_details" "jsonb" DEFAULT NULL::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  INSERT INTO audit_log (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    ip_address,
    created_at
  )
  VALUES (
    p_target_org_id,
    auth.uid(),
    'platform_access:' || p_action,
    p_resource_type,
    p_resource_id,
    NULL,
    p_details,
    inet_client_addr(),
    NOW()
  );
EXCEPTION WHEN undefined_table THEN
  -- audit_log table doesn't exist yet, silently ignore
  NULL;
END;
$$;


ALTER FUNCTION "public"."log_platform_access"("p_action" character varying, "p_target_org_id" "uuid", "p_resource_type" character varying, "p_resource_id" "uuid", "p_details" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_profile_privilege_escalation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Trusted server context: no end-user JWT, or an explicitly privileged role.
  IF auth.uid() IS NULL
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'profiles.role cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'profiles.organization_id cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.is_platform_user IS DISTINCT FROM OLD.is_platform_user THEN
    RAISE EXCEPTION 'profiles.is_platform_user cannot be changed by the account holder'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_profile_privilege_escalation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_company_stats"("p_company_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."recalc_company_stats"("p_company_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_customer_stats"("p_customer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."recalc_customer_stats"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_estimate_totals"("est_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  calc_subtotal NUMERIC(12,2);
  est_record RECORD;
  calc_markup NUMERIC(12,2);
  calc_discount NUMERIC(12,2);
  calc_tax NUMERIC(12,2);
  calc_total NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO calc_subtotal
  FROM estimate_line_items
  WHERE estimate_id = est_id AND is_included = TRUE;

  SELECT * INTO est_record FROM estimates WHERE id = est_id;

  calc_markup := calc_subtotal * (COALESCE(est_record.markup_percent, 0) / 100);
  calc_discount := (calc_subtotal + calc_markup) * (COALESCE(est_record.discount_percent, 0) / 100);
  calc_tax := (calc_subtotal + calc_markup - calc_discount) * (COALESCE(est_record.tax_percent, 0) / 100);
  calc_total := calc_subtotal + calc_markup - calc_discount + calc_tax;

  UPDATE estimates SET
    subtotal = calc_subtotal,
    markup_amount = calc_markup,
    discount_amount = calc_discount,
    tax_amount = calc_tax,
    total = calc_total,
    updated_at = NOW()
  WHERE id = est_id;
END;
$$;


ALTER FUNCTION "public"."recalculate_estimate_totals"("est_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_invoice_self_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
DECLARE
  computed_tax DECIMAL(12, 2);
  computed_total DECIMAL(12, 2);
BEGIN
  -- Only act when an input that affects totals actually changed. Skip
  -- recursive updates when the trigger itself stamps total/balance_due.
  IF NEW.subtotal IS DISTINCT FROM OLD.subtotal
     OR NEW.tax_rate IS DISTINCT FROM OLD.tax_rate
     OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid
  THEN
    computed_tax := COALESCE(NEW.subtotal, 0) * COALESCE(NEW.tax_rate, 0);
    computed_total := COALESCE(NEW.subtotal, 0) + computed_tax - COALESCE(NEW.discount_amount, 0);

    NEW.tax_amount := computed_tax;
    NEW.total := computed_total;
    NEW.balance_due := computed_total - COALESCE(NEW.amount_paid, 0);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recalculate_invoice_self_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_invoice_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."recalculate_invoice_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_survey_photo_expiry_for_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.photo_retention_days IS DISTINCT FROM OLD.photo_retention_days THEN
    UPDATE survey_photos
       SET expires_at = created_at + (NEW.photo_retention_days || ' days')::INTERVAL,
           updated_at = now()
     WHERE organization_id = NEW.id
       AND tier <> 'deleted';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recompute_survey_photo_expiry_for_org"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "amount" numeric(12,2),
    "requested_by" "uuid" NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "level1_status" character varying(20) DEFAULT 'pending'::character varying,
    "level1_approver" "uuid",
    "level1_at" timestamp with time zone,
    "level1_notes" "text",
    "requires_level2" boolean DEFAULT false,
    "level2_status" character varying(20),
    "level2_approver" "uuid",
    "level2_at" timestamp with time zone,
    "level2_notes" "text",
    "final_status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."approval_requests" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_estimate_approval"("p_request_id" "uuid", "p_estimate_id" "uuid", "p_level" integer, "p_new_level_status" "text", "p_final_status" "text", "p_approver" "uuid", "p_at" timestamp with time zone, "p_notes" "text", "p_approved" boolean) RETURNS "public"."approval_requests"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request public.approval_requests;
BEGIN
  IF p_level = 1 THEN
    UPDATE public.approval_requests
       SET level1_status = p_new_level_status,
           level1_approver = p_approver,
           level1_at = p_at,
           level1_notes = p_notes,
           final_status = p_final_status
     WHERE id = p_request_id
     RETURNING * INTO v_request;
  ELSE
    UPDATE public.approval_requests
       SET level2_status = p_new_level_status,
           level2_approver = p_approver,
           level2_at = p_at,
           level2_notes = p_notes,
           final_status = p_final_status
     WHERE id = p_request_id
     RETURNING * INTO v_request;
  END IF;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Approval request % not found', p_request_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT p_approved THEN
    -- Rejected at either level: send the estimate back to draft.
    UPDATE public.estimates
       SET status = 'draft',
           approval_notes = p_notes
     WHERE id = p_estimate_id;
  ELSIF p_final_status = 'approved' THEN
    -- Final approval reached: mark the estimate approved.
    UPDATE public.estimates
       SET status = 'approved',
           approved_by = p_approver,
           approved_at = p_at,
           approval_notes = p_notes
     WHERE id = p_estimate_id;
  END IF;
  -- Level-1 approval that still needs level 2: no estimate write (forwarded).

  RETURN v_request;
END;
$$;


ALTER FUNCTION "public"."record_estimate_approval"("p_request_id" "uuid", "p_estimate_id" "uuid", "p_level" integer, "p_new_level_status" "text", "p_final_status" "text", "p_approver" "uuid", "p_at" timestamp with time zone, "p_notes" "text", "p_approved" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_date" "date", "p_payment_method" "text", "p_reference_number" "text", "p_notes" "text", "p_created_by" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_org_id uuid;
  v_job_id uuid;
  v_balance numeric;
  v_invoice_status text;
  v_payment payments;
BEGIN
  -- Lock the invoice so concurrent payments can't race the status read /
  -- paid-state side effects below. Also the source of truth for org scoping
  -- and the balance we validate against.
  SELECT organization_id, job_id, COALESCE(balance_due, total, 0)
    INTO v_org_id, v_job_id, v_balance
  FROM invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice % not found', p_invoice_id USING ERRCODE = 'no_data_found';
  END IF;

  -- Server-side overpayment guard (matches the browser dialog).
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_amount > v_balance THEN
    RAISE EXCEPTION 'Payment amount (%) exceeds the invoice balance due (%). Enter an amount up to the balance, or void and re-issue.',
      p_amount, v_balance
      USING ERRCODE = 'check_violation';
  END IF;

  INSERT INTO payments (
    organization_id, invoice_id, amount, payment_date,
    payment_method, reference_number, notes, created_by
  ) VALUES (
    v_org_id, p_invoice_id, p_amount,
    COALESCE(p_payment_date, CURRENT_DATE),
    NULLIF(p_payment_method, ''), NULLIF(p_reference_number, ''),
    NULLIF(p_notes, ''), p_created_by
  )
  RETURNING * INTO v_payment;

  -- The AFTER-INSERT trigger update_invoice_balance() has now recomputed the
  -- invoice; read the fresh status to decide the paid-state side effects.
  SELECT status INTO v_invoice_status FROM invoices WHERE id = p_invoice_id;

  IF v_invoice_status = 'paid' THEN
    UPDATE scheduled_reminders
    SET status = 'cancelled'
    WHERE related_type = 'invoice'
      AND related_id = p_invoice_id
      AND status = 'pending';

    IF v_job_id IS NOT NULL THEN
      UPDATE jobs
      SET status = 'paid', updated_at = NOW()
      WHERE id = v_job_id;
    END IF;
  END IF;

  RETURN to_jsonb(v_payment);
END;
$$;


ALTER FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_date" "date", "p_payment_method" "text", "p_reference_number" "text", "p_notes" "text", "p_created_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_proposal_view"("p_token" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE proposals
  SET
    status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
    viewed_at = CASE WHEN status = 'sent' THEN now() ELSE viewed_at END,
    viewed_count = COALESCE(viewed_count, 0) + 1,
    updated_at = now()
  WHERE access_token = p_token
    AND access_token_expires_at > now()
    AND status IN ('sent', 'viewed');
END;
$$;


ALTER FUNCTION "public"."record_proposal_view"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_report_views"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_job_costs;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_lead_source_roi;
END;
$$;


ALTER FUNCTION "public"."refresh_report_views"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_monthly_job_counts"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  UPDATE public.organization_subscriptions
  SET jobs_this_month = 0,
      updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."reset_monthly_job_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_query_performance_stats"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
BEGIN
  PERFORM pg_stat_statements_reset();
END;
$$;


ALTER FUNCTION "public"."reset_query_performance_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_query_performance_stats"() IS 'Clears the pg_stat_statements stat buffer. Useful before reproducing a regression so the top-queries view reflects only the reproduction window.';



CREATE OR REPLACE FUNCTION "public"."reset_rate_limit"("p_key_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE api_keys 
  SET 
    rate_limit_count = 0,
    rate_limit_reset_at = NULL
  WHERE id = p_key_id;
  
  RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."reset_rate_limit"("p_key_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_rate_limit"("p_key_id" "uuid") IS 'Resets the rate limit counter for an API key (admin function)';



CREATE OR REPLACE FUNCTION "public"."reset_tenant_usage"("p_organization_id" "uuid", "p_month" character varying DEFAULT NULL::character varying) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  DELETE FROM tenant_usage
  WHERE organization_id = p_organization_id
    AND (p_month IS NULL OR month = p_month);
EXCEPTION WHEN undefined_table THEN
  -- Table doesn't exist yet, silently ignore
  NULL;
END;
$$;


ALTER FUNCTION "public"."reset_tenant_usage"("p_organization_id" "uuid", "p_month" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_estimate_root_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.estimate_root_id IS NULL THEN
    IF NEW.parent_estimate_id IS NULL THEN
      NEW.estimate_root_id := NEW.id;
    ELSE
      SELECT estimate_root_id INTO NEW.estimate_root_id
      FROM public.estimates
      WHERE id = NEW.parent_estimate_id;

      IF NEW.estimate_root_id IS NULL THEN
        NEW.estimate_root_id := NEW.parent_estimate_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_estimate_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.estimates
    WHERE estimate_root_id = NEW.estimate_root_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_estimate_root_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lab_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_lab_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_survey_root_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  IF NEW.survey_root_id IS NULL THEN
    IF NEW.parent_survey_id IS NULL THEN
      NEW.survey_root_id := NEW.id;
    ELSE
      SELECT survey_root_id INTO NEW.survey_root_id
      FROM public.site_surveys
      WHERE id = NEW.parent_survey_id;

      IF NEW.survey_root_id IS NULL THEN
        NEW.survey_root_id := NEW.parent_survey_id;
      END IF;
    END IF;
  END IF;

  IF NEW.parent_survey_id IS NOT NULL AND (NEW.version IS NULL OR NEW.version = 1) THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM public.site_surveys
    WHERE survey_root_id = NEW.survey_root_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_survey_root_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_work_orders_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_work_orders_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_proposal proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_proposal FROM proposals WHERE access_token = p_token;

  IF v_proposal.id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_proposal.access_token_expires_at IS NULL
     OR v_proposal.access_token_expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  IF v_proposal.status = 'signed' THEN
    RETURN jsonb_build_object('error', 'already_signed');
  END IF;

  IF v_proposal.status NOT IN ('sent', 'viewed') THEN
    RETURN jsonb_build_object('error', 'invalid_status');
  END IF;

  UPDATE proposals
  SET
    status = 'signed',
    signed_at = now(),
    signer_name = p_signer_name,
    signer_email = p_signer_email,
    signer_ip = p_signer_ip,
    signature_data = p_signature_data,
    updated_at = now()
  WHERE id = v_proposal.id;

  UPDATE estimates SET status = 'accepted' WHERE id = v_proposal.estimate_id;

  RETURN jsonb_build_object(
    'id', v_proposal.id,
    'proposal_number', v_proposal.proposal_number,
    'estimate_id', v_proposal.estimate_id,
    'created_by', v_proposal.created_by,
    'organization_id', v_proposal.organization_id
  );
END;
$$;


ALTER FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer DEFAULT NULL::integer, "p_rating_quality" integer DEFAULT NULL::integer, "p_rating_communication" integer DEFAULT NULL::integer, "p_rating_timeliness" integer DEFAULT NULL::integer, "p_rating_value" integer DEFAULT NULL::integer, "p_would_recommend" boolean DEFAULT NULL::boolean, "p_likelihood_to_recommend" integer DEFAULT NULL::integer, "p_feedback_text" "text" DEFAULT NULL::"text", "p_improvement_suggestions" "text" DEFAULT NULL::"text", "p_testimonial_text" "text" DEFAULT NULL::"text", "p_testimonial_permission" boolean DEFAULT false, "p_ip_address" character varying DEFAULT NULL::character varying, "p_user_agent" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_survey RECORD;
  v_result JSON;
BEGIN
  -- Find and validate the survey by token
  SELECT * INTO v_survey
  FROM feedback_surveys
  WHERE access_token = p_token
    AND token_expires_at > NOW()
    AND status NOT IN ('completed', 'expired')
  FOR UPDATE;  -- Lock the row to prevent race conditions

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- Mark as viewed if first access
  IF v_survey.viewed_at IS NULL THEN
    UPDATE feedback_surveys
    SET viewed_at = NOW(),
        status = 'viewed'
    WHERE id = v_survey.id;
  END IF;

  -- Update with feedback data
  UPDATE feedback_surveys
  SET
    rating_overall = COALESCE(p_rating_overall, rating_overall),
    rating_quality = COALESCE(p_rating_quality, rating_quality),
    rating_communication = COALESCE(p_rating_communication, rating_communication),
    rating_timeliness = COALESCE(p_rating_timeliness, rating_timeliness),
    rating_value = COALESCE(p_rating_value, rating_value),
    would_recommend = COALESCE(p_would_recommend, would_recommend),
    likelihood_to_recommend = COALESCE(p_likelihood_to_recommend, likelihood_to_recommend),
    feedback_text = COALESCE(p_feedback_text, feedback_text),
    improvement_suggestions = COALESCE(p_improvement_suggestions, improvement_suggestions),
    testimonial_text = COALESCE(p_testimonial_text, testimonial_text),
    testimonial_permission = COALESCE(p_testimonial_permission, testimonial_permission),
    ip_address = COALESCE(p_ip_address, ip_address),
    user_agent = COALESCE(p_user_agent, user_agent),
    status = CASE
      WHEN p_rating_overall IS NOT NULL THEN 'completed'
      ELSE status
    END,
    completed_at = CASE
      WHEN p_rating_overall IS NOT NULL THEN NOW()
      ELSE completed_at
    END,
    updated_at = NOW()
  WHERE id = v_survey.id
  RETURNING json_build_object(
    'success', true,
    'survey_id', id,
    'status', status
  ) INTO v_result;

  RETURN v_result;
EXCEPTION WHEN undefined_table THEN
  RETURN json_build_object('success', false, 'error', 'Feedback system not configured');
END;
$$;


ALTER FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer, "p_rating_quality" integer, "p_rating_communication" integer, "p_rating_timeliness" integer, "p_rating_value" integer, "p_would_recommend" boolean, "p_likelihood_to_recommend" integer, "p_feedback_text" "text", "p_improvement_suggestions" "text", "p_testimonial_text" "text", "p_testimonial_permission" boolean, "p_ip_address" character varying, "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_opportunity_from_estimate"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_opp_id UUID;
  v_probability NUMERIC;
BEGIN
  IF NEW.site_survey_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, probability_pct INTO v_opp_id, v_probability
  FROM opportunities
  WHERE created_from_assessment_id = NEW.site_survey_id
    AND outcome IS NULL
    AND opportunity_status NOT IN ('won', 'lost')
  LIMIT 1;

  IF v_opp_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    estimate_id = NEW.id,
    estimated_value = NEW.total,
    weighted_value = CASE
      WHEN NEW.total IS NULL OR v_probability IS NULL THEN weighted_value
      ELSE NEW.total * v_probability / 100.0
    END,
    opportunity_status = CASE
      WHEN NEW.status IN ('sent', 'approved') THEN 'estimate_sent'
      ELSE opportunity_status
    END,
    estimate_sent_date = CASE
      WHEN NEW.status IN ('sent', 'approved') AND estimate_sent_date IS NULL THEN CURRENT_DATE
      ELSE estimate_sent_date
    END,
    updated_at = NOW()
  WHERE id = v_opp_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_opportunity_from_estimate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_opportunity_from_job"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.opportunity_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.opportunity_id IS NOT DISTINCT FROM NEW.opportunity_id THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    job_id = NEW.id,
    outcome = 'won',
    opportunity_status = 'won',
    actual_close_date = COALESCE(actual_close_date, CURRENT_DATE),
    estimated_value = COALESCE(NEW.contract_amount, estimated_value),
    weighted_value = COALESCE(NEW.contract_amount, weighted_value),
    updated_at = NOW()
  WHERE id = NEW.opportunity_id
    AND job_id IS NULL;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_opportunity_from_job"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_opportunity_from_survey"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.status NOT IN ('submitted', 'reviewed', 'completed') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  UPDATE opportunities
  SET
    opportunity_status = 'survey_completed',
    assessment_date = COALESCE(assessment_date, CURRENT_DATE),
    updated_at = NOW()
  WHERE created_from_assessment_id = NEW.id
    AND outcome IS NULL
    AND opportunity_status NOT IN ('won', 'lost', 'estimate_sent');

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_opportunity_from_survey"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_primary_contact"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."sync_primary_contact"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_property_contact_current"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.moved_out_date IS NOT NULL THEN
    NEW.is_current = FALSE;
    IF NEW.role = 'owner' THEN
      NEW.role = 'previous_owner';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_property_contact_current"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_email_sends_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."touch_email_sends_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_assessment_creation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(NEW.organization_id, 'assessments');
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_assessment_creation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."track_photo_upload"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    PERFORM public.update_tenant_usage(
      (SELECT organization_id FROM public.site_surveys WHERE id = NEW.site_survey_id),
      'photos'
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."track_photo_upload"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_recalculate_estimate"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_estimate_totals(OLD.estimate_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_estimate_totals(NEW.estimate_id);
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."trigger_recalculate_estimate"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_company_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_company_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_customer_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."update_customer_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feedback_surveys_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_feedback_surveys_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_invoice_balance"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."update_invoice_balance"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_change_order_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."update_job_change_order_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_completion_checklists_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_completion_checklists_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_completions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_completions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_job_time_entries_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_job_time_entries_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_jobs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_jobs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notification_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_org_users_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."update_org_users_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_tenant_usage"("org_id" "uuid", "usage_type" character varying, "increment_by" integer DEFAULT 1) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  current_month DATE;
BEGIN
  -- Check if tenant_usage table exists using pg_catalog (works with empty search_path)
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'tenant_usage'
  ) THEN
    RETURN;
  END IF;

  current_month := DATE_TRUNC('month', NOW());

  EXECUTE 'INSERT INTO public.tenant_usage (organization_id, month_year) VALUES ($1, $2) ON CONFLICT (organization_id, month_year) DO NOTHING'
    USING org_id, current_month;

  CASE usage_type
    WHEN 'assessments' THEN
      EXECUTE 'UPDATE public.tenant_usage SET assessments_created = assessments_created + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
    WHEN 'photos' THEN
      EXECUTE 'UPDATE public.tenant_usage SET photos_uploaded = photos_uploaded + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
    WHEN 'api_calls' THEN
      EXECUTE 'UPDATE public.tenant_usage SET api_calls = api_calls + $1, updated_at = NOW() WHERE organization_id = $2 AND month_year = $3'
        USING increment_by, org_id, current_month;
  END CASE;
END;
$_$;


ALTER FUNCTION "public"."update_tenant_usage"("org_id" "uuid", "usage_type" character varying, "increment_by" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_feedback_token"("token_value" character varying) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  survey_id UUID;
BEGIN
  SELECT id INTO survey_id
  FROM feedback_surveys
  WHERE access_token = token_value
    AND token_expires_at > NOW()
    AND status NOT IN ('completed', 'expired');

  RETURN survey_id;
EXCEPTION WHEN undefined_table THEN
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."validate_feedback_token"("token_value" character varying) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "user_name" character varying(255),
    "action" character varying(100) NOT NULL,
    "entity_type" character varying(100) NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "entity_name" character varying(255),
    "old_values" "jsonb",
    "new_values" "jsonb",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_usage_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "service_name" character varying(50) NOT NULL,
    "operation" character varying(50) NOT NULL,
    "customer_id" "uuid",
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "provider" character varying(50) NOT NULL,
    "model_version" character varying(100),
    "input_token_count" integer,
    "output_token_count" integer,
    "data_categories" "text"[],
    "pii_redacted" boolean DEFAULT false,
    "processing_time_ms" integer,
    "success" boolean DEFAULT true,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_usage_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_keys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "key_prefix" character varying(20) NOT NULL,
    "key_hash" character varying(255) NOT NULL,
    "scopes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "rate_limit" integer DEFAULT 1000,
    "rate_limit_reset_at" timestamp with time zone,
    "rate_limit_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "revoked_at" timestamp with time zone
);


ALTER TABLE "public"."api_keys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_request_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_key_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "method" character varying(10) NOT NULL,
    "path" "text" NOT NULL,
    "status_code" integer NOT NULL,
    "response_time_ms" integer,
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."api_request_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_thresholds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" character varying(50) NOT NULL,
    "threshold_amount" numeric(12,2) NOT NULL,
    "approval_level" integer NOT NULL,
    "approver_role" character varying(50),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."approval_thresholds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attribution_touchpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "touch_type" "text" NOT NULL,
    "source" "text",
    "medium" "text",
    "campaign" "text",
    "content" "text",
    "term" "text",
    "referrer_url" "text",
    "landing_page" "text",
    "referred_by_contact_id" "uuid",
    "referred_by_company_id" "uuid",
    "referred_by_job_id" "uuid",
    "channel" "text",
    "notes" "text",
    "touched_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "attribution_touchpoints_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['contact'::"text", 'company'::"text", 'opportunity'::"text", 'job'::"text"]))),
    CONSTRAINT "attribution_touchpoints_touch_type_check" CHECK (("touch_type" = ANY (ARRAY['first_touch'::"text", 'last_touch'::"text", 'converting_touch'::"text", 'nurture_touch'::"text"])))
);


ALTER TABLE "public"."attribution_touchpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "action" character varying(100) NOT NULL,
    "resource_type" character varying(50),
    "resource_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "inet",
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "subscription_id" "uuid",
    "stripe_invoice_id" character varying(100),
    "stripe_payment_intent_id" character varying(100),
    "invoice_number" character varying(50),
    "status" character varying(50),
    "subtotal" integer,
    "tax" integer,
    "total" integer,
    "amount_paid" integer,
    "amount_due" integer,
    "invoice_date" timestamp with time zone,
    "due_date" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "invoice_pdf_url" "text",
    "hosted_invoice_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."billing_invoices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."calendar_sync_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "event_type" character varying(50) NOT NULL,
    "google_event_id" character varying(255),
    "outlook_event_id" character varying(255),
    "calendar_type" character varying(50) NOT NULL,
    "last_synced_at" timestamp with time zone,
    "sync_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."calendar_sync_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "opportunity_id" "uuid",
    "job_id" "uuid",
    "invoice_id" "uuid",
    "base_amount" numeric(12,2) NOT NULL,
    "commission_rate" numeric(5,2) NOT NULL,
    "commission_amount" numeric(12,2) NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "earning_date" "date" NOT NULL,
    "pay_period" character varying(20),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "rejected_by" "uuid",
    "rejected_at" timestamp with time zone,
    "rejection_reason" "text"
);


ALTER TABLE "public"."commission_earnings" OWNER TO "postgres";


COMMENT ON COLUMN "public"."commission_earnings"."status" IS 'pending, approved, rejected, paid';



CREATE TABLE IF NOT EXISTS "public"."commission_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "period" character varying(7) NOT NULL,
    "status" character varying(20) DEFAULT 'closed'::character varying NOT NULL,
    "closed_by" "uuid",
    "closed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commission_periods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "commission_type" character varying(20) NOT NULL,
    "base_rate" numeric(5,2),
    "tiers" "jsonb",
    "applies_to" character varying(50) DEFAULT 'won'::character varying,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."commission_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."companies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "industry" "text",
    "phone" "text",
    "email" "text",
    "billing_address_line1" "text",
    "billing_address_line2" "text",
    "billing_city" "text",
    "billing_state" "text",
    "billing_zip" "text",
    "notes" "text",
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "company_type" "public"."company_type",
    "primary_phone" "text",
    "primary_email" "text",
    "service_address_line1" "text",
    "service_address_line2" "text",
    "service_city" "text",
    "service_state" "text",
    "service_zip" "text",
    "account_owner_id" "uuid",
    "account_status" "public"."account_status" DEFAULT 'prospect'::"public"."account_status",
    "customer_since" "date",
    "preferred_contact_method" "text",
    "lead_source" "text",
    "lead_source_detail" "text",
    "first_touch_date" "date",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "referred_by_company_id" "uuid",
    "referred_by_contact_id" "uuid",
    "lifetime_value" numeric(12,2) DEFAULT 0,
    "total_jobs_completed" integer DEFAULT 0,
    "average_job_value" numeric(12,2) DEFAULT 0,
    "payment_terms" "text",
    "quickbooks_customer_id" "text",
    "last_touch_source" "text",
    "last_touch_medium" "text",
    "last_touch_campaign" "text",
    "last_touch_date" "date",
    "converting_touch_source" "text",
    "converting_touch_medium" "text",
    "converting_touch_campaign" "text",
    "converting_touch_date" "date",
    "primary_contact_id" "uuid",
    "location_id" "uuid",
    CONSTRAINT "companies_preferred_contact_method_check" CHECK (("preferred_contact_method" = ANY (ARRAY['email'::"text", 'phone'::"text", 'text'::"text", 'mail'::"text"]))),
    CONSTRAINT "companies_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."companies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credential_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "credential_id" "uuid" NOT NULL,
    "threshold_days" integer NOT NULL,
    "notified_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."credential_alerts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credential_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(150) NOT NULL,
    "category" "public"."credential_category" DEFAULT 'other'::"public"."credential_category" NOT NULL,
    "applies_to" "public"."credential_applies_to" DEFAULT 'worker'::"public"."credential_applies_to" NOT NULL,
    "issuing_authority" "text",
    "default_valid_days" integer,
    "warning_lead_days" integer DEFAULT 30 NOT NULL,
    "required_for_containment_levels" "text"[],
    "required_for_hazard_types" "text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credential_types_default_valid_days_check" CHECK ((("default_valid_days" IS NULL) OR ("default_valid_days" > 0))),
    CONSTRAINT "credential_types_warning_lead_days_check" CHECK (("warning_lead_days" >= 0))
);


ALTER TABLE "public"."credential_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."credentials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "credential_type_id" "uuid" NOT NULL,
    "worker_id" "uuid",
    "asset_id" "uuid",
    "identifier" character varying(255),
    "issued_date" "date",
    "expiry_date" "date",
    "document_path" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "credentials_exactly_one_subject" CHECK (((("worker_id" IS NOT NULL) AND ("asset_id" IS NULL)) OR (("worker_id" IS NULL) AND ("asset_id" IS NOT NULL))))
);


ALTER TABLE "public"."credentials" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."credential_status" WITH ("security_invoker"='true') AS
 SELECT "c"."id",
    "c"."organization_id",
    "c"."credential_type_id",
    "c"."worker_id",
    "c"."asset_id",
    "c"."identifier",
    "c"."issued_date",
    "c"."expiry_date",
    "c"."document_path",
    "c"."notes",
    "c"."created_at",
    "c"."updated_at",
    "ct"."name" AS "credential_type_name",
    "ct"."category",
    "ct"."warning_lead_days",
        CASE
            WHEN ("c"."expiry_date" IS NULL) THEN 'no_expiry'::"text"
            WHEN ("c"."expiry_date" < CURRENT_DATE) THEN 'expired'::"text"
            WHEN ("c"."expiry_date" <= (CURRENT_DATE + "make_interval"("days" => COALESCE("ct"."warning_lead_days", 30)))) THEN 'expiring_soon'::"text"
            ELSE 'valid'::"text"
        END AS "status"
   FROM ("public"."credentials" "c"
     JOIN "public"."credential_types" "ct" ON (("ct"."id" = "c"."credential_type_id")));


ALTER VIEW "public"."credential_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cron_runs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cron_name" "text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "finished_at" timestamp with time zone,
    "status" "text" DEFAULT 'running'::"text" NOT NULL,
    "summary" "jsonb",
    "error_message" "text",
    "failure_count" integer DEFAULT 0 NOT NULL,
    "duration_ms" integer,
    CONSTRAINT "cron_runs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'ok'::"text", 'failed'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."cron_runs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "domain" character varying(255) NOT NULL,
    "verification_token" character varying(100) NOT NULL,
    "is_verified" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "ssl_status" character varying(50) DEFAULT 'pending'::character varying,
    "dns_records" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "title" "text",
    "email" "text",
    "phone" "text",
    "mobile" "text",
    "role" "text" DEFAULT 'general'::"text" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL,
    "preferred_contact_method" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "customer_contacts_preferred_contact_method_check" CHECK (("preferred_contact_method" = ANY (ARRAY['email'::"text", 'phone'::"text", 'mobile'::"text", 'any'::"text"]))),
    CONSTRAINT "customer_contacts_role_check" CHECK (("role" = ANY (ARRAY['primary'::"text", 'billing'::"text", 'site'::"text", 'scheduling'::"text", 'general'::"text"])))
);


ALTER TABLE "public"."customer_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_segments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "segment_type" character varying(20) DEFAULT 'dynamic'::character varying NOT NULL,
    "rules" "jsonb" DEFAULT '[]'::"jsonb",
    "member_count" integer DEFAULT 0,
    "last_calculated_at" timestamp with time zone,
    "mailchimp_tag_id" character varying(100),
    "mailchimp_synced_at" timestamp with time zone,
    "hubspot_list_id" character varying(100),
    "hubspot_synced_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_segments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "company_name" "text",
    "email" "text",
    "phone" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "status" "public"."customer_status" DEFAULT 'inquiry'::"public"."customer_status" NOT NULL,
    "source" "public"."customer_source",
    "communication_preferences" "jsonb" DEFAULT '{"sms": false, "mail": false, "email": true}'::"jsonb",
    "marketing_consent" boolean DEFAULT false,
    "marketing_consent_date" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "mailchimp_id" character varying(100),
    "mailchimp_synced_at" timestamp with time zone,
    "hubspot_id" character varying(100),
    "hubspot_synced_at" timestamp with time zone,
    "ai_processing_consent" boolean DEFAULT false,
    "ai_consent_date" timestamp with time zone,
    "ai_consent_source" character varying(50),
    "sms_opt_in" boolean DEFAULT false,
    "sms_opt_in_at" timestamp with time zone,
    "sms_opt_out_at" timestamp with time zone,
    "company_id" "uuid",
    "contact_type" "text" DEFAULT 'residential'::"text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "title" "text",
    "role_title" "text",
    "mobile_phone" "text",
    "office_phone" "text",
    "preferred_contact_method" "text",
    "contact_role" "public"."contact_role",
    "is_primary_contact" boolean DEFAULT false,
    "contact_status" "public"."contact_status" DEFAULT 'active'::"public"."contact_status",
    "opted_into_email" boolean DEFAULT false,
    "opted_into_email_date" timestamp with time zone,
    "opted_into_sms" boolean DEFAULT false,
    "opted_into_sms_date" timestamp with time zone,
    "lead_source" "text",
    "lead_source_detail" "text",
    "first_touch_date" "date",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "referred_by_contact_id" "uuid",
    "last_contacted_date" "date",
    "next_followup_date" "date",
    "next_followup_note" "text",
    "last_touch_source" "text",
    "last_touch_medium" "text",
    "last_touch_campaign" "text",
    "last_touch_date" "date",
    "converting_touch_source" "text",
    "converting_touch_medium" "text",
    "converting_touch_campaign" "text",
    "converting_touch_date" "date",
    "account_owner_id" "uuid",
    "lifetime_value" numeric(12,2) DEFAULT 0,
    "total_jobs" integer DEFAULT 0,
    "last_job_date" "date",
    "referral_source" "text",
    "insurance_carrier" "text",
    "insurance_policy_number" "text",
    "insurance_adjuster_name" "text",
    "insurance_adjuster_phone" "text",
    "insurance_adjuster_email" "text",
    "property_id" "uuid",
    "qb_customer_id" character varying(100),
    "qb_synced_at" timestamp with time zone,
    "qb_sync_error" "text",
    "location_id" "uuid",
    "sms_opt_in_ip" "text",
    "sms_marketing_consent" boolean DEFAULT false,
    "sms_marketing_consent_at" timestamp with time zone,
    "sms_marketing_consent_ip" "text",
    "contact_category" "public"."contact_category",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    CONSTRAINT "customers_contact_type_check" CHECK (("contact_type" = ANY (ARRAY['residential'::"text", 'commercial'::"text"]))),
    CONSTRAINT "customers_preferred_contact_method_check" CHECK (("preferred_contact_method" = ANY (ARRAY['email'::"text", 'phone'::"text", 'text'::"text", 'mail'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Customer and lead management - tracks prospects from initial contact through customer lifecycle';



COMMENT ON COLUMN "public"."customers"."status" IS 'Customer status: inquiry (initial contact) -> prospect (survey scheduled) -> customer (job completed) -> inactive';



COMMENT ON COLUMN "public"."customers"."communication_preferences" IS 'JSON object with email, sms, mail boolean preferences';



COMMENT ON COLUMN "public"."customers"."marketing_consent" IS 'Whether customer has consented to marketing communications';



COMMENT ON COLUMN "public"."customers"."lifetime_value" IS 'Total invoiced amount across all jobs for this customer';



COMMENT ON COLUMN "public"."customers"."total_jobs" IS 'Number of completed jobs for this customer';



COMMENT ON COLUMN "public"."customers"."last_job_date" IS 'Date of most recent job — stale customers may need re-engagement';



COMMENT ON COLUMN "public"."customers"."referral_source" IS 'How the customer found us (free text for display)';



COMMENT ON COLUMN "public"."customers"."insurance_carrier" IS 'Insurance company name — speeds up claims processing';



COMMENT ON COLUMN "public"."customers"."sms_opt_in_ip" IS 'IP address captured at web-form SMS opt-in, for TCPA consent audit trail';



COMMENT ON COLUMN "public"."customers"."sms_marketing_consent" IS 'Express consent to receive promotional/marketing SMS (separate from transactional sms_opt_in), for TCPA';



COMMENT ON COLUMN "public"."customers"."sms_marketing_consent_at" IS 'Timestamp marketing consent was granted';



COMMENT ON COLUMN "public"."customers"."sms_marketing_consent_ip" IS 'IP captured at web-form marketing opt-in, for the TCPA consent audit trail';



COMMENT ON COLUMN "public"."customers"."contact_category" IS 'What kind of party this contact is (realtor, PM, landlord…). Distinct from
   contact_type (residential/commercial) and contact_role (role on a deal).';



CREATE TABLE IF NOT EXISTS "public"."disposal_fees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "hazard_type" "public"."disposal_hazard_type" NOT NULL,
    "cost_per_cubic_yard" numeric(10,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "disposal_fees_cost_per_cubic_yard_check" CHECK (("cost_per_cubic_yard" >= (0)::numeric))
);


ALTER TABLE "public"."disposal_fees" OWNER TO "postgres";


COMMENT ON TABLE "public"."disposal_fees" IS 'Per-organization hazardous waste disposal fees by material type';



CREATE TABLE IF NOT EXISTS "public"."email_sends" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "sent_by" "uuid",
    "to_email" "text" NOT NULL,
    "cc" "text"[],
    "bcc" "text"[],
    "reply_to" "text",
    "from_email" "text" NOT NULL,
    "from_name" "text",
    "subject" "text" NOT NULL,
    "provider" "text" DEFAULT 'resend'::"text" NOT NULL,
    "provider_message_id" "text",
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "error_message" "text",
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "bounced_at" timestamp with time zone,
    "complained_at" timestamp with time zone,
    "first_opened_at" timestamp with time zone,
    "last_opened_at" timestamp with time zone,
    "open_count" integer DEFAULT 0,
    "first_clicked_at" timestamp with time zone,
    "click_count" integer DEFAULT 0,
    "related_entity_type" "text",
    "related_entity_id" "uuid",
    "tags" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "email_sends_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'sent'::"text", 'delivered'::"text", 'bounced'::"text", 'complained'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."email_sends" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100),
    "daily_rate" numeric(10,2) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."equipment_catalog" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "rate_per_day" numeric(10,2) NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "equipment_rates_rate_per_day_check" CHECK (("rate_per_day" >= (0)::numeric))
);


ALTER TABLE "public"."equipment_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."equipment_rates" IS 'Per-organization equipment rental rates';



CREATE TABLE IF NOT EXISTS "public"."estimate_attached_documents" (
    "estimate_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "attached_by" "uuid",
    "attached_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."estimate_attached_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimate_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_id" "uuid" NOT NULL,
    "item_type" "public"."line_item_type" NOT NULL,
    "category" "text",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit" "text" DEFAULT 'each'::"text",
    "unit_price" numeric(12,2) DEFAULT 0,
    "total_price" numeric(12,2) DEFAULT 0,
    "source_rate_id" "uuid",
    "source_table" "text",
    "sort_order" integer DEFAULT 0,
    "is_optional" boolean DEFAULT false,
    "is_included" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."estimate_line_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimate_suggestions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "site_survey_id" "uuid",
    "hazard_types" "text"[] DEFAULT '{}'::"text"[],
    "property_type" character varying(50),
    "square_footage" integer,
    "suggested_items" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "total_amount" numeric(12,2),
    "model_version" character varying(50),
    "confidence_score" numeric(5,4),
    "reasoning" "text",
    "was_accepted" boolean,
    "accepted_at" timestamp with time zone,
    "modified_before_accept" boolean,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."estimate_suggestions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."estimates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "site_survey_id" "uuid",
    "customer_id" "uuid",
    "estimate_number" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "status" "public"."estimate_status" DEFAULT 'draft'::"public"."estimate_status",
    "subtotal" numeric(12,2) DEFAULT 0,
    "markup_percent" numeric(5,2) DEFAULT 0,
    "markup_amount" numeric(12,2) DEFAULT 0,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "tax_percent" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "total" numeric(12,2) DEFAULT 0,
    "project_name" "text",
    "project_description" "text",
    "scope_of_work" "text",
    "estimated_duration_days" integer,
    "estimated_start_date" "date",
    "estimated_end_date" "date",
    "valid_until" "date",
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "approval_notes" "text",
    "internal_notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "parent_estimate_id" "uuid",
    "estimate_root_id" "uuid" NOT NULL,
    "revision_notes" "text",
    "location_id" "uuid"
);


ALTER TABLE "public"."estimates" OWNER TO "postgres";


COMMENT ON COLUMN "public"."estimates"."parent_estimate_id" IS 'Pointer to the previous estimate version this revises. NULL for v1.';



COMMENT ON COLUMN "public"."estimates"."estimate_root_id" IS 'The v1 of this estimate chain — denormalised for cheap version-of-version queries.';



COMMENT ON COLUMN "public"."estimates"."revision_notes" IS 'Optional reason for creating this revision.';



CREATE TABLE IF NOT EXISTS "public"."feedback_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "access_token" character varying(64) NOT NULL,
    "token_expires_at" timestamp with time zone NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "sent_at" timestamp with time zone,
    "sent_to_email" character varying(255),
    "reminder_sent_at" timestamp with time zone,
    "viewed_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "rating_overall" integer,
    "rating_quality" integer,
    "rating_communication" integer,
    "rating_timeliness" integer,
    "rating_value" integer,
    "would_recommend" boolean,
    "likelihood_to_recommend" integer,
    "feedback_text" "text",
    "improvement_suggestions" "text",
    "testimonial_text" "text",
    "testimonial_permission" boolean DEFAULT false,
    "testimonial_approved" boolean DEFAULT false,
    "testimonial_approved_at" timestamp with time zone,
    "testimonial_approved_by" "uuid",
    "customer_name" character varying(255),
    "customer_company" character varying(255),
    "ip_address" character varying(45),
    "user_agent" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "feedback_surveys_likelihood_to_recommend_check" CHECK ((("likelihood_to_recommend" >= 0) AND ("likelihood_to_recommend" <= 10))),
    CONSTRAINT "feedback_surveys_rating_communication_check" CHECK ((("rating_communication" >= 1) AND ("rating_communication" <= 5))),
    CONSTRAINT "feedback_surveys_rating_overall_check" CHECK ((("rating_overall" >= 1) AND ("rating_overall" <= 5))),
    CONSTRAINT "feedback_surveys_rating_quality_check" CHECK ((("rating_quality" >= 1) AND ("rating_quality" <= 5))),
    CONSTRAINT "feedback_surveys_rating_timeliness_check" CHECK ((("rating_timeliness" >= 1) AND ("rating_timeliness" <= 5))),
    CONSTRAINT "feedback_surveys_rating_value_check" CHECK ((("rating_value" >= 1) AND ("rating_value" <= 5)))
);


ALTER TABLE "public"."feedback_surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follow_ups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "due_date" timestamp with time zone NOT NULL,
    "note" "text",
    "assigned_to" "uuid",
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "follow_ups_entity_type_check" CHECK (("entity_type" = ANY (ARRAY['estimate'::"text", 'job'::"text", 'opportunity'::"text", 'customer'::"text", 'contact'::"text", 'site_survey'::"text", 'invoice'::"text", 'proposal'::"text"])))
);


ALTER TABLE "public"."follow_ups" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."industry_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "category" "text" DEFAULT 'general'::"text" NOT NULL,
    "title" "text" NOT NULL,
    "start_at" timestamp with time zone NOT NULL,
    "end_at" timestamp with time zone NOT NULL,
    "all_day" boolean DEFAULT false NOT NULL,
    "location" "text",
    "description" "text",
    "registration_url" "text",
    "source" "text",
    "source_ref" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."industry_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."industry_events" IS 'Org-scoped industry association events (NARI, AHCA, OSHA training, etc.) shown alongside jobs/surveys on the calendar.';



CREATE TABLE IF NOT EXISTS "public"."integration_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "integration_type" character varying(50) NOT NULL,
    "sync_type" character varying(50) NOT NULL,
    "direction" character varying(20) NOT NULL,
    "status" character varying(50) NOT NULL,
    "records_processed" integer DEFAULT 0,
    "records_succeeded" integer DEFAULT 0,
    "records_failed" integer DEFAULT 0,
    "errors" "jsonb" DEFAULT '[]'::"jsonb",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer
);


ALTER TABLE "public"."integration_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_attached_documents" (
    "invoice_id" "uuid" NOT NULL,
    "job_document_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "attached_by" "uuid",
    "attached_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."invoice_attached_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoice_line_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1 NOT NULL,
    "unit" character varying(50),
    "unit_price" numeric(12,2) NOT NULL,
    "line_total" numeric(12,2) NOT NULL,
    "source_type" character varying(50),
    "source_id" "uuid",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."invoice_line_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoice_line_items" IS 'Line items for invoices';



CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "invoice_number" character varying(50) NOT NULL,
    "status" character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    "invoice_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "subtotal" numeric(12,2) DEFAULT 0 NOT NULL,
    "tax_rate" numeric(5,4) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "total" numeric(12,2) DEFAULT 0 NOT NULL,
    "amount_paid" numeric(12,2) DEFAULT 0,
    "balance_due" numeric(12,2) DEFAULT 0 NOT NULL,
    "payment_terms" character varying(100),
    "notes" "text",
    "sent_at" timestamp with time zone,
    "sent_via" character varying(50),
    "viewed_at" timestamp with time zone,
    "qb_invoice_id" character varying(100),
    "qb_synced_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "location_id" "uuid",
    "access_token" "text",
    "access_token_expires_at" timestamp with time zone
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON TABLE "public"."invoices" IS 'Customer invoices for completed jobs';



CREATE TABLE IF NOT EXISTS "public"."job_change_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "change_order_number" character varying(50) NOT NULL,
    "description" "text" NOT NULL,
    "reason" "text",
    "amount" numeric(12,2) NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "customer_approved" boolean DEFAULT false,
    "customer_approved_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_change_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_completion_checklists" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "category" character varying(50) NOT NULL,
    "item_name" character varying(255) NOT NULL,
    "item_description" "text",
    "sort_order" integer DEFAULT 0,
    "is_required" boolean DEFAULT true,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "completed_by" "uuid",
    "completion_notes" "text",
    "evidence_photo_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_completion_checklists" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_completion_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "photo_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "storage_path" "text" NOT NULL,
    "photo_type" character varying(50) DEFAULT 'during'::character varying NOT NULL,
    "caption" "text",
    "taken_at" timestamp with time zone,
    "location_lat" numeric(10,8),
    "location_lng" numeric(11,8),
    "camera_make" character varying(100),
    "camera_model" character varying(100),
    "image_width" integer,
    "image_height" integer,
    "file_name" character varying(255),
    "file_size" integer,
    "mime_type" character varying(100),
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_completion_photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_crew" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "role" character varying(50) DEFAULT 'crew'::character varying NOT NULL,
    "is_lead" boolean DEFAULT false,
    "scheduled_start" time without time zone,
    "scheduled_end" time without time zone,
    "clock_in_at" timestamp with time zone,
    "clock_out_at" timestamp with time zone,
    "break_minutes" integer DEFAULT 0,
    "hours_worked" numeric(6,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_crew" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_disposal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "hazard_type" character varying(50) NOT NULL,
    "disposal_type" character varying(100),
    "quantity" numeric(10,2) NOT NULL,
    "unit" character varying(50) NOT NULL,
    "manifest_number" character varying(100),
    "manifest_date" "date",
    "disposal_facility_name" character varying(255),
    "disposal_facility_address" "text",
    "disposal_cost" numeric(12,2),
    "manifest_document_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_disposal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "notes" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "job_documents_category_check" CHECK (("category" = ANY (ARRAY['permit'::"text", 'manifest'::"text", 'waste_label'::"text", 'clearance'::"text", 'air_monitoring'::"text", 'insurance'::"text", 'regulatory'::"text", 'customer_signoff'::"text", 'correspondence'::"text", 'video'::"text", 'daily_log'::"text", 'opp'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."job_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "equipment_name" character varying(255) NOT NULL,
    "equipment_type" character varying(100),
    "quantity" integer DEFAULT 1,
    "is_rental" boolean DEFAULT false,
    "rental_rate_daily" numeric(10,2),
    "rental_start_date" "date",
    "rental_end_date" "date",
    "rental_days" integer,
    "rental_total" numeric(10,2),
    "status" character varying(50) DEFAULT 'assigned'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_material_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "job_material_id" "uuid",
    "material_name" character varying(255) NOT NULL,
    "material_type" character varying(100),
    "quantity_estimated" numeric(10,2),
    "quantity_used" numeric(10,2) NOT NULL,
    "unit" character varying(50),
    "unit_cost" numeric(10,2),
    "total_cost" numeric(12,2) GENERATED ALWAYS AS (
CASE
    WHEN ("unit_cost" IS NOT NULL) THEN ("quantity_used" * "unit_cost")
    ELSE NULL::numeric
END) STORED,
    "variance_quantity" numeric(10,2) GENERATED ALWAYS AS (
CASE
    WHEN ("quantity_estimated" IS NOT NULL) THEN ("quantity_used" - "quantity_estimated")
    ELSE NULL::numeric
END) STORED,
    "variance_percent" numeric(5,2) GENERATED ALWAYS AS (
CASE
    WHEN (("quantity_estimated" IS NOT NULL) AND ("quantity_estimated" > (0)::numeric)) THEN ((("quantity_used" - "quantity_estimated") / "quantity_estimated") * (100)::numeric)
    ELSE NULL::numeric
END) STORED,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_material_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "material_name" character varying(255) NOT NULL,
    "material_type" character varying(100),
    "quantity_estimated" numeric(10,2),
    "quantity_used" numeric(10,2),
    "unit" character varying(50),
    "unit_cost" numeric(10,2),
    "total_cost" numeric(12,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "note_type" character varying(50) DEFAULT 'general'::character varying NOT NULL,
    "content" "text" NOT NULL,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "is_internal" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."job_time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" "uuid" NOT NULL,
    "profile_id" "uuid",
    "work_date" "date" NOT NULL,
    "hours" numeric(5,2) NOT NULL,
    "work_type" character varying(100) DEFAULT 'regular'::character varying NOT NULL,
    "hourly_rate" numeric(10,2),
    "billable" boolean DEFAULT true,
    "description" "text",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."job_time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."jobs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "proposal_id" "uuid",
    "estimate_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "site_survey_id" "uuid",
    "job_number" character varying(50) NOT NULL,
    "name" character varying(255),
    "status" character varying(50) DEFAULT 'scheduled'::character varying NOT NULL,
    "hazard_types" "text"[],
    "scheduled_start_date" "date" NOT NULL,
    "scheduled_start_time" time without time zone,
    "scheduled_end_date" "date",
    "scheduled_end_time" time without time zone,
    "estimated_duration_hours" numeric(6,2),
    "actual_start_at" timestamp with time zone,
    "actual_end_at" timestamp with time zone,
    "job_address" "text" NOT NULL,
    "job_city" character varying(100),
    "job_state" character varying(50),
    "job_zip" character varying(20),
    "job_latitude" numeric(10,8),
    "job_longitude" numeric(11,8),
    "access_notes" "text",
    "gate_code" character varying(50),
    "lockbox_code" character varying(50),
    "contact_onsite_name" character varying(255),
    "contact_onsite_phone" character varying(50),
    "contract_amount" numeric(12,2),
    "change_order_amount" numeric(12,2) DEFAULT 0,
    "final_amount" numeric(12,2),
    "completion_notes" "text",
    "completion_photos" "jsonb" DEFAULT '[]'::"jsonb",
    "customer_signed_off" boolean DEFAULT false,
    "customer_signoff_at" timestamp with time zone,
    "customer_signoff_name" character varying(255),
    "inspection_required" boolean DEFAULT false,
    "inspection_passed" boolean,
    "inspection_date" "date",
    "inspection_notes" "text",
    "internal_notes" "text",
    "special_instructions" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "opportunity_id" "uuid",
    "company_id" "uuid",
    "primary_contact_id" "uuid",
    "site_contact_id" "uuid",
    "crew_lead_id" "uuid",
    "containment_level" "public"."containment_level",
    "actual_affected_area_sqft" numeric(10,2),
    "disposal_manifest_numbers" "text"[],
    "permit_numbers" "text"[],
    "air_monitoring_required" boolean DEFAULT false,
    "clearance_testing_required" boolean DEFAULT false,
    "estimated_labor_hours" numeric(8,2),
    "actual_labor_hours" numeric(8,2),
    "estimated_revenue" numeric(12,2),
    "actual_revenue" numeric(12,2),
    "estimated_cost" numeric(12,2),
    "actual_cost" numeric(12,2),
    "gross_margin_pct" numeric(5,2),
    "invoice_id" "text",
    "deposit_amount" numeric(12,2),
    "deposit_received_date" "date",
    "final_invoice_date" "date",
    "final_payment_date" "date",
    "lead_source" "text",
    "is_repeat_customer" boolean DEFAULT false,
    "referral_job_id" "uuid",
    "first_touch_source" "text",
    "first_touch_medium" "text",
    "first_touch_campaign" "text",
    "last_touch_source" "text",
    "last_touch_medium" "text",
    "last_touch_campaign" "text",
    "converting_touch_source" "text",
    "converting_touch_medium" "text",
    "converting_touch_campaign" "text",
    "attributed_lead_source" "text",
    "attributed_lead_source_detail" "text",
    "property_id" "uuid",
    "completion_id" "uuid",
    "actual_start_date" "date",
    "actual_end_date" "date",
    "actual_duration_days" integer,
    "location_id" "uuid",
    "assigned_to" "uuid"
);


ALTER TABLE "public"."jobs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_report_samples" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "lab_report_id" "uuid" NOT NULL,
    "sample_number" "text" NOT NULL,
    "description" "text" NOT NULL,
    "location" "text",
    "result" "text",
    "asbestos_pct" numeric,
    "non_asbestos_fibers" "text",
    "non_fibrous" "text",
    "notes" "text",
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lab_report_samples" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "report_number" "text" NOT NULL,
    "ordered_date" "date" NOT NULL,
    "lab_id" "uuid",
    "sample_type" "public"."lab_sample_type" DEFAULT 'other'::"public"."lab_sample_type" NOT NULL,
    "sample_description" "text",
    "site_address" "text",
    "site_city" "text",
    "site_state" "text",
    "site_zip" "text",
    "estimate_id" "uuid",
    "work_order_id" "uuid",
    "invoice_id" "uuid",
    "customer_id" "uuid",
    "status" "public"."lab_report_status" DEFAULT 'ordered'::"public"."lab_report_status" NOT NULL,
    "received_date" "date",
    "file_name" "text",
    "storage_path" "text",
    "mime_type" "text",
    "size_bytes" bigint,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "location_id" "uuid",
    "turnaround" "text",
    "submitted_to" "text",
    "relinquished_by" "text",
    "property_id" "uuid"
);


ALTER TABLE "public"."lab_reports" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lab_reports"."turnaround" IS 'Requested lab turnaround as printed on the chain-of-custody form, e.g. "Same day", "24 hour".';



COMMENT ON COLUMN "public"."lab_reports"."submitted_to" IS 'Free text block of who receives the results — often a client PM plus a project contact.';



COMMENT ON COLUMN "public"."lab_reports"."relinquished_by" IS 'Name printed on the "Relinquished by" line of the chain-of-custody form.';



COMMENT ON COLUMN "public"."lab_reports"."property_id" IS 'The physical location the samples came from. Survives the occupant moving
   on — the result is a fact about the building, not the customer.';



CREATE TABLE IF NOT EXISTS "public"."labor_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "rate_per_day" numeric(10,2) NOT NULL,
    "description" "text",
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "labor_rates_rate_per_day_non_negative" CHECK (("rate_per_day" >= (0)::numeric))
);


ALTER TABLE "public"."labor_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."labor_rates" IS 'Per-organization labor rates for different types of workers';



CREATE TABLE IF NOT EXISTS "public"."labs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "address" "text",
    "notes" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."labs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_webhook_endpoints" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(50) NOT NULL,
    "provider" character varying(50) NOT NULL,
    "api_key" character varying(255),
    "secret" character varying(255),
    "field_mapping" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "leads_received" integer DEFAULT 0,
    "last_lead_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_webhook_endpoints" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_webhook_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "endpoint_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "raw_payload" "jsonb" NOT NULL,
    "headers" "jsonb",
    "ip_address" "inet",
    "status" character varying(20) NOT NULL,
    "error_message" "text",
    "customer_id" "uuid",
    "opportunity_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lead_webhook_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."location_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "location_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false,
    "can_manage" boolean DEFAULT false,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "public"."location_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(20),
    "address_line1" character varying(255),
    "address_line2" character varying(255),
    "city" character varying(100),
    "state" character varying(50),
    "zip" character varying(20),
    "country" character varying(100) DEFAULT 'US'::character varying,
    "phone" character varying(50),
    "email" character varying(255),
    "timezone" character varying(100) DEFAULT 'America/New_York'::character varying,
    "is_headquarters" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."marketing_sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "integration_type" character varying(50) NOT NULL,
    "sync_type" character varying(50) NOT NULL,
    "entity_id" "uuid",
    "status" character varying(20) NOT NULL,
    "external_id" character varying(255),
    "error_message" "text",
    "started_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "duration_ms" integer
);


ALTER TABLE "public"."marketing_sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."material_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "cost_per_unit" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "material_costs_cost_per_unit_check" CHECK (("cost_per_unit" >= (0)::numeric))
);


ALTER TABLE "public"."material_costs" OWNER TO "postgres";


COMMENT ON TABLE "public"."material_costs" IS 'Per-organization material and supply costs';



CREATE TABLE IF NOT EXISTS "public"."materials_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100),
    "unit" character varying(50),
    "unit_cost" numeric(10,2) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."materials_catalog" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_job_costs" AS
 SELECT "j"."organization_id",
    "j"."id" AS "job_id",
    "j"."job_number",
    "j"."name" AS "title",
    "j"."hazard_types",
    "date_trunc"('month'::"text", "j"."actual_end_at") AS "month",
    COALESCE("c"."company_name", "c"."name", '(no customer)'::"text") AS "customer_name",
    COALESCE("e"."total", (0)::numeric) AS "estimated_total",
    COALESCE("jc"."actual_labor_cost", (0)::numeric) AS "actual_labor",
    COALESCE("jc"."actual_material_cost", (0)::numeric) AS "actual_materials",
    COALESCE("jc"."actual_total", "j"."actual_cost", (0)::numeric) AS "actual_total",
    COALESCE("i"."total", (0)::numeric) AS "invoiced",
    COALESCE("i"."amount_paid", (0)::numeric) AS "collected",
    (COALESCE("e"."total", (0)::numeric) - COALESCE("jc"."actual_total", "j"."actual_cost", (0)::numeric)) AS "variance",
        CASE
            WHEN (COALESCE("e"."total", (0)::numeric) > (0)::numeric) THEN "round"((((COALESCE("e"."total", (0)::numeric) - COALESCE("jc"."actual_total", "j"."actual_cost", (0)::numeric)) / "e"."total") * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "variance_pct"
   FROM (((("public"."jobs" "j"
     LEFT JOIN "public"."customers" "c" ON (("c"."id" = "j"."customer_id")))
     LEFT JOIN "public"."estimates" "e" ON (("e"."id" = "j"."estimate_id")))
     LEFT JOIN "public"."job_completions" "jc" ON (("jc"."job_id" = "j"."id")))
     LEFT JOIN "public"."invoices" "i" ON (("i"."job_id" = "j"."id")))
  WHERE (("j"."status")::"text" = 'completed'::"text")
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_job_costs" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."mv_lead_source_roi" AS
 SELECT "c"."organization_id",
    COALESCE(("c"."source")::"text", "c"."lead_source", 'untracked'::"text") AS "source",
    "date_trunc"('month'::"text", "c"."created_at") AS "month",
    "count"(DISTINCT "c"."id") AS "leads",
    "count"(DISTINCT
        CASE
            WHEN ("c"."status" = ANY (ARRAY['customer'::"public"."customer_status", 'past_customer'::"public"."customer_status"])) THEN "c"."id"
            ELSE NULL::"uuid"
        END) AS "converted",
    COALESCE("sum"("i"."total"), (0)::numeric) AS "total_revenue",
    "round"(((("count"(DISTINCT
        CASE
            WHEN ("c"."status" = ANY (ARRAY['customer'::"public"."customer_status", 'past_customer'::"public"."customer_status"])) THEN "c"."id"
            ELSE NULL::"uuid"
        END))::numeric / (NULLIF("count"(DISTINCT "c"."id"), 0))::numeric) * (100)::numeric), 1) AS "conversion_rate",
    "round"((COALESCE("sum"("i"."total"), (0)::numeric) / (NULLIF("count"(DISTINCT
        CASE
            WHEN ("c"."status" = ANY (ARRAY['customer'::"public"."customer_status", 'past_customer'::"public"."customer_status"])) THEN "c"."id"
            ELSE NULL::"uuid"
        END), 0))::numeric), 2) AS "avg_revenue_per_conversion"
   FROM ("public"."customers" "c"
     LEFT JOIN "public"."invoices" "i" ON ((("i"."customer_id" = "c"."id") AND (("i"."status")::"text" = 'paid'::"text"))))
  GROUP BY "c"."organization_id", COALESCE(("c"."source")::"text", "c"."lead_source", 'untracked'::"text"), ("date_trunc"('month'::"text", "c"."created_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_lead_source_roi" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "organization_id" "uuid",
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(20),
    "role" "public"."user_role" DEFAULT 'estimator'::"public"."user_role",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_platform_user" boolean DEFAULT false,
    "last_login_at" timestamp with time zone,
    "login_count" integer DEFAULT 0,
    "full_name" character varying(201) GENERATED ALWAYS AS ((((COALESCE("first_name", ''::character varying))::"text" ||
CASE
    WHEN (("first_name" IS NOT NULL) AND ("last_name" IS NOT NULL)) THEN ' '::"text"
    ELSE ''::"text"
END) || (COALESCE("last_name", ''::character varying))::"text")) STORED,
    "default_location_id" "uuid",
    "calendar_feed_token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "commission_plan_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "estimate_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "proposal_number" "text" NOT NULL,
    "status" "public"."proposal_status" DEFAULT 'draft'::"public"."proposal_status",
    "access_token" "text",
    "access_token_expires_at" timestamp with time zone,
    "cover_letter" "text",
    "terms_and_conditions" "text",
    "payment_terms" "text",
    "exclusions" "text"[],
    "inclusions" "text"[],
    "sent_at" timestamp with time zone,
    "sent_to_email" "text",
    "viewed_at" timestamp with time zone,
    "viewed_count" integer DEFAULT 0,
    "signed_at" timestamp with time zone,
    "signer_name" "text",
    "signer_email" "text",
    "signer_ip" "text",
    "signature_data" "text",
    "valid_until" "date",
    "pdf_path" "text",
    "pdf_generated_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "approval_method" character varying(50) DEFAULT 'digital_signature'::character varying,
    "verbal_approval_note" "text",
    "approved_by_user_id" "uuid"
);


ALTER TABLE "public"."proposals" OWNER TO "postgres";


COMMENT ON COLUMN "public"."proposals"."approval_method" IS 'How the proposal was approved: "digital_signature" (customer signed via portal) or "verbal" (admin recorded customer''s verbal approval).';



COMMENT ON COLUMN "public"."proposals"."verbal_approval_note" IS 'Free-text note documenting the circumstances of a verbal approval (who called, when, what they said). Required when approval_method = ''verbal''.';



COMMENT ON COLUMN "public"."proposals"."approved_by_user_id" IS 'For verbal approvals, the profile of the admin who recorded the approval. Null for digital signatures.';



CREATE MATERIALIZED VIEW "public"."mv_sales_performance" AS
 SELECT "p"."organization_id",
    "p"."id" AS "user_id",
    "p"."full_name",
    "date_trunc"('month'::"text", "pr"."created_at") AS "month",
    "count"(DISTINCT "pr"."id") AS "total_proposals",
    "count"(DISTINCT "pr"."id") AS "proposals_sent",
    "count"(DISTINCT
        CASE
            WHEN ("pr"."status" = 'signed'::"public"."proposal_status") THEN "pr"."id"
            ELSE NULL::"uuid"
        END) AS "proposals_won",
    "count"(DISTINCT
        CASE
            WHEN ("pr"."status" = 'declined'::"public"."proposal_status") THEN "pr"."id"
            ELSE NULL::"uuid"
        END) AS "proposals_lost",
    COALESCE("sum"("e"."total"), (0)::numeric) AS "total_value",
    COALESCE("sum"(
        CASE
            WHEN ("pr"."status" = 'signed'::"public"."proposal_status") THEN "e"."total"
            ELSE NULL::numeric
        END), (0)::numeric) AS "won_value",
    COALESCE("sum"(
        CASE
            WHEN ("pr"."status" = 'signed'::"public"."proposal_status") THEN "e"."total"
            ELSE NULL::numeric
        END), (0)::numeric) AS "revenue_won",
    COALESCE("avg"(
        CASE
            WHEN ("pr"."status" = 'signed'::"public"."proposal_status") THEN "e"."total"
            ELSE NULL::numeric
        END), (0)::numeric) AS "avg_deal_size",
        CASE
            WHEN ("count"(DISTINCT
            CASE
                WHEN ("pr"."status" = ANY (ARRAY['signed'::"public"."proposal_status", 'declined'::"public"."proposal_status"])) THEN "pr"."id"
                ELSE NULL::"uuid"
            END) > 0) THEN "round"(((("count"(DISTINCT
            CASE
                WHEN ("pr"."status" = 'signed'::"public"."proposal_status") THEN "pr"."id"
                ELSE NULL::"uuid"
            END))::numeric / ("count"(DISTINCT
            CASE
                WHEN ("pr"."status" = ANY (ARRAY['signed'::"public"."proposal_status", 'declined'::"public"."proposal_status"])) THEN "pr"."id"
                ELSE NULL::"uuid"
            END))::numeric) * (100)::numeric), 1)
            ELSE (0)::numeric
        END AS "win_rate"
   FROM (("public"."profiles" "p"
     JOIN "public"."proposals" "pr" ON (("pr"."created_by" = "p"."id")))
     LEFT JOIN "public"."estimates" "e" ON (("e"."id" = "pr"."estimate_id")))
  GROUP BY "p"."organization_id", "p"."id", "p"."full_name", ("date_trunc"('month'::"text", "pr"."created_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_sales_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "notification_type" character varying(50) NOT NULL,
    "in_app" boolean DEFAULT true,
    "email" boolean DEFAULT true,
    "push" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."opportunities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "stage_id" "uuid" NOT NULL,
    "estimated_value" numeric(12,2),
    "weighted_value" numeric(12,2),
    "expected_close_date" "date",
    "actual_close_date" "date",
    "owner_id" "uuid",
    "estimate_id" "uuid",
    "proposal_id" "uuid",
    "job_id" "uuid",
    "company_id" "uuid",
    "outcome" character varying(20),
    "loss_reason" character varying(100),
    "loss_notes" "text",
    "competitor" character varying(200),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "opportunity_status" "public"."opportunity_status" DEFAULT 'new'::"public"."opportunity_status",
    "primary_contact_id" "uuid",
    "site_contact_id" "uuid",
    "service_address_line1" "text",
    "service_address_line2" "text",
    "service_city" "text",
    "service_state" "text",
    "service_zip" "text",
    "property_type" "public"."property_type",
    "property_age" integer,
    "hazard_types" "text"[],
    "estimated_affected_area_sqft" numeric(10,2),
    "urgency" "public"."urgency_level" DEFAULT 'routine'::"public"."urgency_level",
    "regulatory_trigger" "public"."regulatory_trigger",
    "probability_pct" integer DEFAULT 0,
    "assessment_date" "date",
    "estimate_sent_date" "date",
    "follow_up_date" "date",
    "lost_to_competitor" "text",
    "lead_source" "text",
    "lead_source_detail" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "first_touch_date" "date",
    "created_from_assessment_id" "uuid",
    "first_touch_source" "text",
    "first_touch_medium" "text",
    "first_touch_campaign" "text",
    "last_touch_source" "text",
    "last_touch_medium" "text",
    "last_touch_campaign" "text",
    "converting_touch_source" "text",
    "converting_touch_medium" "text",
    "converting_touch_campaign" "text",
    "property_id" "uuid",
    "location_id" "uuid",
    "no_visit" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."opportunities" OWNER TO "postgres";


COMMENT ON COLUMN "public"."opportunities"."no_visit" IS 'True when the work was quoted without attending site (e.g. a hover report).';



CREATE TABLE IF NOT EXISTS "public"."opportunity_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "opportunity_id" "uuid" NOT NULL,
    "from_stage_id" "uuid",
    "to_stage_id" "uuid" NOT NULL,
    "changed_by" "uuid" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."opportunity_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_ai_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "ai_enabled" boolean DEFAULT false,
    "consent_granted_at" timestamp with time zone,
    "consent_granted_by" "uuid",
    "photo_analysis_enabled" boolean DEFAULT false,
    "estimate_suggestions_enabled" boolean DEFAULT false,
    "voice_transcription_enabled" boolean DEFAULT false,
    "retain_ai_data" boolean DEFAULT true,
    "anonymize_customer_data" boolean DEFAULT true,
    "allow_model_improvement" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."organization_ai_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_document_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "document_id" "uuid" NOT NULL,
    "recipient_email" "text" NOT NULL,
    "recipient_name" "text",
    "customer_id" "uuid",
    "company_id" "uuid",
    "message" "text",
    "link_expires_at" timestamp with time zone NOT NULL,
    "email_send_id" "uuid",
    "shared_by" "uuid",
    "shared_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."organization_document_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "display_name" "text" NOT NULL,
    "document_number" "text",
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "issued_on" "date",
    "expires_on" "date",
    "issuing_authority" "text",
    "notes" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "organization_documents_category_check" CHECK (("category" = ANY (ARRAY['license'::"text", 'certification'::"text", 'insurance'::"text", 'bond'::"text", 'w9'::"text", 'safety_plan'::"text", 'references'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."organization_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_integrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "integration_type" character varying(50) NOT NULL,
    "access_token" "text",
    "refresh_token" "text",
    "token_expires_at" timestamp with time zone,
    "external_id" character varying(255),
    "is_active" boolean DEFAULT false,
    "last_sync_at" timestamp with time zone,
    "last_error" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_integrations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_sms_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "twilio_account_sid" "text",
    "twilio_auth_token" "text",
    "twilio_phone_number" "text",
    "use_platform_twilio" boolean DEFAULT true,
    "sms_enabled" boolean DEFAULT false,
    "appointment_reminders_enabled" boolean DEFAULT true,
    "appointment_reminder_hours" integer DEFAULT 24,
    "job_status_updates_enabled" boolean DEFAULT true,
    "lead_notifications_enabled" boolean DEFAULT true,
    "payment_reminders_enabled" boolean DEFAULT false,
    "quiet_hours_enabled" boolean DEFAULT true,
    "quiet_hours_start" time without time zone DEFAULT '21:00:00'::time without time zone,
    "quiet_hours_end" time without time zone DEFAULT '08:00:00'::time without time zone,
    "timezone" character varying(50) DEFAULT 'America/Chicago'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "sms_brand_prefix" "text",
    CONSTRAINT "organization_sms_settings_brand_prefix_len" CHECK ((("sms_brand_prefix" IS NULL) OR ("char_length"("sms_brand_prefix") <= 24)))
);


ALTER TABLE "public"."organization_sms_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "plan_id" "uuid" NOT NULL,
    "stripe_customer_id" character varying(100),
    "stripe_subscription_id" character varying(100),
    "status" character varying(50) DEFAULT 'trialing'::character varying NOT NULL,
    "billing_cycle" character varying(20) DEFAULT 'monthly'::character varying,
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "trial_start" timestamp with time zone,
    "trial_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "cancellation_reason" "text",
    "users_count" integer DEFAULT 1,
    "jobs_this_month" integer DEFAULT 0,
    "storage_used_mb" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."organization_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "stripe_payment_method_id" character varying(100),
    "card_brand" character varying(50),
    "card_last4" character varying(4),
    "card_exp_month" integer,
    "card_exp_year" integer,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invoice_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "payment_method" character varying(50),
    "reference_number" character varying(100),
    "notes" "text",
    "qb_payment_id" character varying(100),
    "qb_synced_at" timestamp with time zone,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payments" OWNER TO "postgres";


COMMENT ON TABLE "public"."payments" IS 'Payment records for invoices';



CREATE TABLE IF NOT EXISTS "public"."photo_analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_photo_id" "uuid",
    "image_url" "text",
    "image_hash" character varying(64),
    "property_type" character varying(50),
    "known_hazards" "text"[] DEFAULT '{}'::"text"[],
    "detected_hazards" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "overall_risk_level" character varying(20),
    "recommendations" "jsonb" DEFAULT '[]'::"jsonb",
    "raw_analysis" "text",
    "model_version" character varying(50),
    "processing_time_ms" integer,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photo_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "caption" "text",
    "gps_coordinates" "point",
    "file_size" integer,
    "file_type" character varying(50),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."photos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pipeline_stages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "color" character varying(20) DEFAULT '#6366f1'::character varying,
    "stage_type" character varying(50) NOT NULL,
    "probability" integer DEFAULT 0,
    "sort_order" integer NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."pipeline_stages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" character varying(100) NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."pricing_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "default_markup_percent" numeric(5,2) DEFAULT 25.00,
    "minimum_markup_percent" numeric(5,2) DEFAULT 10.00,
    "maximum_markup_percent" numeric(5,2) DEFAULT 50.00,
    "office_address_line1" "text",
    "office_address_line2" "text",
    "office_city" "text",
    "office_state" "text",
    "office_zip" "text",
    "office_lat" numeric(10,8),
    "office_lng" numeric(11,8),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "pricing_settings_default_markup_percent_check" CHECK ((("default_markup_percent" >= (0)::numeric) AND ("default_markup_percent" <= (100)::numeric))),
    CONSTRAINT "pricing_settings_markup_check" CHECK ((("minimum_markup_percent" <= "default_markup_percent") AND ("default_markup_percent" <= "maximum_markup_percent"))),
    CONSTRAINT "pricing_settings_maximum_markup_percent_check" CHECK ((("maximum_markup_percent" >= (0)::numeric) AND ("maximum_markup_percent" <= (100)::numeric))),
    CONSTRAINT "pricing_settings_minimum_markup_percent_check" CHECK ((("minimum_markup_percent" >= (0)::numeric) AND ("minimum_markup_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."pricing_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."pricing_settings" IS 'Per-organization pricing configuration including markup percentages and office location';



CREATE TABLE IF NOT EXISTS "public"."properties" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" "text",
    "state" "text",
    "zip" "text",
    "normalized_address" "text" GENERATED ALWAYS AS ("lower"(TRIM(BOTH FROM ((((((COALESCE("address_line1", ''::"text") || ' '::"text") || COALESCE("city", ''::"text")) || ' '::"text") || COALESCE("state", ''::"text")) || ' '::"text") || COALESCE("zip", ''::"text"))))) STORED,
    "latitude" double precision,
    "longitude" double precision,
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "property_type" "public"."property_type"
);


ALTER TABLE "public"."properties" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_contacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "property_id" "uuid" NOT NULL,
    "contact_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "is_current" boolean DEFAULT true NOT NULL,
    "moved_in_date" "date",
    "moved_out_date" "date",
    "notes" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "property_contacts_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'previous_owner'::"text", 'tenant'::"text", 'site_contact'::"text", 'billing_contact'::"text"])))
);


ALTER TABLE "public"."property_contacts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "endpoint" "text" NOT NULL,
    "p256dh_key" "text" NOT NULL,
    "auth_key" "text" NOT NULL,
    "device_name" character varying(255),
    "user_agent" "text",
    "is_active" boolean DEFAULT true,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."push_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."report_exports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "report_id" "uuid",
    "exported_by" "uuid" NOT NULL,
    "report_name" character varying(200) NOT NULL,
    "export_format" character varying(20) NOT NULL,
    "file_path" "text",
    "file_size" integer,
    "parameters" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."report_exports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "feedback_survey_id" "uuid",
    "customer_id" "uuid" NOT NULL,
    "platform" character varying(50) NOT NULL,
    "platform_url" "text",
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "sent_at" timestamp with time zone,
    "clicked_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "sent_to_email" character varying(255),
    "click_token" character varying(64),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "report_type" character varying(50) NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_shared" boolean DEFAULT false,
    "schedule_enabled" boolean DEFAULT false,
    "schedule_frequency" character varying(20),
    "schedule_recipients" "text"[],
    "last_sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."scheduled_reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "related_type" character varying(50) NOT NULL,
    "related_id" "uuid" NOT NULL,
    "reminder_type" character varying(50) NOT NULL,
    "recipient_type" character varying(50) NOT NULL,
    "recipient_email" character varying(255),
    "recipient_phone" character varying(50),
    "channel" character varying(50) DEFAULT 'email'::character varying NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    "sent_at" timestamp with time zone,
    "error" "text",
    "template_slug" character varying(100),
    "template_variables" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."scheduled_reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."segment_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "segment_id" "uuid" NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "added_at" timestamp with time zone DEFAULT "now"(),
    "added_by" "uuid"
);


ALTER TABLE "public"."segment_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_survey_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "site_survey_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "file_path" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "file_type" "text" NOT NULL,
    "url" "text" NOT NULL,
    "caption" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "category" "text",
    "location" "text",
    "area_id" "text"
);


ALTER TABLE "public"."site_survey_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_survey_photos" IS 'Photos associated with site surveys (formerly photos)';



COMMENT ON COLUMN "public"."site_survey_photos"."site_survey_id" IS 'Foreign key reference to site_surveys table (formerly assessment_id)';



COMMENT ON COLUMN "public"."site_survey_photos"."category" IS 'Photo category: exterior, interior, asbestos_materials, mold_areas, lead_components, utility_access, other';



COMMENT ON COLUMN "public"."site_survey_photos"."location" IS 'Location description for the photo';



CREATE TABLE IF NOT EXISTS "public"."site_surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "estimator_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "job_name" character varying(255) NOT NULL,
    "customer_name" character varying(255) NOT NULL,
    "customer_email" character varying(255),
    "customer_phone" character varying(20),
    "site_address" "text" NOT NULL,
    "site_city" character varying(100) NOT NULL,
    "site_state" character varying(50) NOT NULL,
    "site_zip" character varying(20) NOT NULL,
    "site_location" "point",
    "hazard_type" "public"."hazard_type" NOT NULL,
    "hazard_subtype" character varying(255),
    "containment_level" integer,
    "area_sqft" numeric(10,2),
    "linear_ft" numeric(10,2),
    "volume_cuft" numeric(10,2),
    "material_type" character varying(255),
    "occupied" boolean DEFAULT false,
    "access_issues" "text"[],
    "special_conditions" "text",
    "clearance_required" boolean DEFAULT false,
    "clearance_lab" character varying(255),
    "regulatory_notifications_needed" boolean DEFAULT false,
    "notes" "text",
    "status" "public"."site_survey_status" DEFAULT 'draft'::"public"."site_survey_status",
    "customer_id" "uuid",
    "scheduled_date" "date",
    "scheduled_time_start" time without time zone,
    "scheduled_time_end" time without time zone,
    "assigned_to" "uuid",
    "appointment_status" "public"."appointment_status" DEFAULT 'scheduled'::"public"."appointment_status",
    "building_type" "text",
    "year_built" integer,
    "building_sqft" integer,
    "stories" integer DEFAULT 1,
    "construction_type" "text",
    "occupancy_status" "text",
    "owner_name" "text",
    "owner_phone" "text",
    "owner_email" "text",
    "access_info" "jsonb" DEFAULT '{}'::"jsonb",
    "environment_info" "jsonb" DEFAULT '{}'::"jsonb",
    "hazard_assessments" "jsonb" DEFAULT '{}'::"jsonb",
    "photo_metadata" "jsonb" DEFAULT '[]'::"jsonb",
    "technician_notes" "text",
    "started_at" timestamp with time zone,
    "submitted_at" timestamp with time zone,
    "property_id" "uuid",
    "location_id" "uuid",
    "cancellation_reason" "text",
    "cancelled_at" timestamp with time zone,
    "cancelled_by" "uuid",
    "parent_survey_id" "uuid",
    "survey_root_id" "uuid" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "revision_notes" "text",
    "archived_at" timestamp with time zone,
    "archived_by" "uuid",
    "archive_reason" "text",
    CONSTRAINT "assessments_containment_level_check" CHECK ((("containment_level" >= 1) AND ("containment_level" <= 4))),
    CONSTRAINT "site_surveys_cancellation_reason_required" CHECK ((("status" <> 'cancelled'::"public"."site_survey_status") OR (("cancellation_reason" IS NOT NULL) AND ("length"(TRIM(BOTH FROM "cancellation_reason")) > 0))))
);


ALTER TABLE "public"."site_surveys" OWNER TO "postgres";


COMMENT ON TABLE "public"."site_surveys" IS 'Site surveys (formerly assessments) - field data collection for environmental remediation projects';



COMMENT ON COLUMN "public"."site_surveys"."customer_id" IS 'Links site survey to a customer record - can be null for legacy surveys';



COMMENT ON COLUMN "public"."site_surveys"."scheduled_date" IS 'Date when the site survey is scheduled';



COMMENT ON COLUMN "public"."site_surveys"."scheduled_time_start" IS 'Start time for the scheduled appointment';



COMMENT ON COLUMN "public"."site_surveys"."scheduled_time_end" IS 'End time for the scheduled appointment';



COMMENT ON COLUMN "public"."site_surveys"."assigned_to" IS 'Profile ID of the technician assigned to conduct the survey';



COMMENT ON COLUMN "public"."site_surveys"."appointment_status" IS 'Current status of the scheduled appointment';



COMMENT ON COLUMN "public"."site_surveys"."building_type" IS 'Type of building: residential_single, residential_multi, commercial, industrial, institutional, warehouse, retail';



COMMENT ON COLUMN "public"."site_surveys"."year_built" IS 'Year the building was constructed';



COMMENT ON COLUMN "public"."site_surveys"."building_sqft" IS 'Total building square footage';



COMMENT ON COLUMN "public"."site_surveys"."stories" IS 'Number of stories in the building';



COMMENT ON COLUMN "public"."site_surveys"."construction_type" IS 'Construction type: wood_frame, concrete, steel, masonry, mixed';



COMMENT ON COLUMN "public"."site_surveys"."occupancy_status" IS 'Occupancy status: occupied, vacant, partial';



COMMENT ON COLUMN "public"."site_surveys"."access_info" IS 'Access details: restrictions, parking, equipment access, elevator, doorway width';



COMMENT ON COLUMN "public"."site_surveys"."environment_info" IS 'Environmental conditions: temperature, humidity, moisture issues, structural concerns';



COMMENT ON COLUMN "public"."site_surveys"."hazard_assessments" IS 'Detailed hazard data: types[], asbestos materials[], mold areas[], lead components[], other';



COMMENT ON COLUMN "public"."site_surveys"."photo_metadata" IS 'Array of photo metadata: [{url, category, caption, gps, timestamp}]';



COMMENT ON COLUMN "public"."site_surveys"."technician_notes" IS 'Final notes and observations from the technician';



COMMENT ON COLUMN "public"."site_surveys"."started_at" IS 'When the survey was started';



COMMENT ON COLUMN "public"."site_surveys"."submitted_at" IS 'When the survey was submitted';



COMMENT ON COLUMN "public"."site_surveys"."cancellation_reason" IS 'Required free-text reason when status is cancelled. Enforced by site_surveys_cancellation_reason_required CHECK constraint.';



COMMENT ON COLUMN "public"."site_surveys"."cancelled_at" IS 'Timestamp of cancellation';



COMMENT ON COLUMN "public"."site_surveys"."cancelled_by" IS 'Profile that recorded the cancellation';



COMMENT ON COLUMN "public"."site_surveys"."parent_survey_id" IS 'Pointer to the previous survey version this revises. NULL for v1.';



COMMENT ON COLUMN "public"."site_surveys"."survey_root_id" IS 'The v1 of this survey chain — denormalised for cheap version-of-version queries.';



COMMENT ON COLUMN "public"."site_surveys"."version" IS 'Version number within survey_root_id chain. Trigger increments on insert when parent is set.';



COMMENT ON COLUMN "public"."site_surveys"."revision_notes" IS 'Optional reason for creating this revision.';



COMMENT ON COLUMN "public"."site_surveys"."archive_reason" IS 'Why the survey was filed away — typically "visited, no estimate needed".';



CREATE TABLE IF NOT EXISTS "public"."sms_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "customer_id" "uuid",
    "to_phone" character varying(20) NOT NULL,
    "message_type" "public"."sms_message_type" NOT NULL,
    "body" "text" NOT NULL,
    "related_entity_type" character varying(50),
    "related_entity_id" "uuid",
    "twilio_message_sid" character varying(50),
    "status" "public"."sms_status" DEFAULT 'queued'::"public"."sms_status",
    "error_code" character varying(20),
    "error_message" "text",
    "queued_at" timestamp with time zone DEFAULT "now"(),
    "sent_at" timestamp with time zone,
    "delivered_at" timestamp with time zone,
    "failed_at" timestamp with time zone,
    "segments" integer DEFAULT 1,
    "cost" numeric(10,4),
    "direction" "text" DEFAULT 'outbound'::"text" NOT NULL,
    "from_phone" character varying(20),
    "received_at" timestamp with time zone,
    CONSTRAINT "sms_messages_direction_check" CHECK (("direction" = ANY (ARRAY['outbound'::"text", 'inbound'::"text"])))
);


ALTER TABLE "public"."sms_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sms_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" character varying(100) NOT NULL,
    "message_type" "public"."sms_message_type" NOT NULL,
    "body" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sms_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" character varying(100) NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "processed_at" timestamp with time zone DEFAULT "now"(),
    "payload" "jsonb"
);


ALTER TABLE "public"."stripe_webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "slug" character varying(50) NOT NULL,
    "description" "text",
    "price_monthly" integer NOT NULL,
    "price_yearly" integer,
    "stripe_product_id" character varying(100),
    "stripe_price_id_monthly" character varying(100),
    "stripe_price_id_yearly" character varying(100),
    "max_users" integer,
    "max_jobs_per_month" integer,
    "max_storage_gb" integer,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "feature_flags" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "is_public" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_photos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "site_survey_id" "uuid" NOT NULL,
    "job_id" "uuid",
    "customer_id" "uuid",
    "company_id" "uuid",
    "legacy_id" "text",
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "location" "text",
    "caption" "text",
    "area_id" "text",
    "captured_at" timestamp with time zone,
    "captured_at_source" "text",
    "captured_lat" double precision,
    "captured_lng" double precision,
    "device_make" "text",
    "device_model" "text",
    "exif_raw" "jsonb",
    "media_type" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "file_hash" "text",
    "original_r2_key" "text",
    "stamped_r2_key" "text",
    "original_supabase_path" "text",
    "stamped_supabase_path" "text",
    "tier" "text" DEFAULT 'hot'::"text" NOT NULL,
    "tier_changed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "stamp_status" "text" DEFAULT 'pending'::"text",
    "stamp_error" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "survey_photos_captured_at_source_check" CHECK (("captured_at_source" = ANY (ARRAY['exif'::"text", 'client'::"text", 'server'::"text"]))),
    CONSTRAINT "survey_photos_has_storage" CHECK ((("tier" = 'deleted'::"text") OR ("original_r2_key" IS NOT NULL) OR ("original_supabase_path" IS NOT NULL))),
    CONSTRAINT "survey_photos_media_type_check" CHECK (("media_type" = ANY (ARRAY['image'::"text", 'video'::"text"]))),
    CONSTRAINT "survey_photos_stamp_status_check" CHECK (("stamp_status" = ANY (ARRAY['pending'::"text", 'stamped'::"text", 'failed'::"text", 'skipped'::"text"]))),
    CONSTRAINT "survey_photos_tier_check" CHECK (("tier" = ANY (ARRAY['hot'::"text", 'cold'::"text", 'deleted'::"text"])))
);


ALTER TABLE "public"."survey_photos" OWNER TO "postgres";


COMMENT ON TABLE "public"."survey_photos" IS 'Relational replacement for site_surveys.photo_metadata JSONB. Indexed by survey/customer/job/company; lifecycle-managed by daily cron with per-org retention windows.';



CREATE TABLE IF NOT EXISTS "public"."tenant_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "email" character varying(255) NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "token" character varying(255) NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tenant_invitations_role_not_privileged" CHECK (("role" = ANY (ARRAY['admin'::"public"."user_role", 'estimator'::"public"."user_role", 'technician'::"public"."user_role", 'viewer'::"public"."user_role"])))
);


ALTER TABLE "public"."tenant_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenant_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "month_year" "date" NOT NULL,
    "assessments_created" integer DEFAULT 0,
    "photos_uploaded" integer DEFAULT 0,
    "storage_used_mb" integer DEFAULT 0,
    "api_calls" integer DEFAULT 0,
    "active_users" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tenant_usage" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."travel_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "min_miles" integer NOT NULL,
    "max_miles" integer,
    "flat_fee" numeric(10,2),
    "per_mile_rate" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "travel_rates_check" CHECK ((("max_miles" IS NULL) OR ("max_miles" >= "min_miles"))),
    CONSTRAINT "travel_rates_fee_check" CHECK ((("flat_fee" IS NOT NULL) OR ("per_mile_rate" IS NOT NULL))),
    CONSTRAINT "travel_rates_flat_fee_check" CHECK ((("flat_fee" IS NULL) OR ("flat_fee" >= (0)::numeric))),
    CONSTRAINT "travel_rates_min_miles_check" CHECK (("min_miles" >= 0)),
    CONSTRAINT "travel_rates_per_mile_rate_check" CHECK ((("per_mile_rate" IS NULL) OR ("per_mile_rate" >= (0)::numeric)))
);


ALTER TABLE "public"."travel_rates" OWNER TO "postgres";


COMMENT ON TABLE "public"."travel_rates" IS 'Per-organization travel fees based on distance ranges';



CREATE OR REPLACE VIEW "public"."v_job_costs" AS
 SELECT "organization_id",
    "job_id",
    "job_number",
    "title",
    "hazard_types",
    "month",
    "customer_name",
    "estimated_total",
    "actual_labor",
    "actual_materials",
    "actual_total",
    "invoiced",
    "collected",
    "variance",
    "variance_pct"
   FROM "public"."mv_job_costs"
  WHERE ("organization_id" = "public"."get_user_organization_id"());


ALTER VIEW "public"."v_job_costs" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_job_costs" IS 'Org-filtered wrapper over mv_job_costs. See v_sales_performance.';



CREATE OR REPLACE VIEW "public"."v_lead_source_roi" AS
 SELECT "organization_id",
    "source",
    "month",
    "leads",
    "converted",
    "total_revenue",
    "conversion_rate",
    "avg_revenue_per_conversion"
   FROM "public"."mv_lead_source_roi"
  WHERE ("organization_id" = "public"."get_user_organization_id"());


ALTER VIEW "public"."v_lead_source_roi" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_lead_source_roi" IS 'Org-filtered wrapper over mv_lead_source_roi. See v_sales_performance.';



CREATE OR REPLACE VIEW "public"."v_sales_performance" AS
 SELECT "organization_id",
    "user_id",
    "full_name",
    "month",
    "total_proposals",
    "proposals_sent",
    "proposals_won",
    "proposals_lost",
    "total_value",
    "won_value",
    "revenue_won",
    "avg_deal_size",
    "win_rate"
   FROM "public"."mv_sales_performance"
  WHERE ("organization_id" = "public"."get_user_organization_id"());


ALTER VIEW "public"."v_sales_performance" OWNER TO "postgres";


COMMENT ON VIEW "public"."v_sales_performance" IS 'Org-filtered wrapper over mv_sales_performance. Reads the matview using the view owner''s grants, then filters by get_user_organization_id() so authenticated callers can only see their own organization''s rows. The underlying matview is revoked from authenticated to prevent direct access.';



CREATE TABLE IF NOT EXISTS "public"."voice_transcriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "audio_url" "text",
    "audio_duration_seconds" integer,
    "audio_format" character varying(20),
    "context_type" character varying(50),
    "context_id" "uuid",
    "raw_transcription" "text" NOT NULL,
    "processed_text" "text",
    "extracted_data" "jsonb" DEFAULT '{}'::"jsonb",
    "transcription_model" character varying(50),
    "processing_model" character varying(50),
    "processing_time_ms" integer,
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."voice_transcriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_deliveries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "webhook_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "status_code" integer,
    "response_body" "text",
    "error_message" "text",
    "attempt_count" integer DEFAULT 0,
    "next_retry_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "delivered_at" timestamp with time zone
);


ALTER TABLE "public"."webhook_deliveries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhooks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" character varying(100) NOT NULL,
    "url" "text" NOT NULL,
    "secret" character varying(255),
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "is_active" boolean DEFAULT true,
    "last_triggered_at" timestamp with time zone,
    "failure_count" integer DEFAULT 0,
    "headers" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."webhooks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "mime_type" "text",
    "size_bytes" bigint,
    "category" "text" DEFAULT 'other'::"text" NOT NULL,
    "notes" "text",
    "uploaded_by" "uuid",
    "uploaded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "work_order_documents_category_check" CHECK (("category" = ANY (ARRAY['sds'::"text", 'manual'::"text", 'access'::"text", 'pre_work'::"text", 'signed_acknowledgment'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."work_order_documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."work_order_vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "work_order_id" "uuid" NOT NULL,
    "vehicle_type" "text",
    "make_model" "text",
    "plate" "text",
    "driver_profile_id" "uuid",
    "driver_name" "text",
    "is_rental" boolean DEFAULT false,
    "rental_vendor" "text",
    "rental_rate_daily" numeric(10,2),
    "rental_start_date" "date",
    "rental_end_date" "date",
    "notes" "text",
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."work_order_vehicles" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_order_vehicles" IS 'Vehicles assigned to a work order — trucks, trailers, vans, rentals.';



CREATE TABLE IF NOT EXISTS "public"."work_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "job_id" "uuid" NOT NULL,
    "work_order_number" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "snapshot" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "notes" "text",
    "issued_at" timestamp with time zone,
    "issued_by" "uuid",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "work_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'issued'::"text", 'revised'::"text", 'completed'::"text", 'archived'::"text"])))
);


ALTER TABLE "public"."work_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."work_orders" IS 'Crew-facing dispatch sheet for a job (the "work order"). Snapshot is frozen at issue time so the paper version matches what the crew took even if the job is later edited. Distinct from EPA waste manifests stored on job_disposal.';



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_request_log"
    ADD CONSTRAINT "api_request_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_thresholds"
    ADD CONSTRAINT "approval_thresholds_organization_id_entity_type_approval_le_key" UNIQUE ("organization_id", "entity_type", "approval_level");



ALTER TABLE ONLY "public"."approval_thresholds"
    ADD CONSTRAINT "approval_thresholds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_survey_photos"
    ADD CONSTRAINT "assessment_photos_file_path_key" UNIQUE ("file_path");



ALTER TABLE ONLY "public"."site_survey_photos"
    ADD CONSTRAINT "assessment_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attribution_touchpoints"
    ADD CONSTRAINT "attribution_touchpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_stripe_invoice_id_key" UNIQUE ("stripe_invoice_id");



ALTER TABLE ONLY "public"."calendar_sync_events"
    ADD CONSTRAINT "calendar_sync_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_organization_id_period_key" UNIQUE ("organization_id", "period");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_plans"
    ADD CONSTRAINT "commission_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_alerts"
    ADD CONSTRAINT "credential_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credential_alerts"
    ADD CONSTRAINT "credential_alerts_unique" UNIQUE ("credential_id", "threshold_days");



ALTER TABLE ONLY "public"."credential_types"
    ADD CONSTRAINT "credential_types_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."credential_types"
    ADD CONSTRAINT "credential_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."credentials"
    ADD CONSTRAINT "credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cron_runs"
    ADD CONSTRAINT "cron_runs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_id_unique" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."disposal_fees"
    ADD CONSTRAINT "disposal_fees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_catalog"
    ADD CONSTRAINT "equipment_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_rates"
    ADD CONSTRAINT "equipment_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimate_attached_documents"
    ADD CONSTRAINT "estimate_attached_documents_pkey" PRIMARY KEY ("estimate_id", "document_id");



ALTER TABLE ONLY "public"."estimate_line_items"
    ADD CONSTRAINT "estimate_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimate_suggestions"
    ADD CONSTRAINT "estimate_suggestions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follow_ups"
    ADD CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."industry_events"
    ADD CONSTRAINT "industry_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."integration_sync_log"
    ADD CONSTRAINT "integration_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoice_attached_documents"
    ADD CONSTRAINT "invoice_attached_documents_pkey" PRIMARY KEY ("invoice_id", "job_document_id");



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_change_orders"
    ADD CONSTRAINT "job_change_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_completion_checklists"
    ADD CONSTRAINT "job_completion_checklists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_completion_photos"
    ADD CONSTRAINT "job_completion_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_completions"
    ADD CONSTRAINT "job_completions_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."job_completions"
    ADD CONSTRAINT "job_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_crew"
    ADD CONSTRAINT "job_crew_job_id_profile_id_key" UNIQUE ("job_id", "profile_id");



ALTER TABLE ONLY "public"."job_crew"
    ADD CONSTRAINT "job_crew_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_disposal"
    ADD CONSTRAINT "job_disposal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_equipment"
    ADD CONSTRAINT "job_equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_material_usage"
    ADD CONSTRAINT "job_material_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_materials"
    ADD CONSTRAINT "job_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."job_time_entries"
    ADD CONSTRAINT "job_time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_report_samples"
    ADD CONSTRAINT "lab_report_samples_number_unique" UNIQUE ("lab_report_id", "sample_number");



ALTER TABLE ONLY "public"."lab_report_samples"
    ADD CONSTRAINT "lab_report_samples_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_org_number_unique" UNIQUE ("organization_id", "report_number");



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labor_rates"
    ADD CONSTRAINT "labor_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."labs"
    ADD CONSTRAINT "labs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_webhook_endpoints"
    ADD CONSTRAINT "lead_webhook_endpoints_organization_id_slug_key" UNIQUE ("organization_id", "slug");



ALTER TABLE ONLY "public"."lead_webhook_endpoints"
    ADD CONSTRAINT "lead_webhook_endpoints_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_webhook_log"
    ADD CONSTRAINT "lead_webhook_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."location_users"
    ADD CONSTRAINT "location_users_location_id_user_id_key" UNIQUE ("location_id", "user_id");



ALTER TABLE ONLY "public"."location_users"
    ADD CONSTRAINT "location_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."marketing_sync_log"
    ADD CONSTRAINT "marketing_sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."material_costs"
    ADD CONSTRAINT "material_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."materials_catalog"
    ADD CONSTRAINT "materials_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_notification_type_key" UNIQUE ("user_id", "notification_type");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."opportunity_history"
    ADD CONSTRAINT "opportunity_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_ai_settings"
    ADD CONSTRAINT "organization_ai_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_ai_settings"
    ADD CONSTRAINT "organization_ai_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_integrations"
    ADD CONSTRAINT "organization_integrations_organization_id_integration_type_key" UNIQUE ("organization_id", "integration_type");



ALTER TABLE ONLY "public"."organization_integrations"
    ADD CONSTRAINT "organization_integrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_sms_settings"
    ADD CONSTRAINT "organization_sms_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_sms_settings"
    ADD CONSTRAINT "organization_sms_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_stripe_payment_method_id_key" UNIQUE ("stripe_payment_method_id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photo_analyses"
    ADD CONSTRAINT "photo_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_organization_id_key" UNIQUE ("organization_id");



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_calendar_feed_token_key" UNIQUE ("calendar_feed_token");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_id_org_id_key" UNIQUE ("id", "organization_id");



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_property_id_contact_id_role_key" UNIQUE ("property_id", "contact_id", "role");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_access_token_key" UNIQUE ("access_token");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_endpoint_key" UNIQUE ("user_id", "endpoint");



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_reports"
    ADD CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."scheduled_reminders"
    ADD CONSTRAINT "scheduled_reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segment_members"
    ADD CONSTRAINT "segment_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."segment_members"
    ADD CONSTRAINT "segment_members_segment_id_customer_id_key" UNIQUE ("segment_id", "customer_id");



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sms_templates"
    ADD CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_webhook_events"
    ADD CONSTRAINT "stripe_webhook_events_stripe_event_id_key" UNIQUE ("stripe_event_id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."tenant_usage"
    ADD CONSTRAINT "tenant_usage_organization_id_month_year_key" UNIQUE ("organization_id", "month_year");



ALTER TABLE ONLY "public"."tenant_usage"
    ADD CONSTRAINT "tenant_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."travel_rates"
    ADD CONSTRAINT "travel_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_documents"
    ADD CONSTRAINT "work_order_documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_order_vehicles"
    ADD CONSTRAINT "work_order_vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_organization_id_manifest_number_key" UNIQUE ("organization_id", "work_order_number");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_log_created" ON "public"."activity_log" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_activity_log_entity" ON "public"."activity_log" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_activity_log_org" ON "public"."activity_log" USING "btree" ("organization_id");



CREATE INDEX "idx_activity_log_user" ON "public"."activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_ai_usage_log_created" ON "public"."ai_usage_log" USING "btree" ("created_at");



CREATE INDEX "idx_ai_usage_log_customer" ON "public"."ai_usage_log" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_ai_usage_log_org" ON "public"."ai_usage_log" USING "btree" ("organization_id");



CREATE INDEX "idx_ai_usage_log_service" ON "public"."ai_usage_log" USING "btree" ("service_name");



CREATE INDEX "idx_api_keys_active" ON "public"."api_keys" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_api_keys_org" ON "public"."api_keys" USING "btree" ("organization_id");



CREATE INDEX "idx_api_keys_prefix" ON "public"."api_keys" USING "btree" ("key_prefix");



CREATE INDEX "idx_api_request_log_created" ON "public"."api_request_log" USING "btree" ("created_at");



CREATE INDEX "idx_api_request_log_key" ON "public"."api_request_log" USING "btree" ("api_key_id");



CREATE INDEX "idx_api_request_log_org" ON "public"."api_request_log" USING "btree" ("organization_id");



CREATE INDEX "idx_approval_requests_entity" ON "public"."approval_requests" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_approval_requests_status" ON "public"."approval_requests" USING "btree" ("final_status");



CREATE INDEX "idx_approval_thresholds_org" ON "public"."approval_thresholds" USING "btree" ("organization_id");



CREATE INDEX "idx_assessments_estimator_id" ON "public"."site_surveys" USING "btree" ("estimator_id");



CREATE INDEX "idx_assessments_hazard_type" ON "public"."site_surveys" USING "btree" ("hazard_type");



CREATE INDEX "idx_audit_log_created_at" ON "public"."audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_audit_log_organization_id" ON "public"."audit_log" USING "btree" ("organization_id");



CREATE INDEX "idx_billing_invoices_org" ON "public"."billing_invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_sync_google" ON "public"."calendar_sync_events" USING "btree" ("google_event_id") WHERE ("google_event_id" IS NOT NULL);



CREATE INDEX "idx_calendar_sync_job" ON "public"."calendar_sync_events" USING "btree" ("job_id");



CREATE INDEX "idx_calendar_sync_org" ON "public"."calendar_sync_events" USING "btree" ("organization_id");



CREATE INDEX "idx_calendar_sync_outlook" ON "public"."calendar_sync_events" USING "btree" ("outlook_event_id") WHERE ("outlook_event_id" IS NOT NULL);



CREATE INDEX "idx_commission_earnings_status" ON "public"."commission_earnings" USING "btree" ("status");



CREATE INDEX "idx_commission_earnings_user" ON "public"."commission_earnings" USING "btree" ("user_id");



CREATE INDEX "idx_commission_periods_org" ON "public"."commission_periods" USING "btree" ("organization_id");



CREATE INDEX "idx_commission_plans_org" ON "public"."commission_plans" USING "btree" ("organization_id");



CREATE INDEX "idx_companies_account_owner" ON "public"."companies" USING "btree" ("account_owner_id") WHERE ("account_owner_id" IS NOT NULL);



CREATE INDEX "idx_companies_account_status" ON "public"."companies" USING "btree" ("organization_id", "account_status");



CREATE INDEX "idx_companies_company_type" ON "public"."companies" USING "btree" ("organization_id", "company_type");



CREATE INDEX "idx_companies_lead_source" ON "public"."companies" USING "btree" ("organization_id", "lead_source") WHERE ("lead_source" IS NOT NULL);



CREATE INDEX "idx_companies_location" ON "public"."companies" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_companies_name" ON "public"."companies" USING "btree" ("organization_id", "name");



CREATE INDEX "idx_companies_org" ON "public"."companies" USING "btree" ("organization_id");



CREATE INDEX "idx_companies_org_created" ON "public"."companies" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_companies_primary_contact" ON "public"."companies" USING "btree" ("primary_contact_id") WHERE ("primary_contact_id" IS NOT NULL);



CREATE INDEX "idx_companies_quickbooks" ON "public"."companies" USING "btree" ("quickbooks_customer_id") WHERE ("quickbooks_customer_id" IS NOT NULL);



CREATE INDEX "idx_companies_referred_by" ON "public"."companies" USING "btree" ("referred_by_company_id") WHERE ("referred_by_company_id" IS NOT NULL);



CREATE INDEX "idx_companies_status" ON "public"."companies" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_credential_alerts_credential" ON "public"."credential_alerts" USING "btree" ("credential_id");



CREATE INDEX "idx_credential_alerts_org" ON "public"."credential_alerts" USING "btree" ("organization_id");



CREATE INDEX "idx_credential_types_org" ON "public"."credential_types" USING "btree" ("organization_id");



CREATE INDEX "idx_credentials_org_expiry" ON "public"."credentials" USING "btree" ("organization_id", "expiry_date");



CREATE INDEX "idx_credentials_org_worker" ON "public"."credentials" USING "btree" ("organization_id", "worker_id");



CREATE INDEX "idx_credentials_type" ON "public"."credentials" USING "btree" ("credential_type_id");



CREATE INDEX "idx_cron_runs_failed" ON "public"."cron_runs" USING "btree" ("started_at" DESC) WHERE ("status" = ANY (ARRAY['failed'::"text", 'partial'::"text"]));



CREATE INDEX "idx_cron_runs_name_started" ON "public"."cron_runs" USING "btree" ("cron_name", "started_at" DESC);



CREATE INDEX "idx_custom_domains_domain" ON "public"."custom_domains" USING "btree" ("domain");



CREATE INDEX "idx_custom_domains_org" ON "public"."custom_domains" USING "btree" ("organization_id");



CREATE INDEX "idx_customer_contacts_customer" ON "public"."customer_contacts" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_contacts_org" ON "public"."customer_contacts" USING "btree" ("organization_id");



CREATE INDEX "idx_customer_contacts_primary" ON "public"."customer_contacts" USING "btree" ("customer_id", "is_primary") WHERE ("is_primary" = true);



CREATE INDEX "idx_customer_contacts_role" ON "public"."customer_contacts" USING "btree" ("customer_id", "role");



CREATE INDEX "idx_customer_segments_active" ON "public"."customer_segments" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_customer_segments_org" ON "public"."customer_segments" USING "btree" ("organization_id");



CREATE INDEX "idx_customer_segments_type" ON "public"."customer_segments" USING "btree" ("segment_type");



CREATE INDEX "idx_customers_account_owner" ON "public"."customers" USING "btree" ("account_owner_id") WHERE ("account_owner_id" IS NOT NULL);



CREATE INDEX "idx_customers_company" ON "public"."customers" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_customers_contact_role" ON "public"."customers" USING "btree" ("contact_role") WHERE ("contact_role" IS NOT NULL);



CREATE INDEX "idx_customers_contact_status" ON "public"."customers" USING "btree" ("organization_id", "contact_status");



CREATE INDEX "idx_customers_contact_type" ON "public"."customers" USING "btree" ("organization_id", "contact_type");



CREATE INDEX "idx_customers_created_at" ON "public"."customers" USING "btree" ("created_at");



CREATE INDEX "idx_customers_email" ON "public"."customers" USING "btree" ("email");



CREATE INDEX "idx_customers_first_name" ON "public"."customers" USING "btree" ("organization_id", "first_name");



CREATE INDEX "idx_customers_hubspot" ON "public"."customers" USING "btree" ("hubspot_id") WHERE ("hubspot_id" IS NOT NULL);



CREATE INDEX "idx_customers_last_name" ON "public"."customers" USING "btree" ("organization_id", "last_name");



CREATE INDEX "idx_customers_lead_source" ON "public"."customers" USING "btree" ("organization_id", "lead_source") WHERE ("lead_source" IS NOT NULL);



CREATE INDEX "idx_customers_location" ON "public"."customers" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_customers_mailchimp" ON "public"."customers" USING "btree" ("mailchimp_id") WHERE ("mailchimp_id" IS NOT NULL);



CREATE INDEX "idx_customers_name" ON "public"."customers" USING "btree" ("name");



CREATE INDEX "idx_customers_next_followup" ON "public"."customers" USING "btree" ("next_followup_date") WHERE ("next_followup_date" IS NOT NULL);



CREATE INDEX "idx_customers_org_category" ON "public"."customers" USING "btree" ("organization_id", "contact_category") WHERE ("contact_category" IS NOT NULL);



CREATE INDEX "idx_customers_org_created_status" ON "public"."customers" USING "btree" ("organization_id", "created_at" DESC, "status");



CREATE INDEX "idx_customers_org_last_job_date" ON "public"."customers" USING "btree" ("organization_id", "last_job_date" DESC);



CREATE INDEX "idx_customers_org_lifetime_value" ON "public"."customers" USING "btree" ("organization_id", "lifetime_value" DESC);



CREATE INDEX "idx_customers_organization_id" ON "public"."customers" USING "btree" ("organization_id");



CREATE INDEX "idx_customers_phone" ON "public"."customers" USING "btree" ("phone");



CREATE INDEX "idx_customers_property" ON "public"."customers" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_customers_qb" ON "public"."customers" USING "btree" ("qb_customer_id") WHERE ("qb_customer_id" IS NOT NULL);



CREATE INDEX "idx_customers_referred_by" ON "public"."customers" USING "btree" ("referred_by_contact_id") WHERE ("referred_by_contact_id" IS NOT NULL);



CREATE INDEX "idx_customers_status" ON "public"."customers" USING "btree" ("status");



CREATE INDEX "idx_disposal_fees_hazard_type" ON "public"."disposal_fees" USING "btree" ("organization_id", "hazard_type");



CREATE INDEX "idx_disposal_fees_organization_id" ON "public"."disposal_fees" USING "btree" ("organization_id");



CREATE INDEX "idx_email_sends_entity" ON "public"."email_sends" USING "btree" ("related_entity_type", "related_entity_id") WHERE ("related_entity_id" IS NOT NULL);



CREATE INDEX "idx_email_sends_org" ON "public"."email_sends" USING "btree" ("organization_id", "created_at" DESC);



CREATE INDEX "idx_email_sends_provider_id" ON "public"."email_sends" USING "btree" ("provider_message_id") WHERE ("provider_message_id" IS NOT NULL);



CREATE INDEX "idx_email_sends_status" ON "public"."email_sends" USING "btree" ("organization_id", "status", "created_at" DESC);



CREATE INDEX "idx_equipment_rates_organization_id" ON "public"."equipment_rates" USING "btree" ("organization_id");



CREATE INDEX "idx_estimate_attached_documents_document" ON "public"."estimate_attached_documents" USING "btree" ("document_id");



CREATE INDEX "idx_estimate_attached_documents_estimate" ON "public"."estimate_attached_documents" USING "btree" ("estimate_id");



CREATE INDEX "idx_estimate_line_items_estimate_id" ON "public"."estimate_line_items" USING "btree" ("estimate_id");



CREATE INDEX "idx_estimate_line_items_item_type" ON "public"."estimate_line_items" USING "btree" ("item_type");



CREATE INDEX "idx_estimate_suggestions_org" ON "public"."estimate_suggestions" USING "btree" ("organization_id");



CREATE INDEX "idx_estimate_suggestions_survey" ON "public"."estimate_suggestions" USING "btree" ("site_survey_id") WHERE ("site_survey_id" IS NOT NULL);



CREATE INDEX "idx_estimates_created_at" ON "public"."estimates" USING "btree" ("created_at");



CREATE INDEX "idx_estimates_customer_id" ON "public"."estimates" USING "btree" ("customer_id");



CREATE INDEX "idx_estimates_estimate_number" ON "public"."estimates" USING "btree" ("estimate_number");



CREATE INDEX "idx_estimates_location" ON "public"."estimates" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_estimates_organization_id" ON "public"."estimates" USING "btree" ("organization_id");



CREATE INDEX "idx_estimates_parent" ON "public"."estimates" USING "btree" ("parent_estimate_id");



CREATE INDEX "idx_estimates_root" ON "public"."estimates" USING "btree" ("estimate_root_id");



CREATE INDEX "idx_estimates_site_survey_id" ON "public"."estimates" USING "btree" ("site_survey_id");



CREATE INDEX "idx_estimates_site_survey_status" ON "public"."estimates" USING "btree" ("site_survey_id", "status");



CREATE INDEX "idx_estimates_status" ON "public"."estimates" USING "btree" ("status");



CREATE INDEX "idx_feedback_surveys_customer" ON "public"."feedback_surveys" USING "btree" ("customer_id");



CREATE INDEX "idx_feedback_surveys_job" ON "public"."feedback_surveys" USING "btree" ("job_id");



CREATE INDEX "idx_feedback_surveys_org" ON "public"."feedback_surveys" USING "btree" ("organization_id");



CREATE INDEX "idx_feedback_surveys_status" ON "public"."feedback_surveys" USING "btree" ("status");



CREATE INDEX "idx_feedback_surveys_testimonial" ON "public"."feedback_surveys" USING "btree" ("testimonial_approved") WHERE ("testimonial_approved" = true);



CREATE INDEX "idx_feedback_surveys_token" ON "public"."feedback_surveys" USING "btree" ("access_token");



CREATE INDEX "idx_follow_ups_assigned" ON "public"."follow_ups" USING "btree" ("assigned_to", "completed_at", "due_date") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_follow_ups_entity" ON "public"."follow_ups" USING "btree" ("entity_type", "entity_id", "completed_at", "due_date");



CREATE INDEX "idx_follow_ups_org_pending" ON "public"."follow_ups" USING "btree" ("organization_id", "completed_at", "due_date");



CREATE INDEX "idx_industry_events_category" ON "public"."industry_events" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_industry_events_org_start" ON "public"."industry_events" USING "btree" ("organization_id", "start_at");



CREATE UNIQUE INDEX "idx_industry_events_source_ref" ON "public"."industry_events" USING "btree" ("organization_id", "source", "source_ref") WHERE (("source" IS NOT NULL) AND ("source_ref" IS NOT NULL));



CREATE INDEX "idx_invoice_attached_documents_document" ON "public"."invoice_attached_documents" USING "btree" ("job_document_id");



CREATE INDEX "idx_invoice_attached_documents_invoice" ON "public"."invoice_attached_documents" USING "btree" ("invoice_id");



CREATE INDEX "idx_invoice_items_invoice" ON "public"."invoice_line_items" USING "btree" ("invoice_id");



CREATE UNIQUE INDEX "idx_invoices_access_token" ON "public"."invoices" USING "btree" ("access_token") WHERE ("access_token" IS NOT NULL);



CREATE INDEX "idx_invoices_customer" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_invoices_customer_id" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "idx_invoices_due" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "idx_invoices_invoice_number" ON "public"."invoices" USING "btree" ("invoice_number");



CREATE INDEX "idx_invoices_job" ON "public"."invoices" USING "btree" ("job_id");



CREATE INDEX "idx_invoices_location" ON "public"."invoices" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_invoices_number" ON "public"."invoices" USING "btree" ("organization_id", "invoice_number");



CREATE INDEX "idx_invoices_org" ON "public"."invoices" USING "btree" ("organization_id");



CREATE INDEX "idx_invoices_status" ON "public"."invoices" USING "btree" ("status");



CREATE INDEX "idx_invoices_stripe" ON "public"."billing_invoices" USING "btree" ("stripe_invoice_id");



CREATE INDEX "idx_job_change_orders_job" ON "public"."job_change_orders" USING "btree" ("job_id");



CREATE INDEX "idx_job_completion_checklists_category" ON "public"."job_completion_checklists" USING "btree" ("category");



CREATE INDEX "idx_job_completion_checklists_job" ON "public"."job_completion_checklists" USING "btree" ("job_id");



CREATE INDEX "idx_job_completion_photos_job" ON "public"."job_completion_photos" USING "btree" ("job_id");



CREATE INDEX "idx_job_completion_photos_type" ON "public"."job_completion_photos" USING "btree" ("photo_type");



CREATE INDEX "idx_job_completions_job" ON "public"."job_completions" USING "btree" ("job_id");



CREATE INDEX "idx_job_completions_status" ON "public"."job_completions" USING "btree" ("status");



CREATE INDEX "idx_job_crew_job" ON "public"."job_crew" USING "btree" ("job_id");



CREATE INDEX "idx_job_crew_profile" ON "public"."job_crew" USING "btree" ("profile_id");



CREATE INDEX "idx_job_disposal_job" ON "public"."job_disposal" USING "btree" ("job_id");



CREATE INDEX "idx_job_documents_job" ON "public"."job_documents" USING "btree" ("job_id", "uploaded_at" DESC);



CREATE INDEX "idx_job_documents_org_category" ON "public"."job_documents" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_job_equipment_job" ON "public"."job_equipment" USING "btree" ("job_id");



CREATE INDEX "idx_job_material_usage_job" ON "public"."job_material_usage" USING "btree" ("job_id");



CREATE INDEX "idx_job_material_usage_material" ON "public"."job_material_usage" USING "btree" ("job_material_id");



CREATE INDEX "idx_job_materials_job" ON "public"."job_materials" USING "btree" ("job_id");



CREATE INDEX "idx_job_notes_job" ON "public"."job_notes" USING "btree" ("job_id");



CREATE INDEX "idx_job_notes_job_type" ON "public"."job_notes" USING "btree" ("job_id", "note_type", "created_at" DESC);



CREATE INDEX "idx_job_time_entries_date" ON "public"."job_time_entries" USING "btree" ("work_date");



CREATE INDEX "idx_job_time_entries_job" ON "public"."job_time_entries" USING "btree" ("job_id");



CREATE INDEX "idx_job_time_entries_profile" ON "public"."job_time_entries" USING "btree" ("profile_id");



CREATE INDEX "idx_jobs_assigned_to" ON "public"."jobs" USING "btree" ("assigned_to") WHERE ("assigned_to" IS NOT NULL);



CREATE INDEX "idx_jobs_company" ON "public"."jobs" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_jobs_containment" ON "public"."jobs" USING "btree" ("containment_level") WHERE ("containment_level" IS NOT NULL);



CREATE INDEX "idx_jobs_crew_lead" ON "public"."jobs" USING "btree" ("crew_lead_id") WHERE ("crew_lead_id" IS NOT NULL);



CREATE INDEX "idx_jobs_customer" ON "public"."jobs" USING "btree" ("customer_id");



CREATE INDEX "idx_jobs_invoice" ON "public"."jobs" USING "btree" ("invoice_id") WHERE ("invoice_id" IS NOT NULL);



CREATE INDEX "idx_jobs_location" ON "public"."jobs" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_jobs_opportunity" ON "public"."jobs" USING "btree" ("opportunity_id") WHERE ("opportunity_id" IS NOT NULL);



CREATE INDEX "idx_jobs_org" ON "public"."jobs" USING "btree" ("organization_id");



CREATE INDEX "idx_jobs_org_customer_status" ON "public"."jobs" USING "btree" ("organization_id", "customer_id", "status");



CREATE INDEX "idx_jobs_org_scheduled" ON "public"."jobs" USING "btree" ("organization_id", "scheduled_start_date") WHERE (("status")::"text" = 'scheduled'::"text");



CREATE INDEX "idx_jobs_primary_contact" ON "public"."jobs" USING "btree" ("primary_contact_id") WHERE ("primary_contact_id" IS NOT NULL);



CREATE INDEX "idx_jobs_property" ON "public"."jobs" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_jobs_proposal" ON "public"."jobs" USING "btree" ("proposal_id");



CREATE INDEX "idx_jobs_referral" ON "public"."jobs" USING "btree" ("referral_job_id") WHERE ("referral_job_id" IS NOT NULL);



CREATE INDEX "idx_jobs_scheduled_date" ON "public"."jobs" USING "btree" ("scheduled_start_date");



CREATE INDEX "idx_jobs_status" ON "public"."jobs" USING "btree" ("status");



CREATE INDEX "idx_lab_report_samples_org" ON "public"."lab_report_samples" USING "btree" ("organization_id");



CREATE INDEX "idx_lab_report_samples_report" ON "public"."lab_report_samples" USING "btree" ("lab_report_id", "sort_order");



CREATE INDEX "idx_lab_reports_customer" ON "public"."lab_reports" USING "btree" ("customer_id");



CREATE INDEX "idx_lab_reports_estimate" ON "public"."lab_reports" USING "btree" ("estimate_id");



CREATE INDEX "idx_lab_reports_invoice" ON "public"."lab_reports" USING "btree" ("invoice_id");



CREATE INDEX "idx_lab_reports_location" ON "public"."lab_reports" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_lab_reports_ordered_date" ON "public"."lab_reports" USING "btree" ("ordered_date" DESC);



CREATE INDEX "idx_lab_reports_org" ON "public"."lab_reports" USING "btree" ("organization_id");



CREATE INDEX "idx_lab_reports_property" ON "public"."lab_reports" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_lab_reports_status" ON "public"."lab_reports" USING "btree" ("status");



CREATE INDEX "idx_lab_reports_work_order" ON "public"."lab_reports" USING "btree" ("work_order_id");



CREATE INDEX "idx_labor_rates_is_default" ON "public"."labor_rates" USING "btree" ("organization_id", "is_default");



CREATE INDEX "idx_labor_rates_organization_id" ON "public"."labor_rates" USING "btree" ("organization_id");



CREATE INDEX "idx_labs_org" ON "public"."labs" USING "btree" ("organization_id");



CREATE INDEX "idx_lead_endpoints_org" ON "public"."lead_webhook_endpoints" USING "btree" ("organization_id");



CREATE INDEX "idx_lead_endpoints_slug" ON "public"."lead_webhook_endpoints" USING "btree" ("slug");



CREATE INDEX "idx_lead_log_endpoint" ON "public"."lead_webhook_log" USING "btree" ("endpoint_id");



CREATE INDEX "idx_lead_log_status" ON "public"."lead_webhook_log" USING "btree" ("status");



CREATE INDEX "idx_location_users_location" ON "public"."location_users" USING "btree" ("location_id");



CREATE INDEX "idx_location_users_user" ON "public"."location_users" USING "btree" ("user_id");



CREATE INDEX "idx_locations_active" ON "public"."locations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_locations_org" ON "public"."locations" USING "btree" ("organization_id");



CREATE INDEX "idx_marketing_sync_log_org" ON "public"."marketing_sync_log" USING "btree" ("organization_id");



CREATE INDEX "idx_marketing_sync_log_type" ON "public"."marketing_sync_log" USING "btree" ("integration_type", "sync_type");



CREATE INDEX "idx_material_costs_organization_id" ON "public"."material_costs" USING "btree" ("organization_id");



CREATE INDEX "idx_notification_preferences_type" ON "public"."notification_preferences" USING "btree" ("notification_type");



CREATE INDEX "idx_notification_preferences_user" ON "public"."notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_entity" ON "public"."notifications" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_notifications_org" ON "public"."notifications" USING "btree" ("organization_id");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_opportunities_assessment" ON "public"."opportunities" USING "btree" ("created_from_assessment_id") WHERE ("created_from_assessment_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_company" ON "public"."opportunities" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_customer" ON "public"."opportunities" USING "btree" ("customer_id");



CREATE INDEX "idx_opportunities_follow_up" ON "public"."opportunities" USING "btree" ("follow_up_date") WHERE ("follow_up_date" IS NOT NULL);



CREATE INDEX "idx_opportunities_hazard_types" ON "public"."opportunities" USING "gin" ("hazard_types") WHERE ("hazard_types" IS NOT NULL);



CREATE INDEX "idx_opportunities_location" ON "public"."opportunities" USING "btree" ("organization_id", "location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_open_updated" ON "public"."opportunities" USING "btree" ("organization_id", "updated_at" DESC) WHERE ("outcome" IS NULL);



CREATE INDEX "idx_opportunities_org" ON "public"."opportunities" USING "btree" ("organization_id");



CREATE INDEX "idx_opportunities_outcome_updated" ON "public"."opportunities" USING "btree" ("organization_id", "outcome", "updated_at" DESC) WHERE ("outcome" IS NOT NULL);



CREATE INDEX "idx_opportunities_owner" ON "public"."opportunities" USING "btree" ("owner_id");



CREATE INDEX "idx_opportunities_primary_contact" ON "public"."opportunities" USING "btree" ("primary_contact_id") WHERE ("primary_contact_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_property" ON "public"."opportunities" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_site_contact" ON "public"."opportunities" USING "btree" ("site_contact_id") WHERE ("site_contact_id" IS NOT NULL);



CREATE INDEX "idx_opportunities_stage" ON "public"."opportunities" USING "btree" ("stage_id");



CREATE INDEX "idx_opportunities_status" ON "public"."opportunities" USING "btree" ("organization_id", "opportunity_status");



CREATE INDEX "idx_opportunities_urgency" ON "public"."opportunities" USING "btree" ("urgency") WHERE ("urgency" <> 'routine'::"public"."urgency_level");



CREATE INDEX "idx_opportunity_history_opp" ON "public"."opportunity_history" USING "btree" ("opportunity_id");



CREATE INDEX "idx_org_integrations_org" ON "public"."organization_integrations" USING "btree" ("organization_id");



CREATE INDEX "idx_org_integrations_type" ON "public"."organization_integrations" USING "btree" ("integration_type");



CREATE INDEX "idx_organization_document_shares_doc" ON "public"."organization_document_shares" USING "btree" ("document_id", "shared_at" DESC);



CREATE INDEX "idx_organization_document_shares_org" ON "public"."organization_document_shares" USING "btree" ("organization_id", "shared_at" DESC);



CREATE INDEX "idx_organization_documents_expires" ON "public"."organization_documents" USING "btree" ("organization_id", "expires_on") WHERE ("expires_on" IS NOT NULL);



CREATE INDEX "idx_organization_documents_org" ON "public"."organization_documents" USING "btree" ("organization_id", "category", "expires_on");



CREATE INDEX "idx_organizations_status" ON "public"."organizations" USING "btree" ("status");



CREATE INDEX "idx_organizations_subscription_tier" ON "public"."organizations" USING "btree" ("subscription_tier");



CREATE INDEX "idx_payment_methods_org" ON "public"."payment_methods" USING "btree" ("organization_id");



CREATE INDEX "idx_payments_invoice" ON "public"."payments" USING "btree" ("invoice_id");



CREATE INDEX "idx_payments_org" ON "public"."payments" USING "btree" ("organization_id");



CREATE INDEX "idx_photo_analyses_hash" ON "public"."photo_analyses" USING "btree" ("image_hash");



CREATE INDEX "idx_photo_analyses_job_photo" ON "public"."photo_analyses" USING "btree" ("job_photo_id") WHERE ("job_photo_id" IS NOT NULL);



CREATE INDEX "idx_photo_analyses_org" ON "public"."photo_analyses" USING "btree" ("organization_id");



CREATE INDEX "idx_pipeline_stages_active" ON "public"."pipeline_stages" USING "btree" ("organization_id", "is_active");



CREATE INDEX "idx_pipeline_stages_org" ON "public"."pipeline_stages" USING "btree" ("organization_id");



CREATE INDEX "idx_plans_active" ON "public"."subscription_plans" USING "btree" ("is_active", "is_public");



CREATE INDEX "idx_plans_slug" ON "public"."subscription_plans" USING "btree" ("slug");



CREATE INDEX "idx_pricing_settings_organization_id" ON "public"."pricing_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_profiles_calendar_feed_token" ON "public"."profiles" USING "btree" ("calendar_feed_token");



CREATE INDEX "idx_profiles_commission_plan" ON "public"."profiles" USING "btree" ("commission_plan_id");



CREATE INDEX "idx_profiles_platform_user" ON "public"."profiles" USING "btree" ("is_platform_user");



CREATE INDEX "idx_properties_normalized_trgm" ON "public"."properties" USING "gin" ("normalized_address" "extensions"."gin_trgm_ops");



CREATE INDEX "idx_properties_org_city_state" ON "public"."properties" USING "btree" ("organization_id", "state", "city");



CREATE UNIQUE INDEX "idx_properties_org_normalized" ON "public"."properties" USING "btree" ("organization_id", "normalized_address") WHERE ("normalized_address" <> ''::"text");



CREATE INDEX "idx_properties_property_type" ON "public"."properties" USING "btree" ("organization_id", "property_type") WHERE ("property_type" IS NOT NULL);



CREATE INDEX "idx_property_contacts_contact" ON "public"."property_contacts" USING "btree" ("contact_id", "is_current");



CREATE INDEX "idx_property_contacts_property" ON "public"."property_contacts" USING "btree" ("property_id", "is_current", "role");



CREATE INDEX "idx_proposals_access_token" ON "public"."proposals" USING "btree" ("access_token");



CREATE INDEX "idx_proposals_estimate_id" ON "public"."proposals" USING "btree" ("estimate_id");



CREATE INDEX "idx_proposals_organization_id" ON "public"."proposals" USING "btree" ("organization_id");



CREATE INDEX "idx_push_subscriptions_active" ON "public"."push_subscriptions" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_push_subscriptions_user" ON "public"."push_subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_report_exports_org" ON "public"."report_exports" USING "btree" ("organization_id");



CREATE INDEX "idx_review_requests_customer" ON "public"."review_requests" USING "btree" ("customer_id");



CREATE INDEX "idx_review_requests_org" ON "public"."review_requests" USING "btree" ("organization_id");



CREATE INDEX "idx_review_requests_platform" ON "public"."review_requests" USING "btree" ("platform");



CREATE INDEX "idx_review_requests_survey" ON "public"."review_requests" USING "btree" ("feedback_survey_id");



CREATE INDEX "idx_saved_reports_org" ON "public"."saved_reports" USING "btree" ("organization_id");



CREATE INDEX "idx_saved_reports_type" ON "public"."saved_reports" USING "btree" ("report_type");



CREATE INDEX "idx_scheduled_reminders_related" ON "public"."scheduled_reminders" USING "btree" ("related_type", "related_id");



CREATE INDEX "idx_scheduled_reminders_time" ON "public"."scheduled_reminders" USING "btree" ("scheduled_for", "status");



CREATE INDEX "idx_segment_members_customer" ON "public"."segment_members" USING "btree" ("customer_id");



CREATE INDEX "idx_segment_members_segment" ON "public"."segment_members" USING "btree" ("segment_id");



CREATE INDEX "idx_site_survey_photos_created_at" ON "public"."site_survey_photos" USING "btree" ("created_at");



CREATE INDEX "idx_site_survey_photos_site_survey_id" ON "public"."site_survey_photos" USING "btree" ("site_survey_id");



CREATE INDEX "idx_site_surveys_access_info" ON "public"."site_surveys" USING "gin" ("access_info");



CREATE INDEX "idx_site_surveys_appointment_status" ON "public"."site_surveys" USING "btree" ("appointment_status");



CREATE INDEX "idx_site_surveys_assigned_to" ON "public"."site_surveys" USING "btree" ("assigned_to");



CREATE INDEX "idx_site_surveys_created_at" ON "public"."site_surveys" USING "btree" ("created_at");



CREATE INDEX "idx_site_surveys_customer_id" ON "public"."site_surveys" USING "btree" ("customer_id");



CREATE INDEX "idx_site_surveys_customer_status" ON "public"."site_surveys" USING "btree" ("customer_id", "status");



CREATE INDEX "idx_site_surveys_environment_info" ON "public"."site_surveys" USING "gin" ("environment_info");



CREATE INDEX "idx_site_surveys_hazard_assessments" ON "public"."site_surveys" USING "gin" ("hazard_assessments");



CREATE INDEX "idx_site_surveys_location" ON "public"."site_surveys" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_site_surveys_organization_id" ON "public"."site_surveys" USING "btree" ("organization_id");



CREATE INDEX "idx_site_surveys_parent" ON "public"."site_surveys" USING "btree" ("parent_survey_id");



CREATE INDEX "idx_site_surveys_property" ON "public"."site_surveys" USING "btree" ("property_id") WHERE ("property_id" IS NOT NULL);



CREATE INDEX "idx_site_surveys_root" ON "public"."site_surveys" USING "btree" ("survey_root_id");



CREATE INDEX "idx_site_surveys_scheduled_date" ON "public"."site_surveys" USING "btree" ("scheduled_date");



CREATE INDEX "idx_site_surveys_scheduling" ON "public"."site_surveys" USING "btree" ("scheduled_date", "appointment_status", "assigned_to");



CREATE INDEX "idx_site_surveys_status" ON "public"."site_surveys" USING "btree" ("status");



CREATE INDEX "idx_sms_messages_customer" ON "public"."sms_messages" USING "btree" ("customer_id");



CREATE INDEX "idx_sms_messages_from_phone" ON "public"."sms_messages" USING "btree" ("from_phone") WHERE ("from_phone" IS NOT NULL);



CREATE INDEX "idx_sms_messages_org" ON "public"."sms_messages" USING "btree" ("organization_id");



CREATE INDEX "idx_sms_messages_org_customer_time" ON "public"."sms_messages" USING "btree" ("organization_id", "customer_id", "queued_at" DESC, "received_at" DESC);



CREATE INDEX "idx_sms_messages_recent_outbound_by_phone" ON "public"."sms_messages" USING "btree" ("to_phone", "queued_at" DESC) WHERE ("direction" = 'outbound'::"text");



CREATE INDEX "idx_sms_messages_status" ON "public"."sms_messages" USING "btree" ("status");



CREATE INDEX "idx_sms_messages_twilio_sid" ON "public"."sms_messages" USING "btree" ("twilio_message_sid");



CREATE INDEX "idx_sms_messages_type" ON "public"."sms_messages" USING "btree" ("message_type");



CREATE INDEX "idx_sms_settings_org" ON "public"."organization_sms_settings" USING "btree" ("organization_id");



CREATE INDEX "idx_sms_templates_org" ON "public"."sms_templates" USING "btree" ("organization_id");



CREATE INDEX "idx_sms_templates_type" ON "public"."sms_templates" USING "btree" ("message_type");



CREATE INDEX "idx_subscriptions_org" ON "public"."organization_subscriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_subscriptions_status" ON "public"."organization_subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe" ON "public"."organization_subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_survey_photos_area" ON "public"."site_survey_photos" USING "btree" ("area_id") WHERE ("area_id" IS NOT NULL);



CREATE INDEX "idx_survey_photos_company" ON "public"."survey_photos" USING "btree" ("company_id") WHERE ("company_id" IS NOT NULL);



CREATE INDEX "idx_survey_photos_customer" ON "public"."survey_photos" USING "btree" ("customer_id") WHERE ("customer_id" IS NOT NULL);



CREATE INDEX "idx_survey_photos_job" ON "public"."survey_photos" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_survey_photos_legacy_unique" ON "public"."survey_photos" USING "btree" ("site_survey_id", "legacy_id") WHERE ("legacy_id" IS NOT NULL);



CREATE INDEX "idx_survey_photos_lifecycle" ON "public"."survey_photos" USING "btree" ("tier", "expires_at") WHERE ("tier" <> 'deleted'::"text");



CREATE INDEX "idx_survey_photos_org" ON "public"."survey_photos" USING "btree" ("organization_id");



CREATE INDEX "idx_survey_photos_survey" ON "public"."survey_photos" USING "btree" ("site_survey_id");



CREATE INDEX "idx_sync_log_org" ON "public"."integration_sync_log" USING "btree" ("organization_id");



CREATE INDEX "idx_tenant_invitations_email" ON "public"."tenant_invitations" USING "btree" ("email");



CREATE INDEX "idx_tenant_invitations_token" ON "public"."tenant_invitations" USING "btree" ("token");



CREATE INDEX "idx_tenant_usage_organization_month" ON "public"."tenant_usage" USING "btree" ("organization_id", "month_year");



CREATE INDEX "idx_touchpoints_channel" ON "public"."attribution_touchpoints" USING "btree" ("organization_id", "channel") WHERE ("channel" IS NOT NULL);



CREATE INDEX "idx_touchpoints_date" ON "public"."attribution_touchpoints" USING "btree" ("touched_at");



CREATE INDEX "idx_touchpoints_entity" ON "public"."attribution_touchpoints" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_touchpoints_org" ON "public"."attribution_touchpoints" USING "btree" ("organization_id");



CREATE INDEX "idx_touchpoints_source" ON "public"."attribution_touchpoints" USING "btree" ("organization_id", "source") WHERE ("source" IS NOT NULL);



CREATE INDEX "idx_travel_rates_miles" ON "public"."travel_rates" USING "btree" ("organization_id", "min_miles", "max_miles");



CREATE INDEX "idx_travel_rates_organization_id" ON "public"."travel_rates" USING "btree" ("organization_id");



CREATE INDEX "idx_voice_transcriptions_context" ON "public"."voice_transcriptions" USING "btree" ("context_type", "context_id");



CREATE INDEX "idx_voice_transcriptions_org" ON "public"."voice_transcriptions" USING "btree" ("organization_id");



CREATE INDEX "idx_voice_transcriptions_user" ON "public"."voice_transcriptions" USING "btree" ("user_id");



CREATE INDEX "idx_webhook_deliveries_retry" ON "public"."webhook_deliveries" USING "btree" ("next_retry_at") WHERE (("status")::"text" = 'failed'::"text");



CREATE INDEX "idx_webhook_deliveries_status" ON "public"."webhook_deliveries" USING "btree" ("status");



CREATE INDEX "idx_webhook_deliveries_webhook" ON "public"."webhook_deliveries" USING "btree" ("webhook_id");



CREATE INDEX "idx_webhook_events_stripe" ON "public"."stripe_webhook_events" USING "btree" ("stripe_event_id");



CREATE INDEX "idx_webhooks_active" ON "public"."webhooks" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_webhooks_org" ON "public"."webhooks" USING "btree" ("organization_id");



CREATE INDEX "idx_work_order_documents_org_category" ON "public"."work_order_documents" USING "btree" ("organization_id", "category");



CREATE INDEX "idx_work_order_documents_work_order" ON "public"."work_order_documents" USING "btree" ("work_order_id", "uploaded_at" DESC);



CREATE INDEX "idx_work_order_vehicles_work_order" ON "public"."work_order_vehicles" USING "btree" ("work_order_id");



CREATE INDEX "idx_work_orders_job" ON "public"."work_orders" USING "btree" ("job_id");



CREATE INDEX "idx_work_orders_org" ON "public"."work_orders" USING "btree" ("organization_id");



CREATE INDEX "idx_work_orders_status" ON "public"."work_orders" USING "btree" ("status");



CREATE UNIQUE INDEX "mv_job_costs_pkey" ON "public"."mv_job_costs" USING "btree" ("job_id");



CREATE UNIQUE INDEX "mv_lead_source_roi_pkey" ON "public"."mv_lead_source_roi" USING "btree" ("organization_id", "source", "month");



CREATE UNIQUE INDEX "mv_sales_performance_pkey" ON "public"."mv_sales_performance" USING "btree" ("organization_id", "user_id", "month");



CREATE UNIQUE INDEX "uniq_commission_earnings_job_id" ON "public"."commission_earnings" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_estimates_chain_version" ON "public"."estimates" USING "btree" ("estimate_root_id", "version");



CREATE UNIQUE INDEX "uniq_estimates_org_number" ON "public"."estimates" USING "btree" ("organization_id", "estimate_number");



CREATE UNIQUE INDEX "uniq_estimates_v1_per_survey" ON "public"."estimates" USING "btree" ("site_survey_id") WHERE (("parent_estimate_id" IS NULL) AND ("site_survey_id" IS NOT NULL));



CREATE UNIQUE INDEX "uniq_invoices_job_id" ON "public"."invoices" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_invoices_org_number" ON "public"."invoices" USING "btree" ("organization_id", "invoice_number");



CREATE UNIQUE INDEX "uniq_job_completions_job_id" ON "public"."job_completions" USING "btree" ("job_id") WHERE ("job_id" IS NOT NULL);



CREATE UNIQUE INDEX "uniq_jobs_org_number" ON "public"."jobs" USING "btree" ("organization_id", "job_number");



CREATE UNIQUE INDEX "uniq_site_surveys_chain_version" ON "public"."site_surveys" USING "btree" ("survey_root_id", "version");



CREATE OR REPLACE TRIGGER "commission_period_lock" BEFORE INSERT OR DELETE OR UPDATE ON "public"."commission_earnings" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_commission_period_lock"();



CREATE OR REPLACE TRIGGER "companies_inherit_default_location" BEFORE INSERT ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "create_ai_settings_for_new_org" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_org_ai_settings"();



CREATE OR REPLACE TRIGGER "create_credential_types_for_new_org" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_credential_types"();



CREATE OR REPLACE TRIGGER "create_pipeline_stages_for_new_org" AFTER INSERT ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."create_default_pipeline_stages"();



CREATE OR REPLACE TRIGGER "customers_inherit_default_location" BEFORE INSERT ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "enforce_admin_address_companies" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('billing_address_line1', 'billing_address_line2', 'billing_city', 'billing_state', 'billing_zip', 'service_address_line1', 'service_address_line2', 'service_city', 'service_state', 'service_zip');



CREATE OR REPLACE TRIGGER "enforce_admin_address_customers" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('address_line1', 'address_line2', 'city', 'state', 'zip', 'property_id');



CREATE OR REPLACE TRIGGER "enforce_admin_address_jobs" BEFORE UPDATE ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('job_address', 'job_city', 'job_state', 'job_zip', 'property_id');



CREATE OR REPLACE TRIGGER "enforce_admin_address_opportunities" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('service_address_line1', 'service_address_line2', 'service_city', 'service_state', 'service_zip', 'property_id');



CREATE OR REPLACE TRIGGER "enforce_admin_address_properties" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('address_line1', 'address_line2', 'city', 'state', 'zip', 'latitude', 'longitude');



CREATE OR REPLACE TRIGGER "enforce_admin_address_site_surveys" BEFORE UPDATE ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_admin_for_address_change"('site_address', 'site_city', 'site_state', 'site_zip', 'property_id');



CREATE OR REPLACE TRIGGER "enforce_invoice_content_locked" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_invoice_content_locked"();



CREATE OR REPLACE TRIGGER "enforce_invoice_line_items_locked" BEFORE INSERT OR DELETE OR UPDATE ON "public"."invoice_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."enforce_invoice_line_items_locked"();



CREATE OR REPLACE TRIGGER "ensure_primary_contact_trigger" AFTER DELETE ON "public"."customer_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_primary_contact"();



CREATE OR REPLACE TRIGGER "estimates_inherit_default_location" BEFORE INSERT ON "public"."estimates" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "estimates_set_root" BEFORE INSERT ON "public"."estimates" FOR EACH ROW EXECUTE FUNCTION "public"."set_estimate_root_id"();



CREATE OR REPLACE TRIGGER "feedback_surveys_updated_at" BEFORE UPDATE ON "public"."feedback_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_feedback_surveys_updated_at"();



CREATE OR REPLACE TRIGGER "inherit_job_attribution" BEFORE INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_job_attribution"();



CREATE OR REPLACE TRIGGER "inherit_opp_attribution" BEFORE INSERT ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_opportunity_attribution"();



CREATE OR REPLACE TRIGGER "invoice_line_item_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."invoice_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_invoice_totals"();



CREATE OR REPLACE TRIGGER "invoice_self_recalc" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."recalculate_invoice_self_totals"();



CREATE OR REPLACE TRIGGER "invoices_inherit_default_location" BEFORE INSERT ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "job_change_order_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."job_change_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_change_order_total"();



CREATE OR REPLACE TRIGGER "job_completion_checklists_updated_at" BEFORE UPDATE ON "public"."job_completion_checklists" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_completion_checklists_updated_at"();



CREATE OR REPLACE TRIGGER "job_completions_updated_at" BEFORE UPDATE ON "public"."job_completions" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_completions_updated_at"();



CREATE OR REPLACE TRIGGER "job_crew_calc_hours" BEFORE INSERT OR UPDATE ON "public"."job_crew" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_crew_hours"();



CREATE OR REPLACE TRIGGER "job_time_entries_updated_at" BEFORE UPDATE ON "public"."job_time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_job_time_entries_updated_at"();



CREATE OR REPLACE TRIGGER "jobs_inherit_default_location" BEFORE INSERT ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "lab_reports_inherit_default_location" BEFORE INSERT ON "public"."lab_reports" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "opportunities_inherit_default_location" BEFORE INSERT ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "organizations_photo_retention_change" AFTER UPDATE OF "photo_retention_days" ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_survey_photo_expiry_for_org"();



CREATE OR REPLACE TRIGGER "payment_update_balance" AFTER INSERT OR DELETE OR UPDATE ON "public"."payments" FOR EACH ROW EXECUTE FUNCTION "public"."update_invoice_balance"();



CREATE OR REPLACE TRIGGER "property_contact_sync_current" BEFORE INSERT OR UPDATE ON "public"."property_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."sync_property_contact_current"();



CREATE OR REPLACE TRIGGER "recalculate_estimate_on_line_item_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."estimate_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recalculate_estimate"();



CREATE OR REPLACE TRIGGER "set_commission_periods_updated_at" BEFORE UPDATE ON "public"."commission_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_companies_updated_at" BEFORE UPDATE ON "public"."companies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_credential_types_updated_at" BEFORE UPDATE ON "public"."credential_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_credentials_updated_at" BEFORE UPDATE ON "public"."credentials" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_customer_contacts_updated_at" BEFORE UPDATE ON "public"."customer_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_lab_report_samples_updated_at" BEFORE UPDATE ON "public"."lab_report_samples" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_opportunities_updated_at" BEFORE UPDATE ON "public"."opportunities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_organization_subscriptions_updated_at" BEFORE UPDATE ON "public"."organization_subscriptions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_saved_reports_updated_at" BEFORE UPDATE ON "public"."saved_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_subscription_plans_updated_at" BEFORE UPDATE ON "public"."subscription_plans" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_customers" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_disposal_fees" BEFORE UPDATE ON "public"."disposal_fees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_equipment_rates" BEFORE UPDATE ON "public"."equipment_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_estimate_line_items" BEFORE UPDATE ON "public"."estimate_line_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_estimates" BEFORE UPDATE ON "public"."estimates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_industry_events" BEFORE UPDATE ON "public"."industry_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_invoices" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_labor_rates" BEFORE UPDATE ON "public"."labor_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_material_costs" BEFORE UPDATE ON "public"."material_costs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_pricing_settings" BEFORE UPDATE ON "public"."pricing_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_proposals" BEFORE UPDATE ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_site_survey_photos" BEFORE UPDATE ON "public"."site_survey_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_site_surveys" BEFORE UPDATE ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at_travel_rates" BEFORE UPDATE ON "public"."travel_rates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "site_surveys_inherit_default_location" BEFORE INSERT ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."inherit_creator_default_location"();



CREATE OR REPLACE TRIGGER "site_surveys_set_root" BEFORE INSERT ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."set_survey_root_id"();



CREATE OR REPLACE TRIGGER "survey_photos_updated_at" BEFORE UPDATE ON "public"."survey_photos" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "sync_primary_contact_trigger" AFTER INSERT OR UPDATE OF "is_primary", "name", "email", "phone", "mobile" ON "public"."customer_contacts" FOR EACH ROW WHEN (("new"."is_primary" = true)) EXECUTE FUNCTION "public"."sync_primary_contact"();



CREATE OR REPLACE TRIGGER "track_assessment_creation_trigger" AFTER INSERT ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."track_assessment_creation"();



CREATE OR REPLACE TRIGGER "track_photo_upload_trigger" AFTER INSERT ON "public"."photos" FOR EACH ROW EXECUTE FUNCTION "public"."track_photo_upload"();



CREATE OR REPLACE TRIGGER "track_photo_upload_trigger" AFTER INSERT ON "public"."site_survey_photos" FOR EACH ROW EXECUTE FUNCTION "public"."track_photo_upload"();



CREATE OR REPLACE TRIGGER "trg_activity_companies_del" AFTER DELETE ON "public"."companies" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('company');



CREATE OR REPLACE TRIGGER "trg_activity_companies_ins" AFTER INSERT ON "public"."companies" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('company');



CREATE OR REPLACE TRIGGER "trg_activity_companies_upd" AFTER UPDATE ON "public"."companies" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('company');



CREATE OR REPLACE TRIGGER "trg_activity_customers_del" AFTER DELETE ON "public"."customers" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('contact');



CREATE OR REPLACE TRIGGER "trg_activity_customers_ins" AFTER INSERT ON "public"."customers" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('contact');



CREATE OR REPLACE TRIGGER "trg_activity_customers_upd" AFTER UPDATE ON "public"."customers" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('contact');



CREATE OR REPLACE TRIGGER "trg_activity_estimates_del" AFTER DELETE ON "public"."estimates" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('estimate');



CREATE OR REPLACE TRIGGER "trg_activity_estimates_ins" AFTER INSERT ON "public"."estimates" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('estimate');



CREATE OR REPLACE TRIGGER "trg_activity_estimates_upd" AFTER UPDATE ON "public"."estimates" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('estimate');



CREATE OR REPLACE TRIGGER "trg_activity_follow_ups_del" AFTER DELETE ON "public"."follow_ups" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('follow_up');



CREATE OR REPLACE TRIGGER "trg_activity_follow_ups_ins" AFTER INSERT ON "public"."follow_ups" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('follow_up');



CREATE OR REPLACE TRIGGER "trg_activity_follow_ups_upd" AFTER UPDATE ON "public"."follow_ups" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('follow_up');



CREATE OR REPLACE TRIGGER "trg_activity_invoices_del" AFTER DELETE ON "public"."invoices" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('invoice');



CREATE OR REPLACE TRIGGER "trg_activity_invoices_ins" AFTER INSERT ON "public"."invoices" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('invoice');



CREATE OR REPLACE TRIGGER "trg_activity_invoices_upd" AFTER UPDATE ON "public"."invoices" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('invoice');



CREATE OR REPLACE TRIGGER "trg_activity_job_change_orders_del" AFTER DELETE ON "public"."job_change_orders" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('change_order');



CREATE OR REPLACE TRIGGER "trg_activity_job_change_orders_ins" AFTER INSERT ON "public"."job_change_orders" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('change_order');



CREATE OR REPLACE TRIGGER "trg_activity_job_change_orders_upd" AFTER UPDATE ON "public"."job_change_orders" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('change_order');



CREATE OR REPLACE TRIGGER "trg_activity_job_crew" AFTER INSERT OR DELETE OR UPDATE ON "public"."job_crew" FOR EACH ROW EXECUTE FUNCTION "public"."log_entity_activity"('job_crew');



CREATE OR REPLACE TRIGGER "trg_activity_job_documents_del" AFTER DELETE ON "public"."job_documents" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('document');



CREATE OR REPLACE TRIGGER "trg_activity_job_documents_ins" AFTER INSERT ON "public"."job_documents" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('document');



CREATE OR REPLACE TRIGGER "trg_activity_job_documents_upd" AFTER UPDATE ON "public"."job_documents" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('document');



CREATE OR REPLACE TRIGGER "trg_activity_job_notes_del" AFTER DELETE ON "public"."job_notes" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('job_note');



CREATE OR REPLACE TRIGGER "trg_activity_job_notes_ins" AFTER INSERT ON "public"."job_notes" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('job_note');



CREATE OR REPLACE TRIGGER "trg_activity_job_notes_upd" AFTER UPDATE ON "public"."job_notes" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('job_note');



CREATE OR REPLACE TRIGGER "trg_activity_jobs_del" AFTER DELETE ON "public"."jobs" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('job');



CREATE OR REPLACE TRIGGER "trg_activity_jobs_ins" AFTER INSERT ON "public"."jobs" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('job');



CREATE OR REPLACE TRIGGER "trg_activity_jobs_upd" AFTER UPDATE ON "public"."jobs" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('job');



CREATE OR REPLACE TRIGGER "trg_activity_opportunities_del" AFTER DELETE ON "public"."opportunities" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('opportunity');



CREATE OR REPLACE TRIGGER "trg_activity_opportunities_ins" AFTER INSERT ON "public"."opportunities" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('opportunity');



CREATE OR REPLACE TRIGGER "trg_activity_opportunities_upd" AFTER UPDATE ON "public"."opportunities" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('opportunity');



CREATE OR REPLACE TRIGGER "trg_activity_payments_del" AFTER DELETE ON "public"."payments" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('payment');



CREATE OR REPLACE TRIGGER "trg_activity_payments_ins" AFTER INSERT ON "public"."payments" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('payment');



CREATE OR REPLACE TRIGGER "trg_activity_payments_upd" AFTER UPDATE ON "public"."payments" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('payment');



CREATE OR REPLACE TRIGGER "trg_activity_properties_del" AFTER DELETE ON "public"."properties" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('property');



CREATE OR REPLACE TRIGGER "trg_activity_properties_ins" AFTER INSERT ON "public"."properties" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('property');



CREATE OR REPLACE TRIGGER "trg_activity_properties_upd" AFTER UPDATE ON "public"."properties" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('property');



CREATE OR REPLACE TRIGGER "trg_activity_property_contacts_del" AFTER DELETE ON "public"."property_contacts" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('property_contact');



CREATE OR REPLACE TRIGGER "trg_activity_property_contacts_ins" AFTER INSERT ON "public"."property_contacts" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('property_contact');



CREATE OR REPLACE TRIGGER "trg_activity_property_contacts_upd" AFTER UPDATE ON "public"."property_contacts" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('property_contact');



CREATE OR REPLACE TRIGGER "trg_activity_proposals_del" AFTER DELETE ON "public"."proposals" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('proposal');



CREATE OR REPLACE TRIGGER "trg_activity_proposals_ins" AFTER INSERT ON "public"."proposals" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('proposal');



CREATE OR REPLACE TRIGGER "trg_activity_proposals_upd" AFTER UPDATE ON "public"."proposals" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('proposal');



CREATE OR REPLACE TRIGGER "trg_activity_site_surveys_del" AFTER DELETE ON "public"."site_surveys" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('site_survey');



CREATE OR REPLACE TRIGGER "trg_activity_site_surveys_ins" AFTER INSERT ON "public"."site_surveys" FOR EACH ROW WHEN (("auth"."uid"() IS NOT NULL)) EXECUTE FUNCTION "public"."log_entity_activity"('site_survey');



CREATE OR REPLACE TRIGGER "trg_activity_site_surveys_upd" AFTER UPDATE ON "public"."site_surveys" FOR EACH ROW WHEN ((("auth"."uid"() IS NOT NULL) AND ("old".* IS DISTINCT FROM "new".*))) EXECUTE FUNCTION "public"."log_entity_activity"('site_survey');



CREATE OR REPLACE TRIGGER "trg_auto_invoice_on_job_completion" AFTER UPDATE OF "status" ON "public"."jobs" FOR EACH ROW WHEN (((("new"."status")::"text" = 'completed'::"text") AND (("old"."status")::"text" IS DISTINCT FROM 'completed'::"text"))) EXECUTE FUNCTION "public"."auto_invoice_on_job_completion"();



CREATE OR REPLACE TRIGGER "trg_create_job_from_signed_proposal" AFTER UPDATE OF "status" ON "public"."proposals" FOR EACH ROW EXECUTE FUNCTION "public"."create_job_from_signed_proposal"();



CREATE OR REPLACE TRIGGER "trg_email_sends_updated_at" BEFORE UPDATE ON "public"."email_sends" FOR EACH ROW EXECUTE FUNCTION "public"."touch_email_sends_updated_at"();



CREATE OR REPLACE TRIGGER "trg_guard_customer_delete" BEFORE DELETE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."guard_customer_delete"();



CREATE OR REPLACE TRIGGER "trg_guard_site_survey_delete" BEFORE DELETE ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."guard_site_survey_delete"();



CREATE OR REPLACE TRIGGER "trg_lab_reports_updated_at" BEFORE UPDATE ON "public"."lab_reports" FOR EACH ROW EXECUTE FUNCTION "public"."set_lab_reports_updated_at"();



CREATE OR REPLACE TRIGGER "trg_link_job_completion_to_job" AFTER INSERT ON "public"."job_completions" FOR EACH ROW EXECUTE FUNCTION "public"."link_job_completion_to_job"();



CREATE OR REPLACE TRIGGER "trg_prevent_profile_privilege_escalation" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_profile_privilege_escalation"();



CREATE OR REPLACE TRIGGER "trg_sync_opportunity_from_estimate" AFTER INSERT OR UPDATE OF "total", "status", "site_survey_id" ON "public"."estimates" FOR EACH ROW EXECUTE FUNCTION "public"."sync_opportunity_from_estimate"();



CREATE OR REPLACE TRIGGER "trg_sync_opportunity_from_job" AFTER INSERT OR UPDATE OF "opportunity_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."sync_opportunity_from_job"();



CREATE OR REPLACE TRIGGER "trg_sync_opportunity_from_survey" AFTER UPDATE OF "status" ON "public"."site_surveys" FOR EACH ROW EXECUTE FUNCTION "public"."sync_opportunity_from_survey"();



CREATE OR REPLACE TRIGGER "update_calendar_sync_events_updated_at" BEFORE UPDATE ON "public"."calendar_sync_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_company_stats_on_job_change" AFTER INSERT OR DELETE OR UPDATE OF "status", "actual_revenue", "customer_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_company_stats"();



CREATE OR REPLACE TRIGGER "update_custom_domains_updated_at" BEFORE UPDATE ON "public"."custom_domains" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_segments_updated_at" BEFORE UPDATE ON "public"."customer_segments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_customer_stats_on_job_change" AFTER INSERT OR DELETE OR UPDATE OF "status", "actual_revenue", "customer_id" ON "public"."jobs" FOR EACH ROW EXECUTE FUNCTION "public"."update_customer_stats"();



CREATE OR REPLACE TRIGGER "update_follow_ups_updated_at" BEFORE UPDATE ON "public"."follow_ups" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_job_documents_updated_at" BEFORE UPDATE ON "public"."job_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_lead_endpoints_updated_at" BEFORE UPDATE ON "public"."lead_webhook_endpoints" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organization_documents_updated_at" BEFORE UPDATE ON "public"."organization_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_organizations_updated_at" BEFORE UPDATE ON "public"."organizations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_platform_settings_updated_at" BEFORE UPDATE ON "public"."platform_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_properties_updated_at" BEFORE UPDATE ON "public"."properties" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_property_contacts_updated_at" BEFORE UPDATE ON "public"."property_contacts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_tenant_usage_updated_at" BEFORE UPDATE ON "public"."tenant_usage" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_users_count_on_profile_change" AFTER INSERT OR DELETE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_org_users_count"();



CREATE OR REPLACE TRIGGER "update_webhooks_updated_at" BEFORE UPDATE ON "public"."webhooks" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_work_order_documents_updated_at" BEFORE UPDATE ON "public"."work_order_documents" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "work_orders_updated_at" BEFORE UPDATE ON "public"."work_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_work_orders_updated_at"();



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."activity_log"
    ADD CONSTRAINT "activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_usage_log"
    ADD CONSTRAINT "ai_usage_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."api_keys"
    ADD CONSTRAINT "api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_request_log"
    ADD CONSTRAINT "api_request_log_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."api_request_log"
    ADD CONSTRAINT "api_request_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_level1_approver_fkey" FOREIGN KEY ("level1_approver") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_level2_approver_fkey" FOREIGN KEY ("level2_approver") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."approval_requests"
    ADD CONSTRAINT "approval_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."approval_thresholds"
    ADD CONSTRAINT "approval_thresholds_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "assessments_estimator_id_fkey" FOREIGN KEY ("estimator_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "assessments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attribution_touchpoints"
    ADD CONSTRAINT "attribution_touchpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attribution_touchpoints"
    ADD CONSTRAINT "attribution_touchpoints_referred_by_company_id_fkey" FOREIGN KEY ("referred_by_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attribution_touchpoints"
    ADD CONSTRAINT "attribution_touchpoints_referred_by_contact_id_fkey" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attribution_touchpoints"
    ADD CONSTRAINT "attribution_touchpoints_referred_by_job_id_fkey" FOREIGN KEY ("referred_by_job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_invoices"
    ADD CONSTRAINT "billing_invoices_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."organization_subscriptions"("id");



ALTER TABLE ONLY "public"."calendar_sync_events"
    ADD CONSTRAINT "calendar_sync_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."calendar_sync_events"
    ADD CONSTRAINT "calendar_sync_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."commission_plans"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."commission_earnings"
    ADD CONSTRAINT "commission_earnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_plans"
    ADD CONSTRAINT "commission_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_account_owner_id_fkey" FOREIGN KEY ("account_owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_referred_by_company_id_fkey" FOREIGN KEY ("referred_by_company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."companies"
    ADD CONSTRAINT "companies_referred_by_contact_id_fkey" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_alerts"
    ADD CONSTRAINT "credential_alerts_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "public"."credentials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credential_alerts"
    ADD CONSTRAINT "credential_alerts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credential_types"
    ADD CONSTRAINT "credential_types_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credential_types"
    ADD CONSTRAINT "credential_types_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credentials"
    ADD CONSTRAINT "credentials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."credentials"
    ADD CONSTRAINT "credentials_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."credentials"
    ADD CONSTRAINT "credentials_type_org_fkey" FOREIGN KEY ("credential_type_id", "organization_id") REFERENCES "public"."credential_types"("id", "organization_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."credentials"
    ADD CONSTRAINT "credentials_worker_org_fkey" FOREIGN KEY ("worker_id", "organization_id") REFERENCES "public"."profiles"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."custom_domains"
    ADD CONSTRAINT "custom_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_customer_id_org_fkey" FOREIGN KEY ("customer_id", "organization_id") REFERENCES "public"."customers"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_contacts"
    ADD CONSTRAINT "customer_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customer_segments"
    ADD CONSTRAINT "customer_segments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_account_owner_id_fkey" FOREIGN KEY ("account_owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_referred_by_contact_id_fkey" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disposal_fees"
    ADD CONSTRAINT "disposal_fees_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."email_sends"
    ADD CONSTRAINT "email_sends_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment_catalog"
    ADD CONSTRAINT "equipment_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_rates"
    ADD CONSTRAINT "equipment_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_attached_documents"
    ADD CONSTRAINT "estimate_attached_documents_attached_by_fkey" FOREIGN KEY ("attached_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimate_attached_documents"
    ADD CONSTRAINT "estimate_attached_documents_document_id_org_fkey" FOREIGN KEY ("document_id", "organization_id") REFERENCES "public"."organization_documents"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_attached_documents"
    ADD CONSTRAINT "estimate_attached_documents_estimate_id_org_fkey" FOREIGN KEY ("estimate_id", "organization_id") REFERENCES "public"."estimates"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_attached_documents"
    ADD CONSTRAINT "estimate_attached_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_line_items"
    ADD CONSTRAINT "estimate_line_items_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_suggestions"
    ADD CONSTRAINT "estimate_suggestions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimate_suggestions"
    ADD CONSTRAINT "estimate_suggestions_site_survey_id_fkey" FOREIGN KEY ("site_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_estimate_root_id_fkey" FOREIGN KEY ("estimate_root_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_parent_estimate_id_fkey" FOREIGN KEY ("parent_estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."estimates"
    ADD CONSTRAINT "estimates_site_survey_id_fkey" FOREIGN KEY ("site_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_surveys"
    ADD CONSTRAINT "feedback_surveys_testimonial_approved_by_fkey" FOREIGN KEY ("testimonial_approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."follow_ups"
    ADD CONSTRAINT "follow_ups_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_ups"
    ADD CONSTRAINT "follow_ups_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_ups"
    ADD CONSTRAINT "follow_ups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_ups"
    ADD CONSTRAINT "follow_ups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."industry_events"
    ADD CONSTRAINT "industry_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."industry_events"
    ADD CONSTRAINT "industry_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."integration_sync_log"
    ADD CONSTRAINT "integration_sync_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_attached_documents"
    ADD CONSTRAINT "invoice_attached_documents_attached_by_fkey" FOREIGN KEY ("attached_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoice_attached_documents"
    ADD CONSTRAINT "invoice_attached_documents_invoice_id_org_fkey" FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "public"."invoices"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_attached_documents"
    ADD CONSTRAINT "invoice_attached_documents_job_document_id_org_fkey" FOREIGN KEY ("job_document_id", "organization_id") REFERENCES "public"."job_documents"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_attached_documents"
    ADD CONSTRAINT "invoice_attached_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoice_line_items"
    ADD CONSTRAINT "invoice_line_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_change_orders"
    ADD CONSTRAINT "job_change_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_change_orders"
    ADD CONSTRAINT "job_change_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_change_orders"
    ADD CONSTRAINT "job_change_orders_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_completion_checklists"
    ADD CONSTRAINT "job_completion_checklists_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_completion_checklists"
    ADD CONSTRAINT "job_completion_checklists_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_completion_photos"
    ADD CONSTRAINT "job_completion_photos_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_completion_photos"
    ADD CONSTRAINT "job_completion_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_completions"
    ADD CONSTRAINT "job_completions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_completions"
    ADD CONSTRAINT "job_completions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_completions"
    ADD CONSTRAINT "job_completions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_crew"
    ADD CONSTRAINT "job_crew_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_crew"
    ADD CONSTRAINT "job_crew_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_disposal"
    ADD CONSTRAINT "job_disposal_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_job_id_org_fkey" FOREIGN KEY ("job_id", "organization_id") REFERENCES "public"."jobs"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_documents"
    ADD CONSTRAINT "job_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_equipment"
    ADD CONSTRAINT "job_equipment_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_material_usage"
    ADD CONSTRAINT "job_material_usage_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_material_usage"
    ADD CONSTRAINT "job_material_usage_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_material_usage"
    ADD CONSTRAINT "job_material_usage_job_material_id_fkey" FOREIGN KEY ("job_material_id") REFERENCES "public"."job_materials"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."job_materials"
    ADD CONSTRAINT "job_materials_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_notes"
    ADD CONSTRAINT "job_notes_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_time_entries"
    ADD CONSTRAINT "job_time_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."job_time_entries"
    ADD CONSTRAINT "job_time_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."job_time_entries"
    ADD CONSTRAINT "job_time_entries_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_completion_id_fkey" FOREIGN KEY ("completion_id") REFERENCES "public"."job_completions"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_crew_lead_id_fkey" FOREIGN KEY ("crew_lead_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_referral_job_id_fkey" FOREIGN KEY ("referral_job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_site_contact_id_fkey" FOREIGN KEY ("site_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."jobs"
    ADD CONSTRAINT "jobs_site_survey_id_fkey" FOREIGN KEY ("site_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_report_samples"
    ADD CONSTRAINT "lab_report_samples_lab_report_id_fkey" FOREIGN KEY ("lab_report_id") REFERENCES "public"."lab_reports"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_report_samples"
    ADD CONSTRAINT "lab_report_samples_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_estimate_id_fkey" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_lab_id_fkey" FOREIGN KEY ("lab_id") REFERENCES "public"."labs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_property_id_org_fkey" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lab_reports"
    ADD CONSTRAINT "lab_reports_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."labor_rates"
    ADD CONSTRAINT "labor_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."labs"
    ADD CONSTRAINT "labs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_webhook_endpoints"
    ADD CONSTRAINT "lead_webhook_endpoints_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_webhook_log"
    ADD CONSTRAINT "lead_webhook_log_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."lead_webhook_log"
    ADD CONSTRAINT "lead_webhook_log_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "public"."lead_webhook_endpoints"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lead_webhook_log"
    ADD CONSTRAINT "lead_webhook_log_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id");



ALTER TABLE ONLY "public"."lead_webhook_log"
    ADD CONSTRAINT "lead_webhook_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_users"
    ADD CONSTRAINT "location_users_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."location_users"
    ADD CONSTRAINT "location_users_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."location_users"
    ADD CONSTRAINT "location_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_vehicles"
    ADD CONSTRAINT "manifest_vehicles_driver_profile_id_fkey" FOREIGN KEY ("driver_profile_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_order_vehicles"
    ADD CONSTRAINT "manifest_vehicles_manifest_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "manifests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "manifests_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "manifests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."marketing_sync_log"
    ADD CONSTRAINT "marketing_sync_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."material_costs"
    ADD CONSTRAINT "material_costs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."materials_catalog"
    ADD CONSTRAINT "materials_catalog_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_created_from_assessment_id_fkey" FOREIGN KEY ("created_from_assessment_id") REFERENCES "public"."site_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_primary_contact_id_fkey" FOREIGN KEY ("primary_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_site_contact_id_fkey" FOREIGN KEY ("site_contact_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."opportunities"
    ADD CONSTRAINT "opportunities_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."opportunity_history"
    ADD CONSTRAINT "opportunity_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."opportunity_history"
    ADD CONSTRAINT "opportunity_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."opportunity_history"
    ADD CONSTRAINT "opportunity_history_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."opportunity_history"
    ADD CONSTRAINT "opportunity_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "public"."pipeline_stages"("id");



ALTER TABLE ONLY "public"."organization_ai_settings"
    ADD CONSTRAINT "organization_ai_settings_consent_granted_by_fkey" FOREIGN KEY ("consent_granted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_ai_settings"
    ADD CONSTRAINT "organization_ai_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_ai_settings"
    ADD CONSTRAINT "organization_ai_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "public"."organization_documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_email_send_id_fkey" FOREIGN KEY ("email_send_id") REFERENCES "public"."email_sends"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_document_shares"
    ADD CONSTRAINT "organization_document_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_documents"
    ADD CONSTRAINT "organization_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_integrations"
    ADD CONSTRAINT "organization_integrations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_sms_settings"
    ADD CONSTRAINT "organization_sms_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_subscriptions"
    ADD CONSTRAINT "organization_subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_ai_consent_user_id_fkey" FOREIGN KEY ("ai_consent_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_invoice_id_org_fkey" FOREIGN KEY ("invoice_id", "organization_id") REFERENCES "public"."invoices"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payments"
    ADD CONSTRAINT "payments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photo_analyses"
    ADD CONSTRAINT "photo_analyses_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."photos"
    ADD CONSTRAINT "photos_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."site_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."pipeline_stages"
    ADD CONSTRAINT "pipeline_stages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."pricing_settings"
    ADD CONSTRAINT "pricing_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_commission_plan_id_fkey" FOREIGN KEY ("commission_plan_id") REFERENCES "public"."commission_plans"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_default_location_id_fkey" FOREIGN KEY ("default_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."properties"
    ADD CONSTRAINT "properties_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_contact_id_org_fkey" FOREIGN KEY ("contact_id", "organization_id") REFERENCES "public"."customers"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_contacts"
    ADD CONSTRAINT "property_contacts_property_id_org_fkey" FOREIGN KEY ("property_id", "organization_id") REFERENCES "public"."properties"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_estimate_id_org_fkey" FOREIGN KEY ("estimate_id", "organization_id") REFERENCES "public"."estimates"("id", "organization_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposals"
    ADD CONSTRAINT "proposals_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_subscriptions"
    ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."report_exports"
    ADD CONSTRAINT "report_exports_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "public"."saved_reports"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_feedback_survey_id_fkey" FOREIGN KEY ("feedback_survey_id") REFERENCES "public"."feedback_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."review_requests"
    ADD CONSTRAINT "review_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_reports"
    ADD CONSTRAINT "saved_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."saved_reports"
    ADD CONSTRAINT "saved_reports_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."scheduled_reminders"
    ADD CONSTRAINT "scheduled_reminders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_members"
    ADD CONSTRAINT "segment_members_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."segment_members"
    ADD CONSTRAINT "segment_members_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."segment_members"
    ADD CONSTRAINT "segment_members_segment_id_fkey" FOREIGN KEY ("segment_id") REFERENCES "public"."customer_segments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_survey_photos"
    ADD CONSTRAINT "site_survey_photos_site_survey_id_fkey" FOREIGN KEY ("site_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_parent_survey_id_fkey" FOREIGN KEY ("parent_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."site_surveys"
    ADD CONSTRAINT "site_surveys_survey_root_id_fkey" FOREIGN KEY ("survey_root_id") REFERENCES "public"."site_surveys"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sms_messages"
    ADD CONSTRAINT "sms_messages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sms_templates"
    ADD CONSTRAINT "sms_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_photos"
    ADD CONSTRAINT "survey_photos_site_survey_id_fkey" FOREIGN KEY ("site_survey_id") REFERENCES "public"."site_surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_invitations"
    ADD CONSTRAINT "tenant_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_usage"
    ADD CONSTRAINT "tenant_usage_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."travel_rates"
    ADD CONSTRAINT "travel_rates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."voice_transcriptions"
    ADD CONSTRAINT "voice_transcriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_deliveries"
    ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhooks"
    ADD CONSTRAINT "webhooks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_documents"
    ADD CONSTRAINT "work_order_documents_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_order_documents"
    ADD CONSTRAINT "work_order_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."work_order_documents"
    ADD CONSTRAINT "work_order_documents_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."work_orders"
    ADD CONSTRAINT "work_orders_job_id_org_fkey" FOREIGN KEY ("job_id", "organization_id") REFERENCES "public"."jobs"("id", "organization_id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete companies in their organization" ON "public"."companies" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text"]))));



CREATE POLICY "Admins can delete customers in their organization" ON "public"."customers" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text"]))));



CREATE POLICY "Admins can delete estimates in their organization" ON "public"."estimates" FOR DELETE USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['tenant_owner'::"public"."user_role", 'admin'::"public"."user_role", 'platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Admins can delete site_surveys in their organization" ON "public"."site_surveys" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text"]))));



CREATE POLICY "Admins can manage disposal_fees in their organization" ON "public"."disposal_fees" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can manage equipment in their organization" ON "public"."equipment_catalog" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'estimator'::"public"."user_role", 'tenant_owner'::"public"."user_role"]))))));



CREATE POLICY "Admins can manage equipment_rates in their organization" ON "public"."equipment_rates" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can manage labor_rates in their organization" ON "public"."labor_rates" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can manage material_costs in their organization" ON "public"."material_costs" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can manage materials in their organization" ON "public"."materials_catalog" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'estimator'::"public"."user_role", 'tenant_owner'::"public"."user_role"]))))));



CREATE POLICY "Admins can manage payment methods" ON "public"."payment_methods" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"])))))));



CREATE POLICY "Admins can manage pricing_settings in their organization" ON "public"."pricing_settings" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can manage travel_rates in their organization" ON "public"."travel_rates" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "Admins can update their org AI settings" ON "public"."organization_ai_settings" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Admins can update their organization" ON "public"."organizations" FOR UPDATE USING (((("id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text"]))) OR ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "Admins can view payment methods" ON "public"."payment_methods" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Admins manage approval_thresholds" ON "public"."approval_thresholds" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"])))))));



CREATE POLICY "Admins manage commissions" ON "public"."commission_earnings" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"])))))));



CREATE POLICY "Admins manage org commission periods" ON "public"."commission_periods" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "commission_periods"."organization_id") AND ("p"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role", 'tenant_owner'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Allow organization creation with rate limit" ON "public"."organizations" FOR INSERT WITH CHECK ((("auth"."uid"() IS NOT NULL) AND ("public"."get_user_organization_id"() IS NULL)));



CREATE POLICY "Org access approval_requests" ON "public"."approval_requests" USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Org admins can manage AI settings" ON "public"."organization_ai_settings" USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"]))))))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"])))))));



CREATE POLICY "Org admins can view AI usage logs" ON "public"."ai_usage_log" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"])))))));



CREATE POLICY "Org members can view AI settings" ON "public"."organization_ai_settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Plans are publicly readable" ON "public"."subscription_plans" FOR SELECT USING ((("is_active" = true) AND ("is_public" = true)));



CREATE POLICY "Platform access cron_runs" ON "public"."cron_runs" USING (("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"]))) WITH CHECK (("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"])));



CREATE POLICY "Platform admins can manage plans" ON "public"."subscription_plans" USING ((EXISTS ( SELECT 1
   FROM ("public"."organizations" "o"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "o"."id")))
  WHERE (("p"."id" = "auth"."uid"()) AND ("o"."is_platform_admin" = true)))));



CREATE POLICY "Platform owners access all commission periods" ON "public"."commission_periods" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all customers" ON "public"."customers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all disposal fees" ON "public"."disposal_fees" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all equipment rates" ON "public"."equipment_rates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all invoices" ON "public"."invoices" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all labor rates" ON "public"."labor_rates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all material costs" ON "public"."material_costs" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all payments" ON "public"."payments" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all pricing settings" ON "public"."pricing_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all site survey photos" ON "public"."site_survey_photos" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all site surveys" ON "public"."site_surveys" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can access all travel rates" ON "public"."travel_rates" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'platform_owner'::"public"."user_role")))));



CREATE POLICY "Platform owners can manage platform settings" ON "public"."platform_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform owners can view stripe webhook events" ON "public"."stripe_webhook_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform users can view all SMS messages" ON "public"."sms_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform users can view all SMS settings" ON "public"."organization_sms_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform users can view all audit logs" ON "public"."audit_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform users can view all invitations" ON "public"."tenant_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Platform users can view all tenant usage" ON "public"."tenant_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"]))))));



CREATE POLICY "Service role manages email sends" ON "public"."email_sends" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "System can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can insert AI usage logs" ON "public"."ai_usage_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can insert API request logs" ON "public"."api_request_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can insert lead logs" ON "public"."lead_webhook_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can insert marketing sync logs" ON "public"."marketing_sync_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can insert sync logs" ON "public"."integration_sync_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "System can manage webhook deliveries" ON "public"."webhook_deliveries" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can create activity logs" ON "public"."activity_log" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can create companies in their organization" ON "public"."companies" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can create customers in their organization" ON "public"."customers" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can create exports" ON "public"."report_exports" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can create photos for assessments in their organization" ON "public"."photos" FOR INSERT WITH CHECK ((("assessment_id" IN ( SELECT "a"."id"
   FROM ("public"."site_surveys" "a"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "a"."organization_id")))
  WHERE ("p"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "Users can delete contacts in their organization" ON "public"."customer_contacts" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can delete photos for assessments in their organization" ON "public"."photos" FOR DELETE USING ((("assessment_id" IN ( SELECT "a"."id"
   FROM ("public"."site_surveys" "a"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "a"."organization_id")))
  WHERE ("p"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "Users can delete their org SMS templates" ON "public"."sms_templates" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("is_system" = false) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can insert audit logs for their own org" ON "public"."audit_log" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) OR ("organization_id" IS NULL)));



CREATE POLICY "Users can insert contacts in their organization" ON "public"."customer_contacts" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can insert usage for their own org" ON "public"."tenant_usage" FOR INSERT WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can manage invitations for their organization" ON "public"."tenant_invitations" USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"]))))));



CREATE POLICY "Users can manage own reports" ON "public"."saved_reports" USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("created_by" = "auth"."uid"())));



CREATE POLICY "Users can manage scheduled reminders for their org" ON "public"."scheduled_reminders" USING (("organization_id" = "public"."get_user_organization_id"())) WITH CHECK (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can manage their notification preferences" ON "public"."notification_preferences" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their org SMS templates" ON "public"."sms_templates" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can manage their push subscriptions" ON "public"."push_subscriptions" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update companies in their organization" ON "public"."companies" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can update contacts in their organization" ON "public"."customer_contacts" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can update customers in their organization" ON "public"."customers" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can update photos for assessments in their organization" ON "public"."photos" FOR UPDATE USING ((("assessment_id" IN ( SELECT "a"."id"
   FROM ("public"."site_surveys" "a"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "a"."organization_id")))
  WHERE ("p"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "Users can update their org SMS templates" ON "public"."sms_templates" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("is_system" = false) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update usage for their own org" ON "public"."tenant_usage" FOR UPDATE USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view audit logs for their organization" ON "public"."audit_log" FOR SELECT USING ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR ("organization_id" IS NULL)));



CREATE POLICY "Users can view companies in their organization" ON "public"."companies" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view contacts in their organization" ON "public"."customer_contacts" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view customers in their organization" ON "public"."customers" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view disposal_fees in their organization" ON "public"."disposal_fees" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view equipment in their organization" ON "public"."equipment_catalog" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view equipment_rates in their organization" ON "public"."equipment_rates" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view estimates in their organization" ON "public"."estimates" FOR SELECT USING ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"])))))));



CREATE POLICY "Users can view invoices in their organization" ON "public"."invoices" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "invoices"."organization_id")))));



CREATE POLICY "Users can view labor_rates in their organization" ON "public"."labor_rates" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view line items for their estimates" ON "public"."estimate_line_items" FOR SELECT USING ((("estimate_id" IN ( SELECT "estimates"."id"
   FROM "public"."estimates"
  WHERE ("estimates"."organization_id" IN ( SELECT "profiles"."organization_id"
           FROM "public"."profiles"
          WHERE ("profiles"."id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"])))))));



CREATE POLICY "Users can view material_costs in their organization" ON "public"."material_costs" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view materials in their organization" ON "public"."materials_catalog" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view org exports" ON "public"."report_exports" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view own and shared reports" ON "public"."saved_reports" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND (("created_by" = "auth"."uid"()) OR ("is_shared" = true))));



CREATE POLICY "Users can view payments in their organization" ON "public"."payments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "payments"."organization_id")))));



CREATE POLICY "Users can view photos for assessments in their organization" ON "public"."photos" FOR SELECT USING (("assessment_id" IN ( SELECT "a"."id"
   FROM ("public"."site_surveys" "a"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "a"."organization_id")))
  WHERE ("p"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view pricing_settings in their organization" ON "public"."pricing_settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view proposals in their organization" ON "public"."proposals" FOR SELECT USING ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"])))))));



CREATE POLICY "Users can view site_surveys in their organization" ON "public"."site_surveys" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view system and org SMS templates" ON "public"."sms_templates" FOR SELECT USING ((("organization_id" IS NULL) OR ("organization_id" = "public"."get_user_organization_id"())));



CREATE POLICY "Users can view their org AI settings" ON "public"."organization_ai_settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org API request logs" ON "public"."api_request_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org activity" ON "public"."activity_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org email sends" ON "public"."email_sends" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org invoices" ON "public"."billing_invoices" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org lead logs" ON "public"."lead_webhook_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org marketing sync logs" ON "public"."marketing_sync_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org subscription" ON "public"."organization_subscriptions" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org sync logs" ON "public"."integration_sync_log" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their org webhook deliveries" ON "public"."webhook_deliveries" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users can view their organization's usage" ON "public"."tenant_usage" FOR SELECT USING (("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own organization" ON "public"."organizations" FOR SELECT USING ((("id" = "public"."get_user_organization_id"()) OR ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "Users can view travel_rates in their organization" ON "public"."travel_rates" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users see own commissions" ON "public"."commission_earnings" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND (("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'tenant_owner'::"public"."user_role"]))))))));



CREATE POLICY "Users view approval_thresholds" ON "public"."approval_thresholds" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "Users view org commission periods" ON "public"."commission_periods" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "commission_periods"."organization_id")))));



ALTER TABLE "public"."activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_usage_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "api_keys_delete_admin" ON "public"."api_keys" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "api_keys_insert_admin" ON "public"."api_keys" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "api_keys_select_admin" ON "public"."api_keys" FOR SELECT USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "api_keys_update_admin" ON "public"."api_keys" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."api_request_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_thresholds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attribution_touchpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attribution_touchpoints_delete_write_roles" ON "public"."attribution_touchpoints" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "attribution_touchpoints_insert_write_roles" ON "public"."attribution_touchpoints" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "attribution_touchpoints_select_org" ON "public"."attribution_touchpoints" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "attribution_touchpoints_update_write_roles" ON "public"."attribution_touchpoints" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_invoices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."calendar_sync_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "calendar_sync_events_delete_admin" ON "public"."calendar_sync_events" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "calendar_sync_events_insert_admin" ON "public"."calendar_sync_events" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "calendar_sync_events_select_org" ON "public"."calendar_sync_events" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "calendar_sync_events_update_admin" ON "public"."calendar_sync_events" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."commission_earnings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_periods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_plans" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commission_plans_delete_admin" ON "public"."commission_plans" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "commission_plans_insert_admin" ON "public"."commission_plans" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "commission_plans_select_org" ON "public"."commission_plans" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "commission_plans_update_admin" ON "public"."commission_plans" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."credential_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_alerts_delete" ON "public"."credential_alerts" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "credential_alerts_select" ON "public"."credential_alerts" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



ALTER TABLE "public"."credential_types" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credential_types_delete" ON "public"."credential_types" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "credential_types_insert" ON "public"."credential_types" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "credential_types_select" ON "public"."credential_types" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "credential_types_update" ON "public"."credential_types" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



ALTER TABLE "public"."credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "credentials_delete" ON "public"."credentials" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "credentials_insert" ON "public"."credentials" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



CREATE POLICY "credentials_select" ON "public"."credentials" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "credentials_update" ON "public"."credentials" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['admin'::"text", 'tenant_owner'::"text", 'platform_owner'::"text", 'platform_admin'::"text"]))));



ALTER TABLE "public"."cron_runs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."custom_domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "custom_domains_delete_admin" ON "public"."custom_domains" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "custom_domains_insert_admin" ON "public"."custom_domains" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "custom_domains_select_org" ON "public"."custom_domains" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "custom_domains_update_admin" ON "public"."custom_domains" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."customer_contacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customer_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customer_segments_delete_write_roles" ON "public"."customer_segments" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "customer_segments_insert_write_roles" ON "public"."customer_segments" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "customer_segments_select_org" ON "public"."customer_segments" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "customer_segments_update_write_roles" ON "public"."customer_segments" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."disposal_fees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_sends" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."estimate_attached_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estimate_attached_documents_delete_write_roles" ON "public"."estimate_attached_documents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_attached_documents_insert_write_roles" ON "public"."estimate_attached_documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_attached_documents_select_org" ON "public"."estimate_attached_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "estimate_attached_documents_update_write_roles" ON "public"."estimate_attached_documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."estimate_line_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estimate_line_items_delete_write_roles" ON "public"."estimate_line_items" FOR DELETE USING ((("estimate_id" IN ( SELECT "estimates"."id"
   FROM "public"."estimates"
  WHERE (("estimates"."organization_id" = "public"."get_user_organization_id"()) AND ("estimates"."status" = ANY (ARRAY['draft'::"public"."estimate_status", 'pending_approval'::"public"."estimate_status"]))))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_line_items_insert_write_roles" ON "public"."estimate_line_items" FOR INSERT WITH CHECK ((("estimate_id" IN ( SELECT "estimates"."id"
   FROM "public"."estimates"
  WHERE (("estimates"."organization_id" = "public"."get_user_organization_id"()) AND ("estimates"."status" = ANY (ARRAY['draft'::"public"."estimate_status", 'pending_approval'::"public"."estimate_status"]))))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_line_items_update_write_roles" ON "public"."estimate_line_items" FOR UPDATE USING ((("estimate_id" IN ( SELECT "estimates"."id"
   FROM "public"."estimates"
  WHERE (("estimates"."organization_id" = "public"."get_user_organization_id"()) AND ("estimates"."status" = ANY (ARRAY['draft'::"public"."estimate_status", 'pending_approval'::"public"."estimate_status"]))))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("estimate_id" IN ( SELECT "estimates"."id"
   FROM "public"."estimates"
  WHERE (("estimates"."organization_id" = "public"."get_user_organization_id"()) AND ("estimates"."status" = ANY (ARRAY['draft'::"public"."estimate_status", 'pending_approval'::"public"."estimate_status"]))))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."estimate_suggestions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estimate_suggestions_delete_write_roles" ON "public"."estimate_suggestions" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_suggestions_insert_write_roles" ON "public"."estimate_suggestions" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimate_suggestions_select_org" ON "public"."estimate_suggestions" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "estimate_suggestions_update_write_roles" ON "public"."estimate_suggestions" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."estimates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "estimates_insert_write_roles" ON "public"."estimates" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "estimates_update_write_roles" ON "public"."estimates" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."feedback_surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_surveys_delete_write_roles" ON "public"."feedback_surveys" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "feedback_surveys_insert_write_roles" ON "public"."feedback_surveys" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "feedback_surveys_select_org" ON "public"."feedback_surveys" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "feedback_surveys_update_write_roles" ON "public"."feedback_surveys" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."follow_ups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "follow_ups_delete_write_roles" ON "public"."follow_ups" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "follow_ups_insert_write_roles" ON "public"."follow_ups" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "follow_ups_select_org" ON "public"."follow_ups" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "follow_ups_update_write_roles" ON "public"."follow_ups" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."industry_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "industry_events_delete" ON "public"."industry_events" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "industry_events_insert" ON "public"."industry_events" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "industry_events_select" ON "public"."industry_events" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "industry_events_update" ON "public"."industry_events" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."integration_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invoice_attached_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_attached_documents_delete_write_roles" ON "public"."invoice_attached_documents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoice_attached_documents_insert_write_roles" ON "public"."invoice_attached_documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoice_attached_documents_select_org" ON "public"."invoice_attached_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "invoice_attached_documents_update_write_roles" ON "public"."invoice_attached_documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."invoice_line_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoice_line_items_delete_write_roles" ON "public"."invoice_line_items" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "i"."organization_id")))
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND ("p"."id" = "auth"."uid"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoice_line_items_insert_write_roles" ON "public"."invoice_line_items" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "i"."organization_id")))
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND ("p"."id" = "auth"."uid"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoice_line_items_select_org" ON "public"."invoice_line_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "i"."organization_id")))
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND ("p"."id" = "auth"."uid"())))));



CREATE POLICY "invoice_line_items_update_write_roles" ON "public"."invoice_line_items" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."invoices" "i"
     JOIN "public"."profiles" "p" ON (("p"."organization_id" = "i"."organization_id")))
  WHERE (("i"."id" = "invoice_line_items"."invoice_id") AND ("p"."id" = "auth"."uid"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_delete_write_roles" ON "public"."invoices" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoices_insert_write_roles" ON "public"."invoices" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "invoices_update_write_roles" ON "public"."invoices" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."job_change_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_change_orders_delete_field_roles" ON "public"."job_change_orders" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_change_orders"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_change_orders_insert_field_roles" ON "public"."job_change_orders" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_change_orders"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_change_orders_select_org" ON "public"."job_change_orders" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_change_orders"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_change_orders_update_field_roles" ON "public"."job_change_orders" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_change_orders"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_completion_checklists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_completion_checklists_delete_field_roles" ON "public"."job_completion_checklists" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_checklists"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completion_checklists_insert_field_roles" ON "public"."job_completion_checklists" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_checklists"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completion_checklists_select_org" ON "public"."job_completion_checklists" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_checklists"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_completion_checklists_update_field_roles" ON "public"."job_completion_checklists" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_checklists"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_completion_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_completion_photos_delete_field_roles" ON "public"."job_completion_photos" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_photos"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completion_photos_insert_field_roles" ON "public"."job_completion_photos" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_photos"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completion_photos_select_org" ON "public"."job_completion_photos" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_photos"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_completion_photos_update_field_roles" ON "public"."job_completion_photos" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completion_photos"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_completions_delete_field_roles" ON "public"."job_completions" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completions"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completions_insert_field_roles" ON "public"."job_completions" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completions"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_completions_select_org" ON "public"."job_completions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completions"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_completions_update_field_roles" ON "public"."job_completions" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_completions"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_crew" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_crew_delete_field_roles" ON "public"."job_crew" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_crew"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_crew_insert_field_roles" ON "public"."job_crew" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_crew"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_crew_select_org" ON "public"."job_crew" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_crew"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_crew_update_field_roles" ON "public"."job_crew" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_crew"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_disposal" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_disposal_delete_field_roles" ON "public"."job_disposal" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_disposal"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_disposal_insert_field_roles" ON "public"."job_disposal" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_disposal"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_disposal_select_org" ON "public"."job_disposal" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_disposal"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_disposal_update_field_roles" ON "public"."job_disposal" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_disposal"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_documents_delete_field_roles" ON "public"."job_documents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_documents_insert_field_roles" ON "public"."job_documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_documents_select_org" ON "public"."job_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "job_documents_update_field_roles" ON "public"."job_documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_equipment" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_equipment_delete_field_roles" ON "public"."job_equipment" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_equipment"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_equipment_insert_field_roles" ON "public"."job_equipment" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_equipment"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_equipment_select_org" ON "public"."job_equipment" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_equipment"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_equipment_update_field_roles" ON "public"."job_equipment" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_equipment"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_material_usage" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_material_usage_delete_field_roles" ON "public"."job_material_usage" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_material_usage"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_material_usage_insert_field_roles" ON "public"."job_material_usage" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_material_usage"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_material_usage_select_org" ON "public"."job_material_usage" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_material_usage"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_material_usage_update_field_roles" ON "public"."job_material_usage" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_material_usage"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_materials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_materials_delete_field_roles" ON "public"."job_materials" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_materials"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_materials_insert_field_roles" ON "public"."job_materials" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_materials"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_materials_select_org" ON "public"."job_materials" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_materials"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_materials_update_field_roles" ON "public"."job_materials" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_materials"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_notes_delete_field_roles" ON "public"."job_notes" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_notes"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_notes_insert_field_roles" ON "public"."job_notes" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_notes"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_notes_select_org" ON "public"."job_notes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_notes"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_notes_update_field_roles" ON "public"."job_notes" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_notes"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."job_time_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "job_time_entries_delete_field_roles" ON "public"."job_time_entries" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_time_entries"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_time_entries_insert_field_roles" ON "public"."job_time_entries" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_time_entries"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "job_time_entries_select_org" ON "public"."job_time_entries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_time_entries"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "job_time_entries_update_field_roles" ON "public"."job_time_entries" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."jobs"
  WHERE (("jobs"."id" = "job_time_entries"."job_id") AND ("jobs"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."jobs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "jobs_delete_write_roles" ON "public"."jobs" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "jobs_insert_write_roles" ON "public"."jobs" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "jobs_select_org" ON "public"."jobs" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "jobs_update_write_roles" ON "public"."jobs" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."lab_report_samples" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_report_samples_delete_write" ON "public"."lab_report_samples" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "lab_report_samples_insert_write" ON "public"."lab_report_samples" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "lab_report_samples_select_org" ON "public"."lab_report_samples" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "lab_report_samples_update_write" ON "public"."lab_report_samples" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."lab_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_reports_delete_write_roles" ON "public"."lab_reports" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "lab_reports_insert_write_roles" ON "public"."lab_reports" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "lab_reports_select_org" ON "public"."lab_reports" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "lab_reports_update_write_roles" ON "public"."lab_reports" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."labor_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."labs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "labs_delete_write_roles" ON "public"."labs" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "labs_insert_write_roles" ON "public"."labs" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "labs_select_org" ON "public"."labs" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "labs_update_write_roles" ON "public"."labs" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."lead_webhook_endpoints" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_webhook_endpoints_delete_admin" ON "public"."lead_webhook_endpoints" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "lead_webhook_endpoints_insert_admin" ON "public"."lead_webhook_endpoints" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "lead_webhook_endpoints_select_org" ON "public"."lead_webhook_endpoints" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "lead_webhook_endpoints_update_admin" ON "public"."lead_webhook_endpoints" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."lead_webhook_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."location_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "location_users_delete_admin" ON "public"."location_users" FOR DELETE USING ((("location_id" IN ( SELECT "locations"."id"
   FROM "public"."locations"
  WHERE ("locations"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "location_users_insert_admin" ON "public"."location_users" FOR INSERT WITH CHECK ((("location_id" IN ( SELECT "locations"."id"
   FROM "public"."locations"
  WHERE ("locations"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "location_users_select_org" ON "public"."location_users" FOR SELECT USING (("location_id" IN ( SELECT "locations"."id"
   FROM "public"."locations"
  WHERE ("locations"."organization_id" = "public"."get_user_organization_id"()))));



CREATE POLICY "location_users_update_admin" ON "public"."location_users" FOR UPDATE USING ((("location_id" IN ( SELECT "locations"."id"
   FROM "public"."locations"
  WHERE ("locations"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("location_id" IN ( SELECT "locations"."id"
   FROM "public"."locations"
  WHERE ("locations"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_delete_admin" ON "public"."locations" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "locations_insert_admin" ON "public"."locations" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "locations_select_org" ON "public"."locations" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "locations_update_admin" ON "public"."locations" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."marketing_sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."material_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."materials_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."opportunities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opportunities_delete_write_roles" ON "public"."opportunities" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "opportunities_insert_write_roles" ON "public"."opportunities" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "opportunities_select_org" ON "public"."opportunities" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "opportunities_update_write_roles" ON "public"."opportunities" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."opportunity_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "opportunity_history_delete_write_roles" ON "public"."opportunity_history" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."opportunities" "o"
  WHERE (("o"."id" = "opportunity_history"."opportunity_id") AND ("o"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "opportunity_history_insert_write_roles" ON "public"."opportunity_history" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."opportunities" "o"
  WHERE (("o"."id" = "opportunity_history"."opportunity_id") AND ("o"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "opportunity_history_select_org" ON "public"."opportunity_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."opportunities" "o"
  WHERE (("o"."id" = "opportunity_history"."opportunity_id") AND ("o"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "opportunity_history_update_write_roles" ON "public"."opportunity_history" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."opportunities" "o"
  WHERE (("o"."id" = "opportunity_history"."opportunity_id") AND ("o"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."organization_ai_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_document_shares" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_document_shares_delete_write_roles" ON "public"."organization_document_shares" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "organization_document_shares_insert_write_roles" ON "public"."organization_document_shares" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "organization_document_shares_select_org" ON "public"."organization_document_shares" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "organization_document_shares_update_write_roles" ON "public"."organization_document_shares" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."organization_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_documents_delete_write_roles" ON "public"."organization_documents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "organization_documents_insert_write_roles" ON "public"."organization_documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "organization_documents_select_org" ON "public"."organization_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "organization_documents_update_write_roles" ON "public"."organization_documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."organization_integrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_integrations_delete_admin" ON "public"."organization_integrations" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "organization_integrations_insert_admin" ON "public"."organization_integrations" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "organization_integrations_select_org" ON "public"."organization_integrations" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "organization_integrations_update_admin" ON "public"."organization_integrations" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."organization_sms_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_sms_settings_delete_admin" ON "public"."organization_sms_settings" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "organization_sms_settings_insert_admin" ON "public"."organization_sms_settings" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "organization_sms_settings_select_org" ON "public"."organization_sms_settings" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "organization_sms_settings_update_admin" ON "public"."organization_sms_settings" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."organization_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_methods" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payments_delete_write_roles" ON "public"."payments" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "payments_insert_write_roles" ON "public"."payments" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "payments_update_write_roles" ON "public"."payments" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."photo_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "photo_analyses_delete_field_roles" ON "public"."photo_analyses" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "photo_analyses_insert_field_roles" ON "public"."photo_analyses" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "photo_analyses_select_org" ON "public"."photo_analyses" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "photo_analyses_update_field_roles" ON "public"."photo_analyses" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."photos" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pipeline_stages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "pipeline_stages_delete_write_roles" ON "public"."pipeline_stages" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "pipeline_stages_insert_write_roles" ON "public"."pipeline_stages" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "pipeline_stages_select_org" ON "public"."pipeline_stages" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "pipeline_stages_update_write_roles" ON "public"."pipeline_stages" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."pricing_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_org_select" ON "public"."profiles" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "profile_own_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profile_own_select" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profile_platform_admin_select" ON "public"."profiles" FOR SELECT USING (("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text"])));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."properties" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "properties_delete_write_roles" ON "public"."properties" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "properties_insert_write_roles" ON "public"."properties" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "properties_select_org" ON "public"."properties" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "properties_update_write_roles" ON "public"."properties" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."property_contacts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "property_contacts_delete_write_roles" ON "public"."property_contacts" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "property_contacts_insert_write_roles" ON "public"."property_contacts" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "property_contacts_select_org" ON "public"."property_contacts" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "property_contacts_update_write_roles" ON "public"."property_contacts" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."proposals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "proposals_delete_write_roles" ON "public"."proposals" FOR DELETE USING ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "proposals_insert_write_roles" ON "public"."proposals" FOR INSERT WITH CHECK ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "proposals_update_write_roles" ON "public"."proposals" FOR UPDATE USING ((("organization_id" IN ( SELECT "profiles"."organization_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."push_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."report_exports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_requests_delete_write_roles" ON "public"."review_requests" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "review_requests_insert_write_roles" ON "public"."review_requests" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "review_requests_select_org" ON "public"."review_requests" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "review_requests_update_write_roles" ON "public"."review_requests" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."saved_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."scheduled_reminders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."segment_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "segment_members_delete_write_roles" ON "public"."segment_members" FOR DELETE USING ((("segment_id" IN ( SELECT "customer_segments"."id"
   FROM "public"."customer_segments"
  WHERE ("customer_segments"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "segment_members_insert_write_roles" ON "public"."segment_members" FOR INSERT WITH CHECK ((("segment_id" IN ( SELECT "customer_segments"."id"
   FROM "public"."customer_segments"
  WHERE ("customer_segments"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "segment_members_select_org" ON "public"."segment_members" FOR SELECT USING (("segment_id" IN ( SELECT "customer_segments"."id"
   FROM "public"."customer_segments"
  WHERE ("customer_segments"."organization_id" = "public"."get_user_organization_id"()))));



CREATE POLICY "segment_members_update_write_roles" ON "public"."segment_members" FOR UPDATE USING ((("segment_id" IN ( SELECT "customer_segments"."id"
   FROM "public"."customer_segments"
  WHERE ("customer_segments"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("segment_id" IN ( SELECT "customer_segments"."id"
   FROM "public"."customer_segments"
  WHERE ("customer_segments"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."site_survey_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_survey_photos_delete_field_roles" ON "public"."site_survey_photos" FOR DELETE USING ((("site_survey_id" IN ( SELECT "site_surveys"."id"
   FROM "public"."site_surveys"
  WHERE ("site_surveys"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "site_survey_photos_insert_field_roles" ON "public"."site_survey_photos" FOR INSERT WITH CHECK ((("site_survey_id" IN ( SELECT "site_surveys"."id"
   FROM "public"."site_surveys"
  WHERE ("site_surveys"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "site_survey_photos_select_org" ON "public"."site_survey_photos" FOR SELECT USING (("site_survey_id" IN ( SELECT "site_surveys"."id"
   FROM "public"."site_surveys"
  WHERE ("site_surveys"."organization_id" = "public"."get_user_organization_id"()))));



CREATE POLICY "site_survey_photos_update_field_roles" ON "public"."site_survey_photos" FOR UPDATE USING ((("site_survey_id" IN ( SELECT "site_surveys"."id"
   FROM "public"."site_surveys"
  WHERE ("site_surveys"."organization_id" = "public"."get_user_organization_id"()))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."site_surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "site_surveys_insert_field_roles" ON "public"."site_surveys" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "site_surveys_update_field_roles" ON "public"."site_surveys" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



ALTER TABLE "public"."sms_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sms_messages_delete_write_roles" ON "public"."sms_messages" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "sms_messages_insert_write_roles" ON "public"."sms_messages" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "sms_messages_select_org" ON "public"."sms_messages" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "sms_messages_update_write_roles" ON "public"."sms_messages" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."sms_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stripe_webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscription_plans" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."survey_photos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_photos: org members insert" ON "public"."survey_photos" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "survey_photos: org members read" ON "public"."survey_photos" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "survey_photos: org members update" ON "public"."survey_photos" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text", 'technician'::"text"]))));



CREATE POLICY "survey_photos: tenant admins delete" ON "public"."survey_photos" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['tenant_owner'::"public"."user_role", 'admin'::"public"."user_role", 'platform_owner'::"public"."user_role", 'platform_admin'::"public"."user_role"])))))));



ALTER TABLE "public"."tenant_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tenant_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."travel_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."voice_transcriptions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "voice_transcriptions_delete_write_roles" ON "public"."voice_transcriptions" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "voice_transcriptions_insert_write_roles" ON "public"."voice_transcriptions" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "voice_transcriptions_select_org" ON "public"."voice_transcriptions" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "voice_transcriptions_update_write_roles" ON "public"."voice_transcriptions" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."webhook_deliveries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhooks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "webhooks_delete_admin" ON "public"."webhooks" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "webhooks_insert_admin" ON "public"."webhooks" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



CREATE POLICY "webhooks_select_org" ON "public"."webhooks" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "webhooks_update_admin" ON "public"."webhooks" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."work_order_documents" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_documents_delete_write_roles" ON "public"."work_order_documents" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_order_documents_insert_write_roles" ON "public"."work_order_documents" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_order_documents_select_org" ON "public"."work_order_documents" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "work_order_documents_update_write_roles" ON "public"."work_order_documents" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."work_order_vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_order_vehicles_delete_write_roles" ON "public"."work_order_vehicles" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders"
  WHERE (("work_orders"."id" = "work_order_vehicles"."work_order_id") AND ("work_orders"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_order_vehicles_insert_write_roles" ON "public"."work_order_vehicles" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."work_orders"
  WHERE (("work_orders"."id" = "work_order_vehicles"."work_order_id") AND ("work_orders"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_order_vehicles_select_org" ON "public"."work_order_vehicles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."work_orders"
  WHERE (("work_orders"."id" = "work_order_vehicles"."work_order_id") AND ("work_orders"."organization_id" = "public"."get_user_organization_id"())))));



CREATE POLICY "work_order_vehicles_update_write_roles" ON "public"."work_order_vehicles" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."work_orders"
  WHERE (("work_orders"."id" = "work_order_vehicles"."work_order_id") AND ("work_orders"."organization_id" = "public"."get_user_organization_id"())))) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



ALTER TABLE "public"."work_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "work_orders_delete_write_roles" ON "public"."work_orders" FOR DELETE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_orders_insert_write_roles" ON "public"."work_orders" FOR INSERT WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));



CREATE POLICY "work_orders_select_org" ON "public"."work_orders" FOR SELECT USING (("organization_id" = "public"."get_user_organization_id"()));



CREATE POLICY "work_orders_update_write_roles" ON "public"."work_orders" FOR UPDATE USING ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"])))) WITH CHECK ((("organization_id" = "public"."get_user_organization_id"()) AND ("public"."get_user_role"() = ANY (ARRAY['platform_owner'::"text", 'platform_admin'::"text", 'tenant_owner'::"text", 'admin'::"text", 'estimator'::"text"]))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



















































































































































































































































REVOKE ALL ON FUNCTION "public"."_debug_list_profiles_policies"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."_debug_list_profiles_policies"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."allow_first_org_creation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."allow_first_org_creation"() TO "service_role";
GRANT ALL ON FUNCTION "public"."allow_first_org_creation"() TO "authenticated";



GRANT ALL ON TABLE "public"."job_completions" TO "anon";
GRANT ALL ON TABLE "public"."job_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."job_completions" TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_job_completion"("p_job_id" "uuid", "p_reviewed_by" "uuid", "p_review_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_job_completion"("p_job_id" "uuid", "p_reviewed_by" "uuid", "p_review_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_job_completion"("p_job_id" "uuid", "p_reviewed_by" "uuid", "p_review_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_invoice_on_job_completion"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_invoice_on_job_completion"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_completion_variance"("p_completion_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_completion_variance"("p_completion_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_completion_variance"("p_completion_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_completion_variance_by_job"("p_job_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_completion_variance_by_job"("p_job_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."calculate_completion_variance_by_job"("p_job_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."calculate_crew_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_crew_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_crew_hours"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_survey_average_rating"("survey_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_survey_average_rating"("survey_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_survey_average_rating"("survey_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."can_create_organization"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."can_create_organization"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_create_organization"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_ai_enabled"("p_organization_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_ai_enabled"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_ai_feature_enabled"("p_organization_id" "uuid", "p_feature" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_ai_feature_enabled"("p_organization_id" "uuid", "p_feature" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."check_and_increment_rate_limit"("p_key_id" "uuid", OUT "allowed" boolean, OUT "remaining" integer, OUT "reset_at" timestamp with time zone, OUT "current_count" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."check_and_increment_rate_limit"("p_key_id" "uuid", OUT "allowed" boolean, OUT "remaining" integer, OUT "reset_at" timestamp with time zone, OUT "current_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_tenant_limits"("org_id" "uuid", "limit_type" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."check_tenant_limits"("org_id" "uuid", "limit_type" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_tenant_limits"("org_id" "uuid", "limit_type" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_notifications"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."convert_opportunity_to_job"("p_opportunity_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."convert_opportunity_to_job"("p_opportunity_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_opportunity_to_job"("p_opportunity_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_credential_types"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_default_pipeline_stages"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_invoice_from_job"("p_job_id" "uuid", "p_due_date" "date", "p_payment_terms" "text", "p_discount_amount" numeric, "p_line_items" "jsonb", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_invoice_from_job"("p_job_id" "uuid", "p_due_date" "date", "p_payment_terms" "text", "p_discount_amount" numeric, "p_line_items" "jsonb", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invoice_from_job"("p_job_id" "uuid", "p_due_date" "date", "p_payment_terms" "text", "p_discount_amount" numeric, "p_line_items" "jsonb", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job_from_proposal"("p_proposal_id" "uuid", "p_job" "jsonb", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job_from_proposal"("p_proposal_id" "uuid", "p_job" "jsonb", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_job_from_proposal"("p_proposal_id" "uuid", "p_job" "jsonb", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_job_from_signed_proposal"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_job_from_signed_proposal"() TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification_for_role"("p_organization_id" "uuid", "p_role" character varying, "p_type" character varying, "p_title" character varying, "p_message" "text", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action_url" "text", "p_priority" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification_for_role"("p_organization_id" "uuid", "p_role" character varying, "p_type" character varying, "p_title" character varying, "p_message" "text", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action_url" "text", "p_priority" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification_for_role"("p_organization_id" "uuid", "p_role" character varying, "p_type" character varying, "p_title" character varying, "p_message" "text", "p_entity_type" character varying, "p_entity_id" "uuid", "p_action_url" "text", "p_priority" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_org_ai_settings"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_org_ai_settings"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_org_ai_settings"() TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_organization_for_onboarding"("p_org" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_organization_for_onboarding"("p_org" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_organization_for_onboarding"("p_org" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cron_has_recent_problem"("cron_name_in" "text", "sla_minutes" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cron_has_recent_problem"("cron_name_in" "text", "sla_minutes" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."dashboard_previous_outstanding_ar"("p_org" "uuid", "p_invoice_cutoff" timestamp with time zone, "p_payment_cutoff" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."dashboard_previous_outstanding_ar"("p_org" "uuid", "p_invoice_cutoff" timestamp with time zone, "p_payment_cutoff" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."dashboard_previous_outstanding_ar"("p_org" "uuid", "p_invoice_cutoff" timestamp with time zone, "p_payment_cutoff" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."enforce_admin_for_address_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enforce_admin_for_address_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_commission_period_lock"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_commission_period_lock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_commission_period_lock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_invoice_content_locked"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_invoice_content_locked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_invoice_content_locked"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_invoice_line_items_locked"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_invoice_line_items_locked"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_invoice_line_items_locked"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_primary_contact"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_primary_contact"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_access_token"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_access_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_access_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_estimate_number"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_estimate_number"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_estimate_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_feedback_token"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_feedback_token"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_feedback_token"() TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invoice_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_job_number"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_job_number"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_job_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_lab_report_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_proposal_number"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_proposal_number"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_proposal_number"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_work_order_number"("p_organization_id" "uuid", "p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_work_order_number"("p_organization_id" "uuid", "p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_work_order_number"("p_organization_id" "uuid", "p_job_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_estimate_metrics"("p_location_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_feedback_stats"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_feedback_stats"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feedback_stats"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feedback_survey_by_token"("p_token" character varying) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_invoice_for_portal"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_invoice_for_portal"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invoice_for_portal"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invoice_for_portal"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_pipeline_metrics"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_pipeline_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_pipeline_metrics"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_proposal_by_token"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_proposal_by_token"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_proposal_by_token"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_proposal_by_token"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_top_slow_queries"("order_by" "text", "limit_n" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_top_slow_queries"("order_by" "text", "limit_n" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_organization_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_customer_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_customer_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_customer_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."guard_site_survey_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."guard_site_survey_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."guard_site_survey_delete"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."import_nari_madison_2026"("p_organization_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_jobs_count"("org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_jobs_count"("org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."increment_tenant_usage"("p_organization_id" "uuid", "p_metric" character varying, "p_increment" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."increment_tenant_usage"("p_organization_id" "uuid", "p_metric" character varying, "p_increment" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."inherit_creator_default_location"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inherit_job_attribution"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inherit_job_attribution"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."inherit_opportunity_attribution"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."inherit_opportunity_attribution"() TO "service_role";



GRANT ALL ON FUNCTION "public"."initialize_job_checklist"("p_job_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."initialize_job_checklist"("p_job_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."initialize_job_checklist"("p_job_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."initialize_notification_preferences"("p_user_id" "uuid", "p_org_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."initialize_notification_preferences"("p_user_id" "uuid", "p_org_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_platform_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_platform_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_platform_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."link_job_completion_to_job"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."link_job_completion_to_job"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_ai_usage"("p_organization_id" "uuid", "p_service_name" character varying, "p_operation" character varying, "p_provider" character varying, "p_model_version" character varying, "p_customer_id" "uuid", "p_related_entity_type" character varying, "p_related_entity_id" "uuid", "p_input_tokens" integer, "p_output_tokens" integer, "p_data_categories" "text"[], "p_pii_redacted" boolean, "p_processing_time_ms" integer, "p_success" boolean, "p_error_message" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_ai_usage"("p_organization_id" "uuid", "p_service_name" character varying, "p_operation" character varying, "p_provider" character varying, "p_model_version" character varying, "p_customer_id" "uuid", "p_related_entity_type" character varying, "p_related_entity_id" "uuid", "p_input_tokens" integer, "p_output_tokens" integer, "p_data_categories" "text"[], "p_pii_redacted" boolean, "p_processing_time_ms" integer, "p_success" boolean, "p_error_message" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_audit_event"("p_organization_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_audit_event"("p_organization_id" "uuid", "p_action" character varying, "p_resource_type" character varying, "p_resource_id" "uuid", "p_old_values" "jsonb", "p_new_values" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_entity_activity"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_entity_activity"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_platform_access"("p_action" character varying, "p_target_org_id" "uuid", "p_resource_type" character varying, "p_resource_id" "uuid", "p_details" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_platform_access"("p_action" character varying, "p_target_org_id" "uuid", "p_resource_type" character varying, "p_resource_id" "uuid", "p_details" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_profile_privilege_escalation"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_profile_privilege_escalation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_profile_privilege_escalation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalc_company_stats"("p_company_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalc_company_stats"("p_company_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalc_customer_stats"("p_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalc_customer_stats"("p_customer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_estimate_totals"("est_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_estimate_totals"("est_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_estimate_totals"("est_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_invoice_self_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_self_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_self_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_invoice_totals"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."recompute_survey_photo_expiry_for_org"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recompute_survey_photo_expiry_for_org"() TO "service_role";



GRANT ALL ON TABLE "public"."approval_requests" TO "anon";
GRANT ALL ON TABLE "public"."approval_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_requests" TO "service_role";



GRANT ALL ON FUNCTION "public"."record_estimate_approval"("p_request_id" "uuid", "p_estimate_id" "uuid", "p_level" integer, "p_new_level_status" "text", "p_final_status" "text", "p_approver" "uuid", "p_at" timestamp with time zone, "p_notes" "text", "p_approved" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."record_estimate_approval"("p_request_id" "uuid", "p_estimate_id" "uuid", "p_level" integer, "p_new_level_status" "text", "p_final_status" "text", "p_approver" "uuid", "p_at" timestamp with time zone, "p_notes" "text", "p_approved" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_estimate_approval"("p_request_id" "uuid", "p_estimate_id" "uuid", "p_level" integer, "p_new_level_status" "text", "p_final_status" "text", "p_approver" "uuid", "p_at" timestamp with time zone, "p_notes" "text", "p_approved" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_date" "date", "p_payment_method" "text", "p_reference_number" "text", "p_notes" "text", "p_created_by" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_date" "date", "p_payment_method" "text", "p_reference_number" "text", "p_notes" "text", "p_created_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_invoice_payment"("p_invoice_id" "uuid", "p_amount" numeric, "p_payment_date" "date", "p_payment_method" "text", "p_reference_number" "text", "p_notes" "text", "p_created_by" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_proposal_view"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_proposal_view"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."record_proposal_view"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_proposal_view"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_report_views"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_monthly_job_counts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_monthly_job_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_query_performance_stats"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_rate_limit"("p_key_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_rate_limit"("p_key_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_tenant_usage"("p_organization_id" "uuid", "p_month" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_tenant_usage"("p_organization_id" "uuid", "p_month" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_estimate_root_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_estimate_root_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_estimate_root_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lab_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_survey_root_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_survey_root_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_survey_root_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_work_orders_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_work_orders_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_work_orders_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sign_proposal_by_token"("p_token" "text", "p_signer_name" "text", "p_signer_email" "text", "p_signer_ip" "text", "p_signature_data" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer, "p_rating_quality" integer, "p_rating_communication" integer, "p_rating_timeliness" integer, "p_rating_value" integer, "p_would_recommend" boolean, "p_likelihood_to_recommend" integer, "p_feedback_text" "text", "p_improvement_suggestions" "text", "p_testimonial_text" "text", "p_testimonial_permission" boolean, "p_ip_address" character varying, "p_user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer, "p_rating_quality" integer, "p_rating_communication" integer, "p_rating_timeliness" integer, "p_rating_value" integer, "p_would_recommend" boolean, "p_likelihood_to_recommend" integer, "p_feedback_text" "text", "p_improvement_suggestions" "text", "p_testimonial_text" "text", "p_testimonial_permission" boolean, "p_ip_address" character varying, "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer, "p_rating_quality" integer, "p_rating_communication" integer, "p_rating_timeliness" integer, "p_rating_value" integer, "p_would_recommend" boolean, "p_likelihood_to_recommend" integer, "p_feedback_text" "text", "p_improvement_suggestions" "text", "p_testimonial_text" "text", "p_testimonial_permission" boolean, "p_ip_address" character varying, "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_feedback"("p_token" character varying, "p_rating_overall" integer, "p_rating_quality" integer, "p_rating_communication" integer, "p_rating_timeliness" integer, "p_rating_value" integer, "p_would_recommend" boolean, "p_likelihood_to_recommend" integer, "p_feedback_text" "text", "p_improvement_suggestions" "text", "p_testimonial_text" "text", "p_testimonial_permission" boolean, "p_ip_address" character varying, "p_user_agent" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_opportunity_from_estimate"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_opportunity_from_estimate"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_opportunity_from_job"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_opportunity_from_job"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_opportunity_from_survey"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_opportunity_from_survey"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_primary_contact"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_primary_contact"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_property_contact_current"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_property_contact_current"() TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_email_sends_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_email_sends_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_email_sends_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."track_assessment_creation"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_assessment_creation"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."track_photo_upload"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."track_photo_upload"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_recalculate_estimate"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_estimate"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_recalculate_estimate"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_company_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_company_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_company_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_customer_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_surveys_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_surveys_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_surveys_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_invoice_balance"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_invoice_balance"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_invoice_balance"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_change_order_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_change_order_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_change_order_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_completion_checklists_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_completion_checklists_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_completion_checklists_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_completions_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_completions_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_completions_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_job_time_entries_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_job_time_entries_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_job_time_entries_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_jobs_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_jobs_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_jobs_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_org_users_count"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_org_users_count"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_tenant_usage"("org_id" "uuid", "usage_type" character varying, "increment_by" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_tenant_usage"("org_id" "uuid", "usage_type" character varying, "increment_by" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_feedback_token"("token_value" character varying) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_feedback_token"("token_value" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."validate_feedback_token"("token_value" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_feedback_token"("token_value" character varying) TO "service_role";


















GRANT ALL ON TABLE "public"."activity_log" TO "anon";
GRANT ALL ON TABLE "public"."activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."ai_usage_log" TO "anon";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_usage_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."api_request_log" TO "anon";
GRANT ALL ON TABLE "public"."api_request_log" TO "authenticated";
GRANT ALL ON TABLE "public"."api_request_log" TO "service_role";



GRANT ALL ON TABLE "public"."approval_thresholds" TO "anon";
GRANT ALL ON TABLE "public"."approval_thresholds" TO "authenticated";
GRANT ALL ON TABLE "public"."approval_thresholds" TO "service_role";



GRANT ALL ON TABLE "public"."attribution_touchpoints" TO "anon";
GRANT ALL ON TABLE "public"."attribution_touchpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."attribution_touchpoints" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."billing_invoices" TO "anon";
GRANT ALL ON TABLE "public"."billing_invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_invoices" TO "service_role";



GRANT ALL ON TABLE "public"."calendar_sync_events" TO "anon";
GRANT ALL ON TABLE "public"."calendar_sync_events" TO "authenticated";
GRANT ALL ON TABLE "public"."calendar_sync_events" TO "service_role";



GRANT ALL ON TABLE "public"."commission_earnings" TO "anon";
GRANT ALL ON TABLE "public"."commission_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."commission_periods" TO "anon";
GRANT ALL ON TABLE "public"."commission_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_periods" TO "service_role";



GRANT ALL ON TABLE "public"."commission_plans" TO "anon";
GRANT ALL ON TABLE "public"."commission_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_plans" TO "service_role";



GRANT ALL ON TABLE "public"."companies" TO "anon";
GRANT ALL ON TABLE "public"."companies" TO "authenticated";
GRANT ALL ON TABLE "public"."companies" TO "service_role";



GRANT ALL ON TABLE "public"."credential_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."credential_types" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_types" TO "service_role";



GRANT ALL ON TABLE "public"."credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."credentials" TO "service_role";



GRANT ALL ON TABLE "public"."credential_status" TO "authenticated";
GRANT ALL ON TABLE "public"."credential_status" TO "service_role";



GRANT ALL ON TABLE "public"."cron_runs" TO "anon";
GRANT ALL ON TABLE "public"."cron_runs" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_runs" TO "service_role";



GRANT ALL ON TABLE "public"."custom_domains" TO "anon";
GRANT ALL ON TABLE "public"."custom_domains" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_domains" TO "service_role";



GRANT ALL ON TABLE "public"."customer_contacts" TO "anon";
GRANT ALL ON TABLE "public"."customer_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_segments" TO "anon";
GRANT ALL ON TABLE "public"."customer_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_segments" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."disposal_fees" TO "anon";
GRANT ALL ON TABLE "public"."disposal_fees" TO "authenticated";
GRANT ALL ON TABLE "public"."disposal_fees" TO "service_role";



GRANT ALL ON TABLE "public"."email_sends" TO "anon";
GRANT ALL ON TABLE "public"."email_sends" TO "authenticated";
GRANT ALL ON TABLE "public"."email_sends" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_catalog" TO "anon";
GRANT ALL ON TABLE "public"."equipment_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_rates" TO "anon";
GRANT ALL ON TABLE "public"."equipment_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_rates" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_attached_documents" TO "anon";
GRANT ALL ON TABLE "public"."estimate_attached_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_attached_documents" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_line_items" TO "anon";
GRANT ALL ON TABLE "public"."estimate_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_line_items" TO "service_role";



GRANT ALL ON TABLE "public"."estimate_suggestions" TO "anon";
GRANT ALL ON TABLE "public"."estimate_suggestions" TO "authenticated";
GRANT ALL ON TABLE "public"."estimate_suggestions" TO "service_role";



GRANT ALL ON TABLE "public"."estimates" TO "anon";
GRANT ALL ON TABLE "public"."estimates" TO "authenticated";
GRANT ALL ON TABLE "public"."estimates" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_surveys" TO "anon";
GRANT ALL ON TABLE "public"."feedback_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."follow_ups" TO "anon";
GRANT ALL ON TABLE "public"."follow_ups" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_ups" TO "service_role";



GRANT ALL ON TABLE "public"."industry_events" TO "anon";
GRANT ALL ON TABLE "public"."industry_events" TO "authenticated";
GRANT ALL ON TABLE "public"."industry_events" TO "service_role";



GRANT ALL ON TABLE "public"."integration_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."integration_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."integration_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."invoice_attached_documents" TO "anon";
GRANT ALL ON TABLE "public"."invoice_attached_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_attached_documents" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invoice_line_items" TO "anon";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "authenticated";
GRANT ALL ON TABLE "public"."invoice_line_items" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON TABLE "public"."job_change_orders" TO "anon";
GRANT ALL ON TABLE "public"."job_change_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."job_change_orders" TO "service_role";



GRANT ALL ON TABLE "public"."job_completion_checklists" TO "anon";
GRANT ALL ON TABLE "public"."job_completion_checklists" TO "authenticated";
GRANT ALL ON TABLE "public"."job_completion_checklists" TO "service_role";



GRANT ALL ON TABLE "public"."job_completion_photos" TO "anon";
GRANT ALL ON TABLE "public"."job_completion_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."job_completion_photos" TO "service_role";



GRANT ALL ON TABLE "public"."job_crew" TO "anon";
GRANT ALL ON TABLE "public"."job_crew" TO "authenticated";
GRANT ALL ON TABLE "public"."job_crew" TO "service_role";



GRANT ALL ON TABLE "public"."job_disposal" TO "anon";
GRANT ALL ON TABLE "public"."job_disposal" TO "authenticated";
GRANT ALL ON TABLE "public"."job_disposal" TO "service_role";



GRANT ALL ON TABLE "public"."job_documents" TO "anon";
GRANT ALL ON TABLE "public"."job_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."job_documents" TO "service_role";



GRANT ALL ON TABLE "public"."job_equipment" TO "anon";
GRANT ALL ON TABLE "public"."job_equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."job_equipment" TO "service_role";



GRANT ALL ON TABLE "public"."job_material_usage" TO "anon";
GRANT ALL ON TABLE "public"."job_material_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."job_material_usage" TO "service_role";



GRANT ALL ON TABLE "public"."job_materials" TO "anon";
GRANT ALL ON TABLE "public"."job_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."job_materials" TO "service_role";



GRANT ALL ON TABLE "public"."job_notes" TO "anon";
GRANT ALL ON TABLE "public"."job_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."job_notes" TO "service_role";



GRANT ALL ON TABLE "public"."job_time_entries" TO "anon";
GRANT ALL ON TABLE "public"."job_time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."job_time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."jobs" TO "anon";
GRANT ALL ON TABLE "public"."jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."jobs" TO "service_role";



GRANT ALL ON TABLE "public"."lab_report_samples" TO "anon";
GRANT ALL ON TABLE "public"."lab_report_samples" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_report_samples" TO "service_role";



GRANT ALL ON TABLE "public"."lab_reports" TO "anon";
GRANT ALL ON TABLE "public"."lab_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_reports" TO "service_role";



GRANT ALL ON TABLE "public"."labor_rates" TO "anon";
GRANT ALL ON TABLE "public"."labor_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."labor_rates" TO "service_role";



GRANT ALL ON TABLE "public"."labs" TO "anon";
GRANT ALL ON TABLE "public"."labs" TO "authenticated";
GRANT ALL ON TABLE "public"."labs" TO "service_role";



GRANT ALL ON TABLE "public"."lead_webhook_endpoints" TO "anon";
GRANT ALL ON TABLE "public"."lead_webhook_endpoints" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_webhook_endpoints" TO "service_role";



GRANT ALL ON TABLE "public"."lead_webhook_log" TO "anon";
GRANT ALL ON TABLE "public"."lead_webhook_log" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_webhook_log" TO "service_role";



GRANT ALL ON TABLE "public"."location_users" TO "anon";
GRANT ALL ON TABLE "public"."location_users" TO "authenticated";
GRANT ALL ON TABLE "public"."location_users" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."marketing_sync_log" TO "anon";
GRANT ALL ON TABLE "public"."marketing_sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."marketing_sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."material_costs" TO "anon";
GRANT ALL ON TABLE "public"."material_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."material_costs" TO "service_role";



GRANT ALL ON TABLE "public"."materials_catalog" TO "anon";
GRANT ALL ON TABLE "public"."materials_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."materials_catalog" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_job_costs" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_job_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_job_costs" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_lead_source_roi" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_lead_source_roi" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_lead_source_roi" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."proposals" TO "anon";
GRANT ALL ON TABLE "public"."proposals" TO "authenticated";
GRANT ALL ON TABLE "public"."proposals" TO "service_role";



GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_sales_performance" TO "anon";
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE "public"."mv_sales_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_sales_performance" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."opportunities" TO "anon";
GRANT ALL ON TABLE "public"."opportunities" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunities" TO "service_role";



GRANT ALL ON TABLE "public"."opportunity_history" TO "anon";
GRANT ALL ON TABLE "public"."opportunity_history" TO "authenticated";
GRANT ALL ON TABLE "public"."opportunity_history" TO "service_role";



GRANT ALL ON TABLE "public"."organization_ai_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_ai_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_ai_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organization_document_shares" TO "anon";
GRANT ALL ON TABLE "public"."organization_document_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_document_shares" TO "service_role";



GRANT ALL ON TABLE "public"."organization_documents" TO "anon";
GRANT ALL ON TABLE "public"."organization_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_documents" TO "service_role";



GRANT ALL ON TABLE "public"."organization_integrations" TO "anon";
GRANT ALL ON TABLE "public"."organization_integrations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_integrations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_sms_settings" TO "anon";
GRANT ALL ON TABLE "public"."organization_sms_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_sms_settings" TO "service_role";



GRANT ALL ON TABLE "public"."organization_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON TABLE "public"."payments" TO "anon";
GRANT ALL ON TABLE "public"."payments" TO "authenticated";
GRANT ALL ON TABLE "public"."payments" TO "service_role";



GRANT ALL ON TABLE "public"."photo_analyses" TO "anon";
GRANT ALL ON TABLE "public"."photo_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."photo_analyses" TO "service_role";



GRANT ALL ON TABLE "public"."photos" TO "anon";
GRANT ALL ON TABLE "public"."photos" TO "authenticated";
GRANT ALL ON TABLE "public"."photos" TO "service_role";



GRANT ALL ON TABLE "public"."pipeline_stages" TO "anon";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "authenticated";
GRANT ALL ON TABLE "public"."pipeline_stages" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."pricing_settings" TO "anon";
GRANT ALL ON TABLE "public"."pricing_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."pricing_settings" TO "service_role";



GRANT ALL ON TABLE "public"."properties" TO "anon";
GRANT ALL ON TABLE "public"."properties" TO "authenticated";
GRANT ALL ON TABLE "public"."properties" TO "service_role";



GRANT ALL ON TABLE "public"."property_contacts" TO "anon";
GRANT ALL ON TABLE "public"."property_contacts" TO "authenticated";
GRANT ALL ON TABLE "public"."property_contacts" TO "service_role";



GRANT ALL ON TABLE "public"."push_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."push_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."report_exports" TO "anon";
GRANT ALL ON TABLE "public"."report_exports" TO "authenticated";
GRANT ALL ON TABLE "public"."report_exports" TO "service_role";



GRANT ALL ON TABLE "public"."review_requests" TO "anon";
GRANT ALL ON TABLE "public"."review_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."review_requests" TO "service_role";



GRANT ALL ON TABLE "public"."saved_reports" TO "anon";
GRANT ALL ON TABLE "public"."saved_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_reports" TO "service_role";



GRANT ALL ON TABLE "public"."scheduled_reminders" TO "anon";
GRANT ALL ON TABLE "public"."scheduled_reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."scheduled_reminders" TO "service_role";



GRANT ALL ON TABLE "public"."segment_members" TO "anon";
GRANT ALL ON TABLE "public"."segment_members" TO "authenticated";
GRANT ALL ON TABLE "public"."segment_members" TO "service_role";



GRANT ALL ON TABLE "public"."site_survey_photos" TO "anon";
GRANT ALL ON TABLE "public"."site_survey_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."site_survey_photos" TO "service_role";



GRANT ALL ON TABLE "public"."site_surveys" TO "anon";
GRANT ALL ON TABLE "public"."site_surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."site_surveys" TO "service_role";



GRANT ALL ON TABLE "public"."sms_messages" TO "anon";
GRANT ALL ON TABLE "public"."sms_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_messages" TO "service_role";



GRANT ALL ON TABLE "public"."sms_templates" TO "anon";
GRANT ALL ON TABLE "public"."sms_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."sms_templates" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON TABLE "public"."survey_photos" TO "anon";
GRANT ALL ON TABLE "public"."survey_photos" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_photos" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_invitations" TO "anon";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_usage" TO "anon";
GRANT ALL ON TABLE "public"."tenant_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_usage" TO "service_role";



GRANT ALL ON TABLE "public"."travel_rates" TO "anon";
GRANT ALL ON TABLE "public"."travel_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."travel_rates" TO "service_role";



GRANT ALL ON TABLE "public"."v_job_costs" TO "anon";
GRANT ALL ON TABLE "public"."v_job_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."v_job_costs" TO "service_role";



GRANT ALL ON TABLE "public"."v_lead_source_roi" TO "anon";
GRANT ALL ON TABLE "public"."v_lead_source_roi" TO "authenticated";
GRANT ALL ON TABLE "public"."v_lead_source_roi" TO "service_role";



GRANT ALL ON TABLE "public"."v_sales_performance" TO "anon";
GRANT ALL ON TABLE "public"."v_sales_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."v_sales_performance" TO "service_role";



GRANT ALL ON TABLE "public"."voice_transcriptions" TO "anon";
GRANT ALL ON TABLE "public"."voice_transcriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."voice_transcriptions" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_deliveries" TO "anon";
GRANT ALL ON TABLE "public"."webhook_deliveries" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_deliveries" TO "service_role";



GRANT ALL ON TABLE "public"."webhooks" TO "anon";
GRANT ALL ON TABLE "public"."webhooks" TO "authenticated";
GRANT ALL ON TABLE "public"."webhooks" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_documents" TO "anon";
GRANT ALL ON TABLE "public"."work_order_documents" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_documents" TO "service_role";



GRANT ALL ON TABLE "public"."work_order_vehicles" TO "anon";
GRANT ALL ON TABLE "public"."work_order_vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."work_order_vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."work_orders" TO "anon";
GRANT ALL ON TABLE "public"."work_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."work_orders" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































