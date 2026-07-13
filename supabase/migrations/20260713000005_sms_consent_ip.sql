-- ============================================================================
-- SMS3: consent must be recorded with a timestamp AND the originating IP for
-- TCPA compliance. sms_opt_in_at (timestamp) was already captured, but the
-- IP was never stored. This adds the column; the /api/sms/opt-in route
-- populates it from the request on web-form consent (STOP/START keyword
-- opt-ins have no IP — they arrive over the carrier network, not the web).
-- ============================================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS sms_opt_in_ip TEXT;

COMMENT ON COLUMN customers.sms_opt_in_ip IS 'IP address captured at web-form SMS opt-in, for TCPA consent audit trail';
