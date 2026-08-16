-- Add RingCentral as a second SMS provider, alongside Twilio rather than
-- replacing it.
--
-- SMS credentials were already per-organization, so this is the natural shape:
-- one client can run on RingCentral while everyone else stays on Twilio. No
-- existing organization changes behavior, because the provider column defaults
-- to 'twilio' and every current row is already configured that way.
--
-- RingCentral authenticates completely differently from Twilio. There is no
-- account SID and auth token pair; instead an app has a client id and secret,
-- and a per-user JWT is exchanged for a short-lived access token at
-- /restapi/oauth/token using
-- grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer. So the credentials
-- need their own columns rather than being forced into the Twilio ones.
--
-- The three secrets are stored encrypted, the same as the Twilio pair, and are
-- decrypted in SmsService.getSettings. The from number and server URL are not
-- secret and stay plain.

ALTER TABLE "public"."organization_sms_settings"
  ADD COLUMN IF NOT EXISTS "sms_provider" "text" NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS "ringcentral_client_id" "text",
  ADD COLUMN IF NOT EXISTS "ringcentral_client_secret" "text",
  ADD COLUMN IF NOT EXISTS "ringcentral_jwt" "text",
  ADD COLUMN IF NOT EXISTS "ringcentral_from_number" "text",
  -- Sandbox and production are different hosts, and getting this wrong is the
  -- most common RingCentral setup mistake, so it is explicit rather than a
  -- build-time constant.
  ADD COLUMN IF NOT EXISTS "ringcentral_server_url" "text" NOT NULL DEFAULT 'https://platform.ringcentral.com';

ALTER TABLE "public"."organization_sms_settings"
  DROP CONSTRAINT IF EXISTS "organization_sms_settings_provider_check";
ALTER TABLE "public"."organization_sms_settings"
  ADD CONSTRAINT "organization_sms_settings_provider_check"
  CHECK ("sms_provider" IN ('twilio', 'ringcentral'));

COMMENT ON COLUMN "public"."organization_sms_settings"."sms_provider" IS
  'Which SMS provider this organization sends through. Defaults to twilio so existing orgs are unaffected.';

-- The message log recorded a Twilio SID specifically. Generalize it so a
-- RingCentral message id has somewhere to live, and so the conversation view
-- can tell which provider handled a given message.
ALTER TABLE "public"."sms_messages"
  ADD COLUMN IF NOT EXISTS "provider" "text" NOT NULL DEFAULT 'twilio',
  ADD COLUMN IF NOT EXISTS "provider_message_id" "text";

ALTER TABLE "public"."sms_messages"
  DROP CONSTRAINT IF EXISTS "sms_messages_provider_check";
ALTER TABLE "public"."sms_messages"
  ADD CONSTRAINT "sms_messages_provider_check"
  CHECK ("provider" IN ('twilio', 'ringcentral'));

-- Backfill so history is queryable through the new column from day one.
-- twilio_message_sid is left in place: the Twilio status webhook looks messages
-- up by it, and dropping it would break delivery reconciliation for every
-- message already in flight.
UPDATE "public"."sms_messages"
   SET "provider_message_id" = "twilio_message_sid"
 WHERE "provider_message_id" IS NULL
   AND "twilio_message_sid" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "sms_messages_provider_message_id_idx"
  ON "public"."sms_messages" ("provider_message_id");

COMMENT ON COLUMN "public"."sms_messages"."provider_message_id" IS
  'Provider-side message id. Mirrors twilio_message_sid for Twilio messages; holds the RingCentral message id otherwise.';
