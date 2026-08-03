-- ============================================================================
-- Fix 16 functions left permanently broken by the search_path hardening.
--
-- The hardening pass set `SET search_path TO ''` on these functions but did
-- not schema-qualify the table references inside their bodies. With an empty
-- search_path, an unqualified `FROM notifications` resolves against nothing,
-- so every one of these throws:
--
--     relation "notifications" does not exist
--
-- Reproduced against production: GET /api/notifications returns 500 for a
-- signed-in user because get_unread_notification_count() throws. The failure
-- surfaced to users as a "Something went wrong / Failed to fetch
-- notifications" toast on every 30s poll.
--
-- The same defect is in 15 more functions, and they are not cosmetic:
--
--   log_audit_event / log_platform_access  -> audit logging silently dead
--   check_tenant_limits / increment_tenant_usage / reset_tenant_usage
--                                          -> plan limits and usage metering
--   allow_first_org_creation / can_create_organization
--                                          -> RLS helpers used by onboarding
--   get_feedback_survey_by_token / validate_feedback_token / submit_feedback
--                                          -> the whole customer feedback portal
--   check_ai_enabled / check_ai_feature_enabled, log_ai_usage,
--   create_notification_for_role, cleanup_expired_notifications
--
-- Fix: pin search_path to `public, pg_temp` rather than rewriting sixteen
-- function bodies. That keeps the hardening's actual goal — search_path is
-- still fixed at definition time, so a caller cannot redirect these
-- functions at an attacker-controlled schema — while letting the existing
-- unqualified references resolve. `public, pg_temp` is already the
-- convention elsewhere in this schema.
--
-- pg_temp is listed last deliberately: putting it first would let a session
-- shadow a real table with a temp one.
-- ============================================================================

ALTER FUNCTION public.allow_first_org_creation() SET search_path TO public, pg_temp;
ALTER FUNCTION public.can_create_organization() SET search_path TO public, pg_temp;
ALTER FUNCTION public.check_ai_enabled(p_organization_id uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.check_ai_feature_enabled(p_organization_id uuid, p_feature character varying) SET search_path TO public, pg_temp;
ALTER FUNCTION public.check_tenant_limits(org_id uuid, limit_type character varying) SET search_path TO public, pg_temp;
ALTER FUNCTION public.cleanup_expired_notifications() SET search_path TO public, pg_temp;
ALTER FUNCTION public.create_notification_for_role(p_organization_id uuid, p_role character varying, p_type character varying, p_title character varying, p_message text, p_entity_type character varying, p_entity_id uuid, p_action_url text, p_priority character varying) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_feedback_survey_by_token(p_token character varying) SET search_path TO public, pg_temp;
ALTER FUNCTION public.get_unread_notification_count(p_user_id uuid) SET search_path TO public, pg_temp;
ALTER FUNCTION public.increment_tenant_usage(p_organization_id uuid, p_metric character varying, p_increment integer) SET search_path TO public, pg_temp;
ALTER FUNCTION public.log_ai_usage(p_organization_id uuid, p_service_name character varying, p_operation character varying, p_provider character varying, p_model_version character varying, p_customer_id uuid, p_related_entity_type character varying, p_related_entity_id uuid, p_input_tokens integer, p_output_tokens integer, p_data_categories text[], p_pii_redacted boolean, p_processing_time_ms integer, p_success boolean, p_error_message text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.log_audit_event(p_organization_id uuid, p_action character varying, p_resource_type character varying, p_resource_id uuid, p_old_values jsonb, p_new_values jsonb) SET search_path TO public, pg_temp;
ALTER FUNCTION public.log_platform_access(p_action character varying, p_target_org_id uuid, p_resource_type character varying, p_resource_id uuid, p_details jsonb) SET search_path TO public, pg_temp;
ALTER FUNCTION public.reset_tenant_usage(p_organization_id uuid, p_month character varying) SET search_path TO public, pg_temp;
ALTER FUNCTION public.submit_feedback(p_token character varying, p_rating_overall integer, p_rating_quality integer, p_rating_communication integer, p_rating_timeliness integer, p_rating_value integer, p_would_recommend boolean, p_likelihood_to_recommend integer, p_feedback_text text, p_improvement_suggestions text, p_testimonial_text text, p_testimonial_permission boolean, p_ip_address character varying, p_user_agent text) SET search_path TO public, pg_temp;
ALTER FUNCTION public.validate_feedback_token(token_value character varying) SET search_path TO public, pg_temp;
