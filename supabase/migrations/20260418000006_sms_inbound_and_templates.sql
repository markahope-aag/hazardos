-- ============================================================================
-- SMS: inbound message support.
--
-- Until now sms_messages only held outbound rows and inbound Twilio messages
-- were processed for STOP/START keywords and then dropped on the floor.
-- That's fine for opt-out handling but it leaves the team blind to real
-- customer replies ("can you come at 3 instead?") and means there's no
-- conversation thread to render in an inbox. This migration teaches the
-- table to hold both directions so we can build a proper thread UI on top
-- of it.
-- ============================================================================

-- Direction + inbound fields on sms_messages.
ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound'));

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS from_phone VARCHAR(20);

ALTER TABLE sms_messages
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ;

-- Per-customer thread index. Inbox lists conversations newest-first and
-- the thread view reads all rows for one customer — both hot paths.
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_customer_time
  ON sms_messages (organization_id, customer_id, queued_at DESC, received_at DESC);

-- Per-phone lookup for matching inbound messages to an existing customer
-- when the inbound came from a number we don't yet have linked.
CREATE INDEX IF NOT EXISTS idx_sms_messages_from_phone
  ON sms_messages (from_phone)
  WHERE from_phone IS NOT NULL;

-- Most-recent outbound lookup by to_phone: used to disambiguate which org
-- an inbound belongs to when the platform-shared Twilio number is involved.
CREATE INDEX IF NOT EXISTS idx_sms_messages_recent_outbound_by_phone
  ON sms_messages (to_phone, queued_at DESC)
  WHERE direction = 'outbound';

-- New message_type value for inbound messages. enums don't support IF NOT
-- EXISTS on ADD VALUE pre-PG15; wrapped in a DO block for idempotent re-run.
DO $$ BEGIN
  ALTER TYPE sms_message_type ADD VALUE 'incoming_message';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

NOTIFY pgrst, 'reload schema';
