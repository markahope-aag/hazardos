-- Time clock: move approve/reject authorization into RLS.
--
-- 20260815000003 shipped a single org-wide UPDATE policy and left the
-- approve/reject distinction to the API route's allowedRoles check. That
-- holds only if the API is the sole path to the table, and it is not: the
-- browser talks to PostgREST directly with the anon key (the time clock page
-- itself queries `jobs` that way), so anyone signed in can call
-- supabase.from('time_clock_entries').update({status:'approved'}) and skip the
-- route entirely.
--
-- QA confirmed the hole against production: a technician set their own
-- submitted entry to approved with a direct supabase-js write, verified by a
-- service-role read-back. A technician approving their own hours is a payroll
-- integrity problem, so the rule belongs in the database.
--
-- Split into two policies:
--   * self-service  -- your own rows, and you may never write a review status
--   * supervisor    -- anyone whose role may review, across the organization
-- The API keeps its allowedRoles check; this is the backstop underneath it.

DROP POLICY IF EXISTS "time_clock_entries_update_org" ON "public"."time_clock_entries";

-- Own rows only, and status is confined to the two self-service values.
-- WITH CHECK is what actually stops the escalation: the post-update row is
-- rejected if status became 'approved' or 'rejected'.
CREATE POLICY "time_clock_entries_update_self" ON "public"."time_clock_entries"
    FOR UPDATE
    USING (
        "organization_id" = "public"."get_user_organization_id"()
        AND "profile_id" = "auth"."uid"()
    )
    WITH CHECK (
        "organization_id" = "public"."get_user_organization_id"()
        AND "profile_id" = "auth"."uid"()
        AND "status" IN ('open', 'submitted')
    );

-- Supervisors review anyone's entries. Mirrors ROLES.TENANT_WRITE, which is
-- what /api/time-clock/approvals and /api/time-clock/review already require.
CREATE POLICY "time_clock_entries_update_review" ON "public"."time_clock_entries"
    FOR UPDATE
    USING (
        "organization_id" = "public"."get_user_organization_id"()
        AND "public"."get_user_role"() IN (
            'platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator'
        )
    )
    WITH CHECK (
        "organization_id" = "public"."get_user_organization_id"()
        AND "public"."get_user_role"() IN (
            'platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator'
        )
    );
