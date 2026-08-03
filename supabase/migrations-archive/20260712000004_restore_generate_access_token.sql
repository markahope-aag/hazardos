-- ============================================================================
-- Fix: POST /api/proposals fails to create a proposal — token URL never
-- generated (P1: "Generate a proposal from an approved estimate — token
-- URL created").
--
-- generate_access_token() was defined in 20260201000000_create_estimates_
-- tables.sql, but it does not exist on the live database (PostgREST
-- returns PGRST202 "could not find the function ... in the schema cache").
-- No later migration ever drops or renames it, so the most likely
-- explanation is that this migration file picked up the function
-- definition after the migration had already been recorded as applied —
-- `supabase db push` only runs migrations not yet in the remote history
-- table, so an addition to an already-applied file's content silently
-- never reaches the live DB.
--
-- app/api/proposals/route.ts calls `.rpc('generate_access_token')` and
-- destructures only `data` (not `error`), so the missing-function error was
-- swallowed and `access_token` was inserted as NULL on every proposal —
-- or, since `proposals.access_token` is nullable, the insert would
-- "succeed" with no usable token, silently breaking every downstream
-- public-portal flow that depends on the token URL (P2-P9).
--
-- Recreating it here (rather than editing the old migration, which
-- already-provisioned databases won't re-run) restores the function so
-- new proposals get a real token.
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_access_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION public.generate_access_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_access_token() TO authenticated;
