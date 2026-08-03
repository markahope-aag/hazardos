-- Fix function_search_path_mutable lint warning (Supabase lint 0011)
-- Recreate with explicit search_path and schema-qualified table references

CREATE OR REPLACE FUNCTION public.create_default_pipeline_stages()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.pipeline_stages (organization_id, name, color, stage_type, probability, sort_order)
  VALUES
    (NEW.id, 'New Lead', '#94a3b8', 'lead', 10, 1),
    (NEW.id, 'Qualified', '#3b82f6', 'qualified', 25, 2),
    (NEW.id, 'Proposal Sent', '#8b5cf6', 'proposal', 50, 3),
    (NEW.id, 'Negotiation', '#f59e0b', 'negotiation', 75, 4),
    (NEW.id, 'Won', '#22c55e', 'won', 100, 5),
    (NEW.id, 'Lost', '#ef4444', 'lost', 0, 6);
  RETURN NEW;
END;
$$;
