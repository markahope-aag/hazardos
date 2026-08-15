-- Makes the six built-in reminder messages editable.
--
-- Context: docs/marketsharp-hazardos-diff.md — "table/editor now exist but
-- migration hasn't happened." 20260814000008 added email_template_id /
-- sms_template_id so an automation step can point at a tenant's own copy, but
-- explicitly left the six shipped defaults (job confirmation, the two
-- appointment SMS reminders, the three payment reminders) as hardcoded
-- content in lib/services/reminder-sender.ts because there was nowhere to
-- store an editable version of them. This is that storage.
--
-- `slug` is how reminder-sender finds "the org's version of job_confirmation"
-- without a scheduled_reminders row having to carry a template id at creation
-- time — job-reminders-service and invoice-delivery-service still just write
-- template_slug, exactly as before. A slug is a stable key across a rename,
-- which lower(name) is not: renaming "Job Confirmation" to "Booking
-- Confirmed" must not orphan the row every reminder job already points at.
--
-- Not represented here: password reset (platform-level, no organization_id
-- to hang a template on) and the invoice delivery email (needs line-item
-- loops, conditional tax/discount blocks and attachments — the flat
-- {{variable}} substitution in template-render.ts can't do any of that).
-- Both stay as code. See lib/services/invoice-delivery-service.ts and
-- lib/emails/password-reset.ts.

ALTER TABLE "public"."email_templates" ADD COLUMN IF NOT EXISTS "slug" "text";
ALTER TABLE "public"."sms_templates" ADD COLUMN IF NOT EXISTS "slug" "text";

CREATE UNIQUE INDEX IF NOT EXISTS "email_templates_org_slug_key"
    ON "public"."email_templates" ("organization_id", "slug")
    WHERE "slug" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "sms_templates_org_slug_key"
    ON "public"."sms_templates" ("organization_id", "slug")
    WHERE "slug" IS NOT NULL;

COMMENT ON COLUMN "public"."email_templates"."slug" IS
  'Set only on shipped defaults. reminder-sender looks a scheduled_reminders.template_slug up by this to find the org''s editable copy; null on every tenant-authored template.';

COMMENT ON COLUMN "public"."sms_templates"."slug" IS
  'Set only on shipped defaults. Same lookup as email_templates.slug.';

-- ---------------------------------------------------------------------------
-- Seed function: one email default, five SMS defaults, per organization.
-- ---------------------------------------------------------------------------
-- Wording matches what reminder-sender.ts has hardcoded today, translated to
-- {{variable}} placeholders. `time_suffix` and `scheduled_date_pretty` are
-- computed by reminder-sender at send time (it already owns the date/time
-- formatting) and merged into template_variables alongside whatever
-- job-reminders-service or invoice-delivery-service supplied — a template
-- author never has to know or write date-formatting logic.

CREATE OR REPLACE FUNCTION "public"."create_default_message_templates"("org_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.email_templates (organization_id, name, subject, body, is_system, slug)
  VALUES (
    org_id,
    'Job Confirmation (default)',
    'Appointment confirmed — {{scheduled_date_pretty}}{{time_suffix}}',
    E'Hi {{customer_name}},\n\nThis confirms your appointment with {{company_name}}.\n\nDate: {{scheduled_date_pretty}}{{time_suffix}}\nAddress: {{property_address}}\nReference: {{job_number}}\n\nWe''ll send you a reminder the week of your appointment and again the morning of. If you need to reschedule, just reply to this email.\n\n— {{company_name}}',
    true,
    'job_confirmation'
  )
  ON CONFLICT (organization_id, slug) WHERE slug IS NOT NULL DO NOTHING;

  INSERT INTO public.sms_templates (organization_id, name, message_type, body, is_system, slug)
  VALUES
    (
      org_id,
      'Appointment Reminder — One Week Out (default)',
      'appointment_reminder',
      'Hi {{customer_name}}, {{company_name}} here — just a reminder that we''re scheduled for {{scheduled_date_pretty}}{{time_suffix}} at {{property_address}}. Reply STOP to opt out.',
      true,
      'job_reminder_week'
    ),
    (
      org_id,
      'Appointment Reminder — Day Of (default)',
      'appointment_reminder',
      'Hi {{customer_name}}, reminder from {{company_name}}: we''re scheduled for today{{time_suffix}} at {{property_address}}. Reply STOP to opt out.',
      true,
      'job_reminder_day'
    ),
    (
      org_id,
      'Payment Reminder — Before Due (default)',
      'payment_reminder',
      '{{company_name}}: Invoice {{invoice_number}} for {{amount}} is due {{due_date}}. Pay: {{pay_url}} Reply STOP to opt out.',
      true,
      'payment_reminder_pre_due'
    ),
    (
      org_id,
      'Payment Reminder — Due Today (default)',
      'payment_reminder',
      '{{company_name}}: Friendly reminder — invoice {{invoice_number}} for {{amount}} is due today. Pay: {{pay_url}} Reply STOP to opt out.',
      true,
      'payment_reminder_due'
    ),
    (
      org_id,
      'Payment Reminder — Overdue (default)',
      'payment_reminder',
      '{{company_name}}: Invoice {{invoice_number}} for {{amount}} is past due (was due {{due_date}}). Pay: {{pay_url}} Reply STOP to opt out.',
      true,
      'payment_reminder_overdue'
    )
  ON CONFLICT (organization_id, slug) WHERE slug IS NOT NULL DO NOTHING;
END;
$$;

ALTER FUNCTION "public"."create_default_message_templates"("uuid") OWNER TO "postgres";

-- New orgs get the defaults immediately, same trigger shape as
-- create_activity_vocabulary_for_new_org in 20260814000002.
CREATE OR REPLACE FUNCTION "public"."create_default_message_templates_for_new_org"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  PERFORM public.create_default_message_templates(NEW.id);
  RETURN NEW;
END;
$$;

ALTER FUNCTION "public"."create_default_message_templates_for_new_org"() OWNER TO "postgres";

DROP TRIGGER IF EXISTS "organizations_create_default_message_templates" ON "public"."organizations";
CREATE TRIGGER "organizations_create_default_message_templates"
    AFTER INSERT ON "public"."organizations"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."create_default_message_templates_for_new_org"();

-- Backfill every existing organization.
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    PERFORM public.create_default_message_templates(org.id);
  END LOOP;
END $$;
