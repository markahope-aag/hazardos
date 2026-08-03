-- Temporary helper to read profiles policies (will be removed after debugging)
CREATE OR REPLACE FUNCTION _debug_list_profiles_policies()
RETURNS TABLE(policy_name text, command text, using_expr text, check_expr text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pol.polname::text,
    CASE pol.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END,
    pg_get_expr(pol.polqual, pol.polrelid, true)::text,
    pg_get_expr(pol.polwithcheck, pol.polrelid, true)::text
  FROM pg_policy pol
  JOIN pg_class cls ON cls.oid = pol.polrelid
  JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
  WHERE cls.relname = 'profiles' AND nsp.nspname = 'public'
  ORDER BY pol.polname;
$$;
