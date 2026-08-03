-- Supabase's security linter flags extensions installed in the `public`
-- schema — they should live in a dedicated `extensions` schema so they
-- don't share a namespace with application tables and functions.
--
-- The properties migration installed pg_trgm in public to back the
-- trigram index on properties.normalized_address. Drop and reinstall in
-- the extensions schema, which Supabase provisions automatically. The
-- trigram index itself survives the move (the operator class is
-- schema-qualified at resolve time, not install time).

DO $$
DECLARE
  current_schema TEXT;
BEGIN
  SELECT n.nspname INTO current_schema
  FROM pg_extension e
  JOIN pg_namespace n ON n.oid = e.extnamespace
  WHERE e.extname = 'pg_trgm';

  IF current_schema IS NULL THEN
    -- Not installed yet — install in extensions and we're done.
    CREATE SCHEMA IF NOT EXISTS extensions;
    CREATE EXTENSION pg_trgm SCHEMA extensions;
  ELSIF current_schema = 'public' THEN
    CREATE SCHEMA IF NOT EXISTS extensions;
    ALTER EXTENSION pg_trgm SET SCHEMA extensions;
  END IF;
  -- Any other current_schema is already fine; no-op.
END $$;
