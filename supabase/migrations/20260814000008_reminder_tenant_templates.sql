-- Let a scheduled message use a tenant-authored template.
--
-- Until now every outbound reminder rendered from a hardcoded slug in
-- lib/services/reminder-sender.ts. That works for the six system messages it
-- ships with and cannot work for a customer's own copy, which is the whole
-- point of an automation chain: AHS's chains send a pre-appointment email, a
-- thank-you email and a thank-you text, all in their words.
--
-- Slug and template id are alternatives, not a pair. A row carries one or the
-- other, and the sender picks its path from which is set.

ALTER TABLE "public"."scheduled_reminders"
    ADD COLUMN IF NOT EXISTS "email_template_id" "uuid",
    ADD COLUMN IF NOT EXISTS "sms_template_id" "uuid";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'scheduled_reminders_email_template_id_fkey') THEN
    ALTER TABLE "public"."scheduled_reminders"
      ADD CONSTRAINT "scheduled_reminders_email_template_id_fkey"
      FOREIGN KEY ("email_template_id") REFERENCES "public"."email_templates"("id") ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'scheduled_reminders_sms_template_id_fkey') THEN
    ALTER TABLE "public"."scheduled_reminders"
      ADD CONSTRAINT "scheduled_reminders_sms_template_id_fkey"
      FOREIGN KEY ("sms_template_id") REFERENCES "public"."sms_templates"("id") ON DELETE SET NULL;
  END IF;

  -- A row with no way to produce content is a message that will fail at send
  -- time, hours after whoever caused it has moved on. Reject it at write time
  -- instead.
  IF NOT EXISTS (SELECT 1 FROM "pg_constraint" WHERE "conname" = 'scheduled_reminders_has_content_source') THEN
    ALTER TABLE "public"."scheduled_reminders"
      ADD CONSTRAINT "scheduled_reminders_has_content_source"
      CHECK (
        "template_slug" IS NOT NULL
        OR "email_template_id" IS NOT NULL
        OR "sms_template_id" IS NOT NULL
      );
  END IF;
END $$;

COMMENT ON COLUMN "public"."scheduled_reminders"."email_template_id" IS
  'Tenant-authored email template to render. Mutually exclusive with template_slug, which selects a built-in system message.';
