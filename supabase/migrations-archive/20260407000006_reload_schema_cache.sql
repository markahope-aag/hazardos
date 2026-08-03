-- ============================================
-- Reload PostgREST schema cache
-- Ensures all tables (especially invoices) are visible to the API
-- ============================================
NOTIFY pgrst, 'reload schema';

-- Also ensure invoices table has proper grants for authenticated role
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO anon;
    RAISE NOTICE 'Granted permissions on invoices table';
  ELSE
    RAISE NOTICE 'invoices table does not exist — skipping grants';
  END IF;

  -- Also grant on invoice_line_items if exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoice_line_items'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_line_items TO anon;
  END IF;
END $$;
