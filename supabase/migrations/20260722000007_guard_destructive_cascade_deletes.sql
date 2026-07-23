-- ============================================================================
-- Prevent an interactive delete from silently cascading through financial and
-- regulatory records.
--
-- customers is the parent of 8 ON DELETE CASCADE foreign keys, including
-- invoices and jobs; jobs cascades to 15 more children, among them job_disposal
-- (asbestos disposal manifests, legally retention-bound), job_completions and
-- collected payments. site_surveys cascades to estimates, which cascade to
-- proposals — including signed ones with their signature records.
--
-- Both delete paths were unguarded: DELETE /api/customers/[id] issued a bare
-- delete, and survey deletion is a raw client-side
-- supabase.from('site_surveys').delete(). One mis-click by an admin
-- irreversibly erased records the business is required to keep, with no
-- confirmation and no undo.
--
-- Enforced with BEFORE DELETE triggers rather than in the API because there is
-- more than one delete path (an API route, a browser-client delete, and direct
-- PostgREST). A trigger is the single choke point all of them pass through.
--
-- Scope: interactive end-user deletes only. auth.uid() is non-NULL for a
-- logged-in user and NULL for the service-role client and direct connections —
-- the trusted paths (org teardown, deliberate admin cleanup, migrations) are
-- left able to force the cascade, same boundary used by the SEC23/SEC25 guards.
-- The block is a hard stop, not a soft delete: the intent is to make the
-- operator deal with the dependent records first, not to hide them.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- customers: refuse deletion while jobs or invoices reference the contact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_customer_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jobs INT;
  v_invoices INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN OLD; -- trusted server/admin context
  END IF;

  SELECT count(*) INTO v_jobs FROM jobs WHERE customer_id = OLD.id;
  SELECT count(*) INTO v_invoices FROM invoices WHERE customer_id = OLD.id;

  IF v_jobs > 0 OR v_invoices > 0 THEN
    RAISE EXCEPTION
      'Cannot delete this contact: % job(s) and % invoice(s) are linked and would be permanently destroyed (including any disposal manifests and payments). Reassign or remove those first.',
      v_jobs, v_invoices
      USING ERRCODE = 'raise_exception';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_customer_delete ON customers;
CREATE TRIGGER trg_guard_customer_delete
  BEFORE DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_customer_delete();


-- ---------------------------------------------------------------------------
-- site_surveys: refuse deletion when the survey has produced a proposal that
-- was sent or signed, or a job. A draft survey with only an unsent estimate
-- stays freely deletable — the guard targets irreplaceable downstream records
-- (a customer-signed proposal, a scheduled job), not work-in-progress.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_site_survey_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposals INT;
  v_jobs INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN OLD; -- trusted server/admin context
  END IF;

  SELECT count(*) INTO v_proposals
  FROM proposals p
  JOIN estimates e ON e.id = p.estimate_id
  WHERE e.site_survey_id = OLD.id
    AND (p.signed_at IS NOT NULL OR p.status IN ('sent', 'viewed', 'signed', 'accepted'));

  SELECT count(*) INTO v_jobs
  FROM jobs j
  JOIN estimates e ON e.id = j.estimate_id
  WHERE e.site_survey_id = OLD.id;

  IF v_proposals > 0 OR v_jobs > 0 THEN
    RAISE EXCEPTION
      'Cannot delete this survey: it has produced % sent/signed proposal(s) and % job(s) that would be permanently destroyed. Delete those first if you really intend to.',
      v_proposals, v_jobs
      USING ERRCODE = 'raise_exception';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_site_survey_delete ON site_surveys;
CREATE TRIGGER trg_guard_site_survey_delete
  BEFORE DELETE ON site_surveys
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_site_survey_delete();
