-- Repair the search_path pinned on generate_access_token in
-- 20260816000001.
--
-- That migration set search_path to 'public', 'pg_temp' to satisfy linter 0011.
-- The function body is:
--
--   RETURN encode(gen_random_bytes(32), 'hex');
--
-- gen_random_bytes comes from pgcrypto, which Supabase installs into the
-- `extensions` schema, not `public`. Dropping `extensions` off the path made
-- the function unable to resolve it, which broke proposal token generation and
-- the invoice portal link that depends on those tokens. The integration suite
-- caught it: three tests across proposal-token-generation and
-- invoice-portal-link went red.
--
-- Pinning the path is still the right thing, since an unpinned SECURITY DEFINER
-- function can be redirected by whatever the caller puts in front of public.
-- It just has to include the schema the function actually reaches into.

ALTER FUNCTION "public"."generate_access_token"()
  SET "search_path" = 'public', 'extensions', 'pg_temp';
