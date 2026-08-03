-- ============================================================================
-- cron_runs: every scheduled job's execution leaves a trace here.
--
-- Silent failures on customer-notification crons are operationally
-- unacceptable — the company finds out their customers weren't reminded
-- because the crew shows up and the customer isn't home. This table is the
-- anchor for (a) logging every run so we can see what happened, (b) a health
-- endpoint that compares the last successful run against SLA, and (c)
-- alerting when failures happen or expected runs don't.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cron_runs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Name of the cron, e.g. 'appointment-reminders'. Not an FK because there's
  -- no cron registry table — the name is just a stable identifier.
  cron_name        TEXT NOT NULL,

  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at      TIMESTAMPTZ,

  -- running → ok | failed | partial. 'partial' means the cron ran to
  -- completion but some unit of work inside failed (e.g. 19 reminders sent,
  -- 1 failed to send). That's still alert-worthy.
  status           TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed', 'partial')),

  -- Free-form result payload so the cron can log whatever matters (counts,
  -- IDs, etc.). Read back by the health endpoint and by humans.
  summary          JSONB,

  -- If the cron itself threw, the exception message lives here. For
  -- `partial` runs, this may be null while per-row errors live elsewhere.
  error_message    TEXT,

  -- Populated only for `partial` / `failed` states. Used by the alert
  -- logic to batch notifications ("2 runs failed in the last hour").
  failure_count    INTEGER NOT NULL DEFAULT 0,

  -- Duration is derived (finished_at - started_at) but is stored for
  -- convenient ordering and indexing.
  duration_ms      INTEGER
);

CREATE INDEX IF NOT EXISTS idx_cron_runs_name_started
  ON cron_runs (cron_name, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_cron_runs_failed
  ON cron_runs (started_at DESC)
  WHERE status IN ('failed', 'partial');

-- RLS: only platform admins see cron_runs rows. Tenant users don't need this
-- data. Service-role writes (from the crons themselves) bypass RLS.
ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform access cron_runs" ON cron_runs;
CREATE POLICY "Platform access cron_runs" ON cron_runs
  FOR ALL
  USING (
    get_user_role() IN ('platform_owner', 'platform_admin')
  )
  WITH CHECK (
    get_user_role() IN ('platform_owner', 'platform_admin')
  );

-- ============================================================================
-- Failure-detector helper: returns TRUE if either of these is true:
--   - there is no successful run of `cron_name` in the last `sla_minutes`;
--   - the last run ended with status failed or partial.
-- Used by the health endpoint and by scheduled alerting.
-- ============================================================================

CREATE OR REPLACE FUNCTION cron_has_recent_problem(cron_name_in TEXT, sla_minutes INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
