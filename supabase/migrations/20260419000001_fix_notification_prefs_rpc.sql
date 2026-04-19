-- The initialize_notification_preferences RPC was failing at runtime with
-- "relation 'notification_preferences' does not exist" — even though the
-- table is there. Root cause: the function was defined without an explicit
-- search_path, and Supabase runs RPCs with an empty search_path for
-- security. The unqualified table reference inside the function couldn't
-- resolve.
--
-- Effect for users: calling GET /api/notifications/preferences on a fresh
-- account silently produced zero rows, so Settings → Notifications showed
-- headers for each category group with no toggles underneath it.
--
-- Fix: pin search_path to public and fully qualify the table name.

CREATE OR REPLACE FUNCTION public.initialize_notification_preferences(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_types TEXT[] := ARRAY[
    'job_assigned',
    'job_completed',
    'job_completion_review',
    'proposal_signed',
    'proposal_viewed',
    'invoice_paid',
    'invoice_overdue',
    'invoice_viewed',
    'payment_failed',
    'feedback_received',
    'testimonial_pending',
    'system',
    'reminder'
  ];
  nt TEXT;
BEGIN
  FOREACH nt IN ARRAY notification_types
  LOOP
    INSERT INTO public.notification_preferences
      (user_id, organization_id, notification_type, in_app, email, push)
    VALUES (p_user_id, p_org_id, nt, true, true, false)
    ON CONFLICT (user_id, notification_type) DO NOTHING;
  END LOOP;
END;
$$;
