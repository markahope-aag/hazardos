-- Diagnostic: is profiles.full_name actually present on the live DB?
DO $$
DECLARE
  has_col BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'full_name'
  ) INTO has_col;
  RAISE NOTICE 'FULL_NAME_AUDIT: profiles.full_name exists: %', has_col;
END $$;
