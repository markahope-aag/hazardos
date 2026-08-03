-- Make two multi-step approval writes atomic (audit finding: non-atomic
-- multi-step writes on state-transition flows).
--
-- Both previously ran as separate sequential UPDATEs from the service layer,
-- and in both cases the SECOND write had no error check — a mid-chain failure
-- left an inconsistent state (a completion marked approved on a job that never
-- flipped to completed; an approval request finalized while its estimate stayed
-- pending). Wrapping each pair in a function runs them in a single transaction:
-- if the second write fails, the first rolls back.
--
-- SECURITY INVOKER so the caller's RLS still applies exactly as it did for the
-- separate statements (approvers already have update rights on these rows via
-- the role-scoped policies); no privilege change.

-- 1. Approve a job completion + flip the job to completed, atomically.
CREATE OR REPLACE FUNCTION public.approve_job_completion(
  p_job_id uuid,
  p_reviewed_by uuid,
  p_review_notes text DEFAULT NULL
)
RETURNS public.job_completions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_completion public.job_completions;
BEGIN
  UPDATE public.job_completions
     SET status = 'approved',
         reviewed_at = now(),
         reviewed_by = p_reviewed_by,
         review_notes = p_review_notes
   WHERE job_id = p_job_id
   RETURNING * INTO v_completion;

  IF v_completion.id IS NULL THEN
    RAISE EXCEPTION 'No job completion found for job %', p_job_id
      USING ERRCODE = 'no_data_found';
  END IF;

  UPDATE public.jobs
     SET status = 'completed',
         actual_end_date = (now())::date
   WHERE id = p_job_id;

  RETURN v_completion;
END;
$$;

-- 2. Record an approval decision on an estimate: update the approval_requests
--    row and the estimate's status together. The service computes the level,
--    level status, final status, and approved flag (mirroring the "office
--    manager reviews, owner approves" rule) and passes them in; the branch
--    logic here mirrors the service exactly so no estimate write is orphaned.
CREATE OR REPLACE FUNCTION public.record_estimate_approval(
  p_request_id uuid,
  p_estimate_id uuid,
  p_level int,
  p_new_level_status text,
  p_final_status text,
  p_approver uuid,
  p_at timestamptz,
  p_notes text,
  p_approved boolean
)
RETURNS public.approval_requests
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_request public.approval_requests;
BEGIN
  IF p_level = 1 THEN
    UPDATE public.approval_requests
       SET level1_status = p_new_level_status,
           level1_approver = p_approver,
           level1_at = p_at,
           level1_notes = p_notes,
           final_status = p_final_status
     WHERE id = p_request_id
     RETURNING * INTO v_request;
  ELSE
    UPDATE public.approval_requests
       SET level2_status = p_new_level_status,
           level2_approver = p_approver,
           level2_at = p_at,
           level2_notes = p_notes,
           final_status = p_final_status
     WHERE id = p_request_id
     RETURNING * INTO v_request;
  END IF;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION 'Approval request % not found', p_request_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT p_approved THEN
    -- Rejected at either level: send the estimate back to draft.
    UPDATE public.estimates
       SET status = 'draft',
           approval_notes = p_notes
     WHERE id = p_estimate_id;
  ELSIF p_final_status = 'approved' THEN
    -- Final approval reached: mark the estimate approved.
    UPDATE public.estimates
       SET status = 'approved',
           approved_by = p_approver,
           approved_at = p_at,
           approval_notes = p_notes
     WHERE id = p_estimate_id;
  END IF;
  -- Level-1 approval that still needs level 2: no estimate write (forwarded).

  RETURN v_request;
END;
$$;
