-- ============================================================================
-- SMS9: consent must distinguish transactional from marketing messages.
--
-- TCPA treats these differently: transactional/informational texts (an
-- appointment reminder, a job-status update, an invoice) ride on the implied
-- consent of a customer who handed over their number for service, while
-- promotional/marketing texts require separate EXPRESS consent. A single
-- sms_opt_in flag can't represent that split — opting in to appointment
-- reminders is not opting in to marketing blasts.
--
-- The existing sms_opt_in (+ _at/_ip) now means TRANSACTIONAL consent.
-- These columns add a parallel MARKETING consent record. The send path
-- (SmsService.send) picks which one to check from the message type.
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_marketing_consent BOOLEAN DEFAULT false;
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_at TIMESTAMPTZ;
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_marketing_consent_ip TEXT;

COMMENT ON COLUMN customers.sms_marketing_consent IS 'Express consent to receive promotional/marketing SMS (separate from transactional sms_opt_in), for TCPA';
COMMENT ON COLUMN customers.sms_marketing_consent_at IS 'Timestamp marketing consent was granted';
COMMENT ON COLUMN customers.sms_marketing_consent_ip IS 'IP captured at web-form marketing opt-in, for the TCPA consent audit trail';

-- New outbound message type for promotional sends. enums don't support
-- IF NOT EXISTS on ADD VALUE pre-PG15; wrapped in a DO block for idempotent
-- re-run. Adding the value only (not using it here) is transaction-safe.
DO $$
BEGIN
  ALTER TYPE sms_message_type ADD VALUE 'marketing';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
