-- Add sms_received and payment_failed to the default notification
-- preferences seed list. The settings UI hides any notification type
-- that doesn't have a preference row, so without this they're
-- invisible to existing users.
--
-- Pin search_path to '' for the function to satisfy the function
-- search_path linter — match the rest of the SECURITY DEFINER
-- functions in this codebase.

CREATE OR REPLACE FUNCTION public.initialize_notification_preferences(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
    'sms_received',
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

-- Trim the just-added grants surface to match the codebase convention:
-- only authenticated callers (the seed runs from app code on first
-- preference fetch).
REVOKE EXECUTE ON FUNCTION public.initialize_notification_preferences(UUID, UUID) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.initialize_notification_preferences(UUID, UUID) TO authenticated;

-- Backfill: every active profile that's missing the new types gets
-- the default preference rows created. New users get them via the
-- function above on first preference fetch; this catches existing
-- users who already passed that point.
DO $$
DECLARE
  prof RECORD;
BEGIN
  FOR prof IN
    SELECT id, organization_id
      FROM public.profiles
     WHERE organization_id IS NOT NULL
  LOOP
    PERFORM public.initialize_notification_preferences(prof.id, prof.organization_id);
  END LOOP;
END $$;
