-- Global reference data. The baseline is a SCHEMA dump, so it carries no rows —
-- and these two tables are not organisation-scoped, so nothing seeds them.
--
-- A database rebuilt without this file comes up with:
--   * platform_settings empty  -> registration_enabled and max_trial_days are
--                                 absent, so signup gating reads nothing
--   * subscription_plans empty -> no plans to choose, billing has nothing to show
--
-- Everything org-scoped (pipeline_stages, credential_types, AI settings) is
-- seeded by AFTER INSERT triggers on organizations and must NOT be listed here.

-- ------------------------------------------------------- platform settings
insert into platform_settings (key, value, description)
select v.key, v.value::jsonb, v.description
from (values
  ('default_features',
   '{"estimates": true, "reporting": true, "scheduling": true, "assessments": true}',
   'Default features for new tenants'),
  ('maintenance_mode',     'false',                      'Enable maintenance mode for the platform'),
  ('max_trial_days',       '30',                         'Default trial period in days'),
  ('platform_name',        '"HazardOS"',                 'Platform display name'),
  ('registration_enabled', 'true',                       'Allow new tenant registrations'),
  ('support_email',        '"support@hazardos.app"',     'Platform support email')
) as v(key, value, description)
where not exists (select 1 from platform_settings ps where ps.key = v.key);

-- ------------------------------------------------------ subscription plans
-- Stripe product/price ids are intentionally NULL here, matching production;
-- they are attached per environment rather than baked into the schema.
insert into subscription_plans (
  id, name, slug, description, price_monthly, price_yearly,
  max_users, max_jobs_per_month, max_storage_gb, features, feature_flags,
  is_active, is_public, display_order
) values
  ('97a15363-e161-44ff-8f74-ad0d71093c82', 'Starter', 'starter',
   'Perfect for small operations', 9900, 99900, 3, 50, 5,
   '["Customer management", "Site surveys", "Estimates & proposals", "Job scheduling", "Invoicing"]'::jsonb,
   '{"api_access": false, "quickbooks": false, "custom_branding": false, "priority_support": false, "advanced_reporting": false}'::jsonb,
   true, true, 1),
  ('b9b3f633-6862-43ac-a11c-26f59d790877', 'Professional', 'pro',
   'For growing businesses', 19900, 199900, 10, 200, 25,
   '["Everything in Starter", "QuickBooks integration", "Customer feedback", "Advanced reporting", "Priority support"]'::jsonb,
   '{"api_access": false, "quickbooks": true, "custom_branding": true, "priority_support": true, "advanced_reporting": true}'::jsonb,
   true, true, 2),
  ('d47b9119-0e45-4851-ac9b-994372d3daee', 'Enterprise', 'enterprise',
   'For large operations', 49900, 499900, null, null, 100,
   '["Everything in Professional", "Unlimited users", "Unlimited jobs", "API access", "Custom integrations", "Dedicated support"]'::jsonb,
   '{"api_access": true, "quickbooks": true, "custom_branding": true, "priority_support": true, "advanced_reporting": true}'::jsonb,
   true, true, 3)
on conflict (id) do nothing;
