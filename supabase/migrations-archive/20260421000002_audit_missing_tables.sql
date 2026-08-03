-- ============================================
-- Diagnostic: list expected tables that are missing from pg_catalog
-- ============================================
-- Emits a NOTICE per missing table. Purely read-only — safe to apply and
-- re-apply. The goal is to surface schema drift (migration history says
-- applied, but table is gone) so we can write targeted repair migrations.

DO $$
DECLARE
  expected TEXT[] := ARRAY[
    'activity_log', 'ai_usage_log', 'api_keys', 'api_request_log',
    'approval_requests', 'approval_thresholds', 'attribution_touchpoints',
    'audit_log', 'billing_invoices', 'calendar_sync_events',
    'commission_earnings', 'commission_plans', 'companies', 'cron_runs',
    'custom_domains', 'customer_contacts', 'customer_segments', 'customers',
    'disposal_fees', 'equipment_catalog', 'equipment_rates',
    'estimate_line_items', 'estimate_suggestions', 'estimates',
    'feedback_surveys', 'follow_ups', 'integration_sync_log',
    'invoice_line_items', 'invoices', 'job_change_orders',
    'job_completion_checklists', 'job_completion_photos', 'job_completions',
    'job_crew', 'job_disposal', 'job_documents', 'job_equipment',
    'job_material_usage', 'job_materials', 'job_notes', 'job_time_entries',
    'jobs', 'labor_rates', 'lead_webhook_endpoints', 'lead_webhook_log',
    'location_users', 'locations', 'marketing_sync_log', 'material_costs',
    'materials_catalog', 'notification_preferences', 'notifications',
    'opportunities', 'opportunity_history', 'organization_ai_settings',
    'organization_integrations', 'organization_sms_settings',
    'organization_subscriptions', 'organizations', 'payment_methods',
    'payments', 'photo_analyses', 'photos', 'pipeline_stages',
    'platform_settings', 'pricing_settings', 'profiles', 'properties',
    'property_contacts', 'proposals', 'push_subscriptions', 'report_exports',
    'review_requests', 'saved_reports', 'scheduled_reminders',
    'segment_members', 'site_surveys', 'sms_messages', 'sms_templates',
    'stripe_webhook_events', 'subscription_plans', 'tenant_invitations',
    'tenant_usage', 'travel_rates', 'voice_transcriptions',
    'webhook_deliveries', 'webhooks'
  ];
  t TEXT;
  missing TEXT[] := ARRAY[]::TEXT[];
BEGIN
  FOREACH t IN ARRAY expected LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      missing := array_append(missing, t);
    END IF;
  END LOOP;

  IF array_length(missing, 1) IS NULL THEN
    RAISE NOTICE 'TABLE_AUDIT: all % expected tables present', array_length(expected, 1);
  ELSE
    RAISE NOTICE 'TABLE_AUDIT: % of % tables missing: %',
      array_length(missing, 1), array_length(expected, 1), missing;
  END IF;
END $$;
