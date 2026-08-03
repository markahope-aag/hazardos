-- Per-user calendar feed token. The user pastes a URL containing
-- this token into Apple/Google/Outlook Calendar to subscribe to
-- their assigned jobs and surveys; the token is the only authn
-- the .ics endpoint needs (calendar clients don't carry sessions).
-- Treat it like a password: scoped to the user, regeneratable.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS calendar_feed_token UUID UNIQUE DEFAULT gen_random_uuid();

-- Backfill any pre-existing rows that came in without a default.
UPDATE profiles
   SET calendar_feed_token = gen_random_uuid()
 WHERE calendar_feed_token IS NULL;

ALTER TABLE profiles
  ALTER COLUMN calendar_feed_token SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_calendar_feed_token
  ON profiles(calendar_feed_token);
